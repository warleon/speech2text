import os
from whisperx import load_audio
from whisperx.audio import SAMPLE_RATE
import numpy as np
from queues import *
from models import AIModels
from models import logger
from task import Task, partial, List


UPLOADS = "/uploads"
WHISPER_DATA = UPLOADS
EXT = ".npy"


def diarize(**metadata):
    pass


def align_words(**metadata):
    pass


def collect_transciptions(**metadata):
    pass


def transcribe_segment(
    segment_path: str,
    lang: str,
    start_time_s: float,
    end_time_s: float,
    total_time: float,
    **metadata,
):
    audio = np.load(segment_path)
    text = AIModels.get_transcription(audio, lang)
    result = {
        "text": text,
        "start": start_time_s,
        "end": end_time_s,
        "total_time": total_time,
    }
    response = {
        "transcription": result,
    }
    return response


def detect_language(
    file_path: str,
    **metadata,
):
    audio = np.load(file_path)
    lang = AIModels.get_language(audio)
    response = {
        "lang": lang,
        "user": metadata["user"],
        "task_id": metadata["flow_id"],
        "task_type": "detect_language",
    }
    return response


def detect_voice_segments(
    file_path: str,
    **metadata,
):
    audio = np.load(file_path)
    file_name = os.path.basename(file_path)
    chunks = AIModels.get_voice_segments(audio)
    timestamps = [(chunk["start"], chunk["end"]) for chunk in chunks]
    split_audio = [
        audio[int(s * SAMPLE_RATE) : int(e * SAMPLE_RATE)] for s, e in timestamps
    ]
    total = len(split_audio)
    out_paths = [
        os.path.join(WHISPER_DATA, f"{i}_{total}_{file_name}") for i in range(total)
    ]
    total_time = sum([e - s for s, e in timestamps])

    tasks: List[Task] = []
    for i, op, sa, (s, e) in zip(range(total), out_paths, split_audio, timestamps):
        np.save(op, sa)
        if i == 0:
            tasks.append(
                Task(
                    metadata["flow_id"],
                    partial(detect_language, op),
                    language_queue,
                    **metadata,
                )
            )
        tasks.append(
            Task(
                metadata["flow_id"],
                partial(
                    transcribe_segment,
                    segment_path=op,
                    start_time_s=s,
                    end_time_s=e,
                    total_time=total_time,
                ),
                transcription_queue,
                [tasks[0]],
            )
        )
    tasks[0].enqueue()
    collect = Task(metadata["flow_id"], collect_transciptions, default_queue, tasks[1:])

    response = {
        "segments_timestamps": timestamps,
        "total_useful_time": total_time,
    }

    return response


def convert_to_numpy(
    file_name: str,
    **metadata,
):
    in_path = os.path.join(UPLOADS, file_name)
    out_path = os.path.join(WHISPER_DATA, file_name) + EXT
    audio = load_audio(in_path)
    np.save(out_path, audio)
    task = Task(
        metadata["flow_id"],
        partial(
            detect_voice_segments,
            out_path,
        ),
        split_queue,
        metadata=metadata,
    )
    task.enqueue()

    response = {}

    return response
