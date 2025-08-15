from whisperx import load_audio
import os
import torch
from whisperx.vads import Pyannote

UPLOADS="/uploads"
WHISPER_DATA="/whisper-data"
EXT=".pt"

def preprocess(file_name:str):
    in_path = os.path.join(UPLOADS,file_name)
    out_path = os.path.join(WHISPER_DATA,file_name)+EXT
    data = Pyannote.preprocess_audio(load_audio(in_path))
    torch.save(data,out_path)
    

