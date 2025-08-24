import os
from whisperx import load_audio
from whisperx.audio import SAMPLE_RATE
from whisperx.types import SingleSegment, SingleAlignedSegment
import numpy as np
from queues import *
from models import AIModels
from models import logger
from task import Task, partial, List
from itertools import cycle


UPLOADS = "/uploads"
WHISPER_DATA = UPLOADS
EXT = ".npy"


def diarize(aligned: List[SingleAlignedSegment], audio_path: str, **metadata):
    audio = np.load(audio_path)
    diarization = AIModels.get_diarization(aligned, audio)
    response = {"diarization": diarization}
    return response


def align_words(segment: SingleSegment, audio_path: str, lang: str, **metadata):
    audio = np.load(audio_path)
    aligned = AIModels.get_aligment(
        segment, audio, lang
    )  # may break because of segmented audio
    result_len = len(aligned["segments"])
    if result_len != 1:
        raise ValueError(f"Expected segments to have a single segment got {result_len}")
    response = {
        "aligned": aligned["segments"][0]
    }  # timestamps may be shifted because of segmented audio
    return response


# needed to lauch diarize with align_words as dependencies
def collect_transciptions(
    transcription: List[SingleSegment],
    segment_path: List[str],
    full_audio_path: str,
    lang: List[str],
    **metadata,
):
    tasks: List[Task] = []
    for segment, path, _lang in zip(transcription, segment_path, cycle(lang)):
        tasks.append(
            Task(
                metadata["flow_id"],
                partial(align_words, segment, path, _lang),
                metadata["queue"],
                metadata=metadata,
            )
        )
    Task(
        metadata["flow_id"],
        partial(diarize, audio_path=full_audio_path),
        metadata["queue"],
        tasks,
        metadata,
    )
    for task in tasks:
        task.enqueue()
    return {}


def transcribe_segment(
    segment_path: str,
    lang: str,
    start_time_s: float,
    end_time_s: float,
    total_time: float,
    **metadata,
):
    audio = np.load(segment_path)
    text = "".join(AIModels.get_transcription(audio, lang))
    result = {
        "text": text,
        "start": start_time_s,
        "end": end_time_s,
        "total_time": total_time,
    }
    response = {"transcription": result, "segment_path": segment_path}
    return response


def detect_language(
    file_path: str,
    **metadata,
):
    audio = np.load(file_path)
    lang = AIModels.get_language(audio)
    response = {
        "lang": lang,
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
                    metadata["queue"],
                    metadata=metadata,
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
                metadata["queue"],
                [tasks[0]],
                metadata,
            )
        )

    if len(tasks):
        Task(
            metadata["flow_id"],
            partial(collect_transciptions, full_audio_path=file_path),
            metadata["queue"],
            tasks,
            metadata,
            unpack_single=False,
        )
        tasks[0].enqueue()

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
        metadata["queue"],
        metadata=metadata,
    )
    task.enqueue()

    response = {}

    return response
