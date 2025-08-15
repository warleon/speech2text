import os
from whisperx.asr import load_model
from whisperx.diarize import DiarizationPipeline

HUGGING_FACE_TOKEN=os.environ.get("HUGGING_FACE_TOKEN")
if(HUGGING_FACE_TOKEN == None):
    raise ValueError("HUGGING_FACE_TOKEN not set, value:{0}".format(HUGGING_FACE_TOKEN))

# Load the model once at startup
whisper_model = load_model(
    "large-v2",
    "cpu",
    compute_type="int8",
)
vad_model = whisper_model.vad_model

diarize_model = DiarizationPipeline(use_auth_token=HUGGING_FACE_TOKEN, device="cpu")
