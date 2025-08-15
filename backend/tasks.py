import os
import time
import torch
from whisperx import load_audio
from whisperx.audio import SAMPLE_RATE, CHUNK_LENGTH, N_SAMPLES, log_mel_spectrogram
from whisperx.vad import merge_chunks
from models import vad_model, whisper_model, tokenizer, default_asr_options
import numpy as np
from queues import single, single_queue, rq_connection
from rq.job import Job
import json


UPLOADS = "/uploads"
WHISPER_DATA = "/whisper-data"
EXT = ".npy"


def transcribe_segment(
    segment_path: str, start_time_s: float, end_time_s: float, user: str, task_id: str
):
    audio = np.load(segment_path)
    model_n_mels = whisper_model.feat_kwargs.get("feature_size")
    features = log_mel_spectrogram(
        audio,
        n_mels=model_n_mels if model_n_mels is not None else 80,
        padding=N_SAMPLES - audio.shape[0],
    )
    text = whisper_model.generate_segment_batched(
        features, tokenizer, default_asr_options
    )
    result = {"text": text, "start": start_time_s, "end": end_time_s}
    response = {
        "transcription": result,
        "user": user,
        "task_type": "transcribe_segment",
        "task_id": task_id,
        "segment_path": segment_path,
    }
    rq_connection.publish(single, json.dump(response))
    return response


def detect_language(file_name: str, user: str, task_id: str):
    audio = np.load(file_name)
    lang = whisper_model.detect_language(audio)  # single language
    response = {
        "detected_language": lang,
        "user": user,
        "task_type": "detect_language",
        "task_id": task_id,
    }
    rq_connection.publish(single, json.dump(response))
    return response


def detect_voice_segments(file_name: str, user: str, task_id: str):
    audio = np.load(file_name)
    vad_segments = vad_model(
        {"waveform": torch.from_numpy(audio).unsqueeze(0), "sample_rate": SAMPLE_RATE}
    )
    chunks = merge_chunks(vad_segments, CHUNK_LENGTH)
    timestamps = [(chunk["start"], chunk["end"]) for chunk in chunks]
    split_audio = [
        audio[int(s * SAMPLE_RATE) : int(e * SAMPLE_RATE)] for s, e in timestamps
    ]
    total = len(split_audio)
    out_paths = [
        os.path.join(WHISPER_DATA, str(i) + str(total) + file_name)
        for i in range(total)
    ]
    for op, sa in zip(out_paths, split_audio):
        np.save(op, sa)

    response = {
        "segments_output_paths": out_paths,
        "segments_timestamps": timestamps,
        "user": user,
        "task_id": task_id,
        "task_type": "detect_voice_segments",
    }

    rq_connection.publish(single, json.dump(response))
    return response


def merge_jobs(job_a_id, job_b_id, user: str, task_id: str):
    ja = Job.fetch(job_a_id, connection=rq_connection)
    jb = Job.fetch(job_b_id, connection=rq_connection)
    # Wait until both finish
    while not (ja.is_finished and jb.is_finished):
        time.sleep(1)
        ja.refresh()
        jb.refresh()

    ja_response = ja.result  # TODO test if language detection is necesary
    jb_response = jb.result
    for fp, (s, e) in zip(
        jb_response["segments_output_paths"], jb_response["segments_timestamps"]
    ):
        segment = np.load(fp)
        single_queue.enqueue(transcribe_segment, segment, s, e, user)

    response = {
        "user": user,
        "task_id": task_id,
        "task_type": "merge_jobs",
    }  # TODO:think of response
    rq_connection.publish(single, json.dump(response))
    return response


def convert_to_numpy(file_name: str, user: str, task_id: str):
    in_path = os.path.join(UPLOADS, file_name)
    out_path = os.path.join(WHISPER_DATA, file_name) + EXT
    lang_out_path = os.path.join(WHISPER_DATA, file_name) + "-LANG" + EXT
    audio = load_audio(in_path)
    np.save(out_path, audio)
    np.save(lang_out_path, audio[:N_SAMPLES])
    job_lang = single_queue.enqueue(detect_language, lang_out_path, user, task_id)
    job_split_audio = single_queue.enqueue(
        detect_voice_segments, out_path, user, task_id
    )
    job_merge = single_queue.enqueue(
        merge_jobs, job_lang.id, job_split_audio.id, user, task_id
    )

    response = {
        "complete_data_output_path": out_path,
        "language_data_output_pat": lang_out_path,
        "language_detection_job_id": job_lang.id,
        "voice_detection_job_id": job_split_audio.id,
        "merge_step_job_id": job_merge.id,
        "user": user,
        "task_id": task_id,
        "task_type": "conver_to_numpy",
    }

    rq_connection.publish(single, json.dump(response))
    return response
