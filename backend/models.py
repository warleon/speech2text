import os
from whisperx.asr import WhisperModel
from whisperx.audio import SAMPLE_RATE, CHUNK_LENGTH, N_SAMPLES, log_mel_spectrogram
from whisperx.vad import VoiceActivitySegmentation, merge_chunks
from whisperx import vad
import torch
from pyannote.audio.core.model import Model
import tokenizers
import faster_whisper
import threading
import numpy as np
import logging
from logging import DEBUG
from faster_whisper.tokenizer import _LANGUAGE_CODES, _TASKS, Tokenizer
from functools import cached_property

logging.basicConfig(level=logging.NOTSET)


logger = logging.getLogger(__name__)
logger.setLevel(DEBUG)


class AIWorker:
    _lock = threading.Lock()
    whisper_model = None
    vad_model = None
    base_tokenizer = None
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
        return HUGGING_FACE_TOKEN, MODELS_DOWNLOAD_PATH

    @classmethod
    def _load_vad(cls, token: str):
        vad_dir = os.path.dirname(os.path.abspath(vad.__file__))
        # Vad model already locally available, downloaded alongside whisperx
        model_fp = os.path.join(vad_dir, "assets", "pytorch_model.bin")
        model_fp = os.path.abspath(model_fp)  # Ensure the path is absolute
        vad_model = Model.from_pretrained(model_fp, use_auth_token=token)
        vad_pipeline = VoiceActivitySegmentation(
            segmentation=vad_model, device=torch.device("cpu")
        )
        cls.vad_model = vad_pipeline.instantiate(AIWorker.vad_args)

    @classmethod
    def _load_tokenizer(cls, token: str):
        cls.base_tokenizer = tokenizers.Tokenizer.from_pretrained(
            "openai/whisper-tiny", "main", token
        )

    @classmethod
    def _load_whisper(cls, cache_root: str):
        cls.whisper_model = WhisperModel(
            "large-v2",
            device="cpu",
            compute_type="int8",
            download_root=cache_root,
        )

    @classmethod
    def load_models(cls):
        with cls._lock:
            token, cache_root = cls._get_env_vars()
            if not cls.base_tokenizer:
                cls._load_tokenizer(token)
            if not cls.vad_model:
                cls._load_vad(token)
            if not cls.whisper_model:
                cls._load_whisper(cache_root)

    @classmethod
    def get_voice_segments(cls, audio: np.ndarray):
        logger.info("Check for vad model instance")
        if not cls.vad_model or not cls.vad_model.instantiated:
            logger.error("vad model instance not found")
            raise ValueError("AIWorker.vad_model has not been initialized")
        logger.info("vad model instance found")
        logger.info("Perform vad model inference")
        segments = cls.vad_model(
            {
                "waveform": torch.from_numpy(audio).unsqueeze(0),
                "sample_rate": SAMPLE_RATE,
            }
        )
        logger.info("Perform segment merging")
        return merge_chunks(segments, CHUNK_LENGTH)

    def get_transcription(self, audio: np.ndarray):
        if not self.whisper_model:
            raise ValueError("AIWorker.whisper_model has not been initialized")
        if not self.base_tokenizer:
            raise ValueError("AIWorker.base_tokenizer has not been initialized")
        if not self.default_asr_options:
            raise ValueError("AIWorker.default_asr_options has not been initialized")
        model_n_mels = self.whisper_model.feat_kwargs.get("feature_size")
        features = log_mel_spectrogram(
            audio,
            n_mels=model_n_mels if model_n_mels is not None else 80,
            padding=N_SAMPLES - audio.shape[0],
        )
        self.whisper_model.generate_segment_batched(
            features, self.tokenizer, self.default_asr_options
        )

    @cached_property
    def tokenizer(self):
        if not self.base_tokenizer:
            raise ValueError("AIWorker.base_tokenizer has not been initialized")
        if not self.lang:
            raise ValueError("AIWorker.lang has not been initialized")
        return Tokenizer(self.base_tokenizer, True, "transcribe", self.lang)

    def __init__(self, lang="en"):
        self.lang = lang
        self.load_models()


# diarize_model = DiarizationPipeline(use_auth_token=HUGGING_FACE_TOKEN, device="cpu")

if __name__ == "__main__":
    AIWorker()
