import os
from whisperx.asr import WhisperModel
from whisperx.diarize import DiarizationPipeline
from whisperx.vad import load_vad_model
import torch
import tokenizers
import faster_whisper

HUGGING_FACE_TOKEN = os.environ.get("HUGGING_FACE_TOKEN")
if HUGGING_FACE_TOKEN == None:
    raise ValueError("HUGGING_FACE_TOKEN not set, value:{0}".format(HUGGING_FACE_TOKEN))

default_vad_options = {"vad_onset": 0.500, "vad_offset": 0.363}
default_asr_options = faster_whisper.transcribe.TranscriptionOptions(
    {
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
        "suppress_numerals": False,
        "max_new_tokens": None,
        "clip_timestamps": None,
        "hallucination_silence_threshold": None,
    }
)

vad_model = load_vad_model(
    torch.device("cpu"), use_auth_token=HUGGING_FACE_TOKEN, **default_vad_options
)

tokenizer = tokenizers.Tokenizer.from_pretrained(
    "openai/whisper-tiny", "main", HUGGING_FACE_TOKEN
)

whisper_model = WhisperModel(
    "large-v2",
    device="cpu",
    compute_type="int8",
)

diarize_model = DiarizationPipeline(use_auth_token=HUGGING_FACE_TOKEN, device="cpu")
