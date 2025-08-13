import whisperx
import os

HUGGING_FACE_TOKEN=os.environ.get("HUGGING_FACE_TOKEN")
if(HUGGING_FACE_TOKEN == None):
    raise ValueError("HUGGING_FACE_TOKEN not set, value:{0}".format(HUGGING_FACE_TOKEN))

# Load the model once at startup
whisper_model = whisperx.load_model(
    "large-v2",
    "cpu",
    compute_type="int8"
)

diarize_model = whisperx.diarize.DiarizationPipeline(use_auth_token=HUGGING_FACE_TOKEN, device="cpu")
