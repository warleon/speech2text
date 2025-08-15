import os
import time
import torch
from whisperx import load_audio
from whisperx.audio import SAMPLE_RATE, CHUNK_LENGTH, N_SAMPLES
from whisperx.vad import merge_chunks
from models import vad_model,whisper_model
import numpy as np
from queues  import single_queue,rq_connection
from rq.job import Job


UPLOADS="/uploads"
WHISPER_DATA="/whisper-data"
EXT=".npy"

def transcribe_segment(segment: np.ndarray, laguage:str,start_time_s:float,end_time_s:float,user:str):
    transcription = whisper_model.run_single({'inputs': segment})
    result = {
        "text":transcription["text"],
        "start":start_time_s,
        "end":end_time_s
    }

    
def detect_language(file_name:str,user:str):
    audio = np.load(file_name)
    lang = whisper_model.detect_language(audio) # single language
    return lang

def detect_voice_segments(file_name:str,user:str):
    audio = np.load(file_name)
    vad_segments = vad_model({"waveform":torch.from_numpy(audio).unsqueeze(0), "sample_rate": SAMPLE_RATE})
    chunks = merge_chunks(vad_segments,CHUNK_LENGTH)
    timestamps = [(chunk["start"],chunk["end"]) for chunk in chunks]
    split_audio = [audio[int(s*SAMPLE_RATE):int(e*SAMPLE_RATE)] for s,e in timestamps]
    total = len(split_audio)
    out_paths = [os.path.join(WHISPER_DATA,str(i)+str(total)+file_name) for i in range(total)]
    for op,sa in zip(out_paths,split_audio):
        np.save(op,sa)

    return out_paths,timestamps

def merge_jobs(job_a_id,job_b_id,user:str):
    ja = Job.fetch(job_a_id, connection=rq_connection)
    jb = Job.fetch(job_b_id, connection=rq_connection)
    # Wait until both finish
    while not (ja.is_finished and jb.is_finished):
        time.sleep(1)
        ja.refresh()
        jb.refresh()
    
    lang = ja.result
    file_paths,timestamps = jb.result
    for fp,(s,e) in zip(file_paths,timestamps):
        segment = np.load(fp)
        single_queue.enqueue(transcribe_segment,segment,lang,s,e,user)

def convert_to_numpy(file_name:str,user:str):
    in_path = os.path.join(UPLOADS,file_name)
    out_path = os.path.join(WHISPER_DATA,file_name)+EXT
    lang_out_path = os.path.join(WHISPER_DATA,file_name)+"-LANG"+EXT
    audio = load_audio(in_path)
    np.save(out_path,audio)
    np.save(lang_out_path,audio[:N_SAMPLES])
    job_lang = single_queue.enqueue(detect_language,lang_out_path,user)
    job_split_audio = single_queue.enqueue(detect_voice_segments,out_path,user)
    job_merge = single_queue.enqueue(merge_jobs,job_lang.id,job_split_audio.id,user)

    return out_path,lang_out_path,job_lang.id,job_split_audio.id,job_merge.id