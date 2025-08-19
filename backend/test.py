import numpy as np
from models import AIWorker
import json
import threading
from worker import start_workers
from queues import enqueue
from tasks import detect_voice_segments

# audio = np.load(
#    "../frontend/speech2text/uploads/record_out.wav-783438-1755027802549-17442a9d-64f1-4f61-be2a-06002fcdb3a0.npy"
# )
worker_thread = threading.Thread(target=start_workers, daemon=True)
audio_path = "/uploads/record_out.wav-783438-1755027802549-17442a9d-64f1-4f61-be2a-06002fcdb3a0.npy"
audio = np.load(audio_path)
AIWorker.load_models()
enqueue(detect_voice_segments, audio_path, "test", "test")
