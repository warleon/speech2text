from models import vad_model
import numpy as np
import torch
from whisperx.vad import merge_chunks
from whisperx.audio import SAMPLE_RATE, CHUNK_LENGTH
import json

# audio = np.load(
#    "../frontend/speech2text/uploads/record_out.wav-783438-1755027802549-17442a9d-64f1-4f61-be2a-06002fcdb3a0.npy"
# )
audio = np.load(
    "/uploads/record_out.wav-783438-1755027802549-17442a9d-64f1-4f61-be2a-06002fcdb3a0.npy"
)
print("RUNNING VAD MODEL")
vad_segments = vad_model(
    {
        "waveform": torch.from_numpy(audio).unsqueeze(0),
        "sample_rate": SAMPLE_RATE,
    }
)
print("RAN VAD MODEL")
chunks = merge_chunks(vad_segments, CHUNK_LENGTH)
# timestamps = [(chunk["start"], chunk["end"]) for chunk in chunks]
print(json.dumps(chunks, indent=2))
