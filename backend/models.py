from os import path

from transformers import Wav2Vec2ForCTC
from whisperx.asr import WhisperModel
from whisperx.audio import SAMPLE_RATE, CHUNK_LENGTH, N_SAMPLES, log_mel_spectrogram
from whisperx import asr
from whisperx.vads.pyannote import VoiceActivitySegmentation
from whisperx.vads.vad import Vad
from whisperx.schema import SingleSegment, SingleAlignedSegment
from whisperx.diarize import DiarizationPipeline, assign_word_speakers
from whisperx.alignment import (
    DEFAULT_ALIGN_MODELS_HF,
    DEFAULT_ALIGN_MODELS_TORCH,
    load_align_model,
    align,
)
import faster_whisper
from faster_whisper.tokenizer import _LANGUAGE_CODES, _TASKS, Tokenizer
from whisperx.vads.pyannote import load_vad_model as pyannote_load_vad_model
import torch
import tokenizers
import threading
import numpy as np
import logging
from logging import DEBUG
from typing import Dict, Any, Tuple, List
import os
from utils import sliding_window_to_segments

logging.basicConfig(level=logging.NOTSET)


logger = logging.getLogger(__name__)
logger.setLevel(DEBUG)


class AIModels:
    device = "cpu"
    _lock = threading.Lock()
    whisper_model: WhisperModel = None
    vad_model: VoiceActivitySegmentation = None
    base_tokenizer: tokenizers.Tokenizer = None
    tokenizers: Dict[str, Tokenizer] = {}
    align_models: Dict[str, Tuple[Any, Dict[str, Any]]] = {}
    diarization_pipeline: DiarizationPipeline = None

    default_asr_options = faster_whisper.transcribe.TranscriptionOptions(
        **{
            "beam_size": 5,
            "best_of": 5,
            "patience": 1,
            "length_penalty": 1,
            "repetition_penalty": 1,
            "no_repeat_ngram_size": 0,
            "temperatures": [0.0, 0.2, 0.4, 0.6, 0.8, 1.0],
            "compression_ratio_threshold": 2.4,
            "log_prob_threshold": -1.0,
            "no_speech_threshold": 0.6,
            "condition_on_previous_text": False,
            "prompt_reset_on_temperature": 0.5,
            "initial_prompt": None,
            "prefix": None,
            "suppress_blank": True,
            "suppress_tokens": [-1],
            "without_timestamps": True,
            "max_initial_timestamp": 0.0,
            "word_timestamps": False,
            "prepend_punctuations": "\"'“¿([{-",
            "append_punctuations": "\"'.。,，!！?？:：”)]}、",
            "max_new_tokens": None,
            "clip_timestamps": None,
            "hallucination_silence_threshold": None,
            "multilingual": False,
            "hotwords": None,
        }
    )
    vad_args = {
        "onset": 0.500,
        "offset": 0.363,
        "min_duration_on": 0.1,
        "min_duration_off": 0.1,
    }

    @classmethod
    def _get_env_vars(cls):
        HUGGING_FACE_TOKEN = os.environ.get("HUGGING_FACE_TOKEN")
        if HUGGING_FACE_TOKEN == None:
            raise ValueError(
                "HUGGING_FACE_TOKEN not set, value:{0}".format(HUGGING_FACE_TOKEN)
            )
        MODELS_DOWNLOAD_PATH = os.environ.get("MODELS_DOWNLOAD_PATH")
        OFFLINE_MODELS = os.environ.get("OFFLINE_MODELS")
        return HUGGING_FACE_TOKEN, MODELS_DOWNLOAD_PATH, OFFLINE_MODELS

    @classmethod
    def _load_vad(cls, token: str):
        vad_dir = os.path.dirname(os.path.abspath(asr.__file__))
        # Vad model already locally available, downloaded alongside whisperx
        model_fp = os.path.join(vad_dir, "assets", "pytorch_model.bin")
        model_fp = os.path.abspath(model_fp)  # Ensure the path is absolute
        cls.vad_model = pyannote_load_vad_model(cls.device,token=token,model_fp=model_fp)
        #vad_pipeline = VoiceActivitySegmentation(token=token,device=torch.device(cls.device))
        #cls.vad_model = vad_pipeline.apply

    @classmethod
    def _load_base_tokenizer(cls, token: str, cache_root: str, offline_models: str):
        model_fp = os.path.join(
            cache_root,
            "openai",
            "whisper-tiny",
            "169d4a4341b33bc18d8881c4b69c2e104e1cc0af",
            "tokenizer.json",
        )
        model_fp = os.path.abspath(model_fp)  # Ensure the path is absolute

        print(f"Checking for tokenizer at: {model_fp}")
        if os.path.exists(model_fp):
            cls.base_tokenizer = tokenizers.Tokenizer.from_file(model_fp)
        else:
            cls.base_tokenizer = tokenizers.Tokenizer.from_pretrained(
                "openai/whisper-tiny",
                "main",
                token,
            )

    @classmethod
    def _load_whisper(cls, cache_root: str, offline_models: str):
        cls.whisper_model = WhisperModel(
            "large-v2",
            device=cls.device,
            compute_type="int8",
            download_root=cache_root,
            local_files_only=True if offline_models == "1" else False,
        )

    @classmethod
    def _load_diarization_pipeline(cls, token: str, cache_root: str):
        cls.diarization_pipeline = DiarizationPipeline(
            token=token, device=cls.device, cache_dir=cache_root
        )

    @classmethod
    def load_models(cls):
        with cls._lock:
            token, cache_root, offline_models = cls._get_env_vars()
            if not cls.base_tokenizer:
                cls._load_base_tokenizer(token, cache_root, offline_models)
            if not cls.vad_model:
                cls._load_vad(token)
            if not cls.whisper_model:
                cls._load_whisper(cache_root, offline_models)
            if not cls.diarization_pipeline:
                cls._load_diarization_pipeline(token, cache_root)

    @classmethod
    def get_voice_segments(cls, audio: np.ndarray):
        logger.info("Check for vad model instance")
        if not cls.vad_model:
            logger.error("vad model instance not found")
            raise ValueError(f"{__class__.__name__}.vad_model has not been initialized")
        logger.info("vad model instance found")
        logger.info("start to perform vad model inference")
        #segments = cls.vad_model(audio)
        vad_inference_output = cls.vad_model(
            {
                "waveform": torch.from_numpy(audio).unsqueeze(0),
                "sample_rate": SAMPLE_RATE,
            }
        )
        logger.info("done performing vad model inference")
        logger.info(type(vad_inference_output))
        segments = sliding_window_to_segments(vad_inference_output)
        
        logger.info("start to perform segment merging")
        merged_chunks = Vad.merge_chunks(segments, CHUNK_LENGTH,0,0)
        logger.info("done performing segment merging")
        return merged_chunks

    @classmethod
    def get_transcription(cls, audio: np.ndarray, lang: str):
        if not cls.whisper_model:
            raise ValueError(
                f"{__class__.__name__}.whisper_model has not been initialized"
            )
        if not cls.base_tokenizer:
            raise ValueError(
                f"{__class__.__name__}.base_tokenizer has not been initialized"
            )
        if not cls.default_asr_options:
            raise ValueError(
                f"{__class__.__name__}.default_asr_options has not been initialized"
            )
        model_n_mels = cls.whisper_model.feat_kwargs.get("feature_size")
        logger.info("Transcribing audio of shape %s", audio.shape)
        features = log_mel_spectrogram(
            audio,
            n_mels=model_n_mels if model_n_mels is not None else 80,
            padding=N_SAMPLES - audio.shape[0],
        )
        logger.info("Audio features shape %s", features.shape)

        return cls.whisper_model.generate_segment_batched(
            features.unsqueeze(0), cls.get_tokenizer(lang), cls.default_asr_options
        )

    @classmethod
    def get_tokenizer(cls, lang: str):
        if not cls.base_tokenizer:
            raise ValueError(
                f"{__class__.__name__}.base_tokenizer has not been initialized"
            )
        if lang not in _LANGUAGE_CODES:
            raise ValueError("Language is not supported by the AI model")
        if not lang in cls.tokenizers:
            cls.tokenizers[lang] = Tokenizer(
                cls.base_tokenizer, True, "transcribe", lang
            )
        return cls.tokenizers[lang]

    @classmethod
    def get_align_model_and_metadata(cls, lang: str):
        if (
            lang not in DEFAULT_ALIGN_MODELS_HF
            and lang not in DEFAULT_ALIGN_MODELS_TORCH
        ):
            raise ValueError(
                f"Language {lang} is not supported by the Aligment model, ask for support"
            )
        if not lang in cls.align_models:
            cls.align_models[lang] = load_align_model(
                language_code=lang, device=cls.device
            )
        return cls.align_models[lang]

    @classmethod
    def get_aligment(
        cls,
        segment: SingleSegment,
        audio_segment: np.ndarray,
        lang: str,
        char_level: bool = False,
    ):
        model, metadata = cls.get_align_model_and_metadata(lang)
        return align(
            [segment],
            model,
            metadata,
            audio_segment,
            cls.device,
            return_char_alignments=char_level,
        )

    @classmethod
    def get_language(cls, audio: np.ndarray):
        if not cls.whisper_model:
            raise ValueError(
                f"{__class__.__name__}.whisper_model has not been initialized"
            )
        if audio.shape[0] < N_SAMPLES:
            logger.warning(
                "Audio is shorter than 30s, language detection may be inaccurate."
            )
        segment = log_mel_spectrogram(
            audio[:N_SAMPLES],
            n_mels=80,
            padding=0 if audio.shape[0] >= N_SAMPLES else N_SAMPLES - audio.shape[0],
        )
        encoder_output = cls.whisper_model.encode(segment)
        results = cls.whisper_model.model.detect_language(encoder_output)
        language_token, language_probability = results[0][0]
        language = language_token[2:-2]
        logger.info(
            f"Detected language: {language} ({language_probability:.2f}) in first 30s of audio..."
        )
        return language

    @classmethod
    def get_diarization(cls, segments: List[SingleAlignedSegment], audio: np.ndarray):
        if not cls.diarization_pipeline:
            raise ValueError(
                f"{__class__.__name__}.diarization_pipeline has not been initialized"
            )
        speaker_data = cls.diarization_pipeline(audio)

        return assign_word_speakers(speaker_data, {"segments": segments})

    def __init__(self):
        self.load_models()


if __name__ == "__main__":
    AIModels()
