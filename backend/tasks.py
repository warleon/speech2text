import os
from whisperx import load_audio
from whisperx.audio import SAMPLE_RATE
from whisperx.types import SingleSegment, SingleAlignedSegment
import numpy as np
from queues import *
from models import AIModels
from task import Task, partial, List
from itertools import cycle
from pathlib import Path


DATA = "/uploads"


def getFilePath(flow_id: str, task_type: str, *args, ext="npy"):
    name = task_type
    last = "_".join([str(arg) for arg in args])
    if last:
        name = ".".join([name, last])
    if ext:
        name = ".".join([name, ext])

    path = Path(os.path.join(DATA, flow_id, name))
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def diarize(aligned: List[SingleAlignedSegment], flow_id: str, **metadata):
    inpath = getFilePath(flow_id, convert_to_numpy.__name__)
    audio = np.load(inpath)
    diarization = AIModels.get_diarization(aligned, audio)
    response = {"diarization": diarization}
    return response


def align_words(
    segment: SingleSegment, lang: str, i: int, total: int, flow_id: str, **metadata
):
    inpath = getFilePath(flow_id, detect_voice_segments.__name__, i, total)
    audio = np.load(inpath)
    aligned = AIModels.get_aligment(segment, audio, lang)
    result_len = len(aligned["segments"])
    if result_len != 1:
        raise ValueError(f"Expected segments to have a single segment got {result_len}")
    response = {
        "aligned": aligned["segments"][0]
    }  # timestamps may be shifted because of segmented audio
    return response


# needed to lauch diarize with align_words as dependencies
def collect_transcriptions(
    lang: List[str],
    transcription: List[SingleSegment],
    i: List[int],
    total: List[int],
    flow_id: str,  # injected through metadata
    **metadata,
):
    tasks: List[Task] = []
    for segment, _lang, _i, _total in zip(transcription, cycle(lang), i, total):
        tasks.append(
            Task(
                flow_id,
                partial(align_words, segment, _lang, _i, _total),
                metadata["queue"],
                metadata=metadata,
            )
        )
    Task(
        flow_id,
        partial(diarize),
        metadata["queue"],
        tasks,
        metadata,
    )
    for task in tasks:
        task.enqueue()
    return {}


def transcribe_segment(
    start_time_s: float,
    end_time_s: float,
    total_time: float,
    i: int,
    total: int,
    lang: str,
    flow_id: str,
    **metadata,
):
    inpath = getFilePath(flow_id, detect_voice_segments.__name__, i, total)
    audio = np.load(inpath)
    text = "".join(AIModels.get_transcription(audio, lang))
    result = {
        "text": text,
        "start": start_time_s,
        "end": end_time_s,
        "total_time": total_time,
    }
    response = {
        "transcription": result,
        "i": i,
        "total": total,
    }
    return response


def detect_language(
    i: int,
    total: int,
    flow_id: str,
    **metadata,
):
    inpath = getFilePath(flow_id, detect_voice_segments.__name__, i, total)
    audio = np.load(inpath)
    lang = AIModels.get_language(audio)
    response = {
        "lang": lang,
    }
    return response


def detect_voice_segments(
    flow_id: str,
    **metadata,
):
    inpath = getFilePath(flow_id, convert_to_numpy.__name__)
    audio = np.load(inpath)
    chunks = AIModels.get_voice_segments(audio)
    timestamps = [(chunk["start"], chunk["end"]) for chunk in chunks]
    split_audio = [
        audio[int(s * SAMPLE_RATE) : int(e * SAMPLE_RATE)] for s, e in timestamps
    ]
    total = len(split_audio)
    out_paths = [
        getFilePath(flow_id, detect_voice_segments.__name__, i, total)
        for i in range(total)
    ]
    total_time = sum([e - s for s, e in timestamps])

    tasks: List[Task] = []
    for i, op, sa, (s, e) in zip(range(total), out_paths, split_audio, timestamps):
        np.save(op, sa)
        if i == 0:
            tasks.append(
                Task(
                    flow_id,
                    partial(detect_language, i, total),
                    metadata["queue"],
                    metadata=metadata,
                )
            )
        tasks.append(
            Task(
                flow_id,
                partial(
                    transcribe_segment,
                    s,
                    e,
                    total_time,
                    i,
                    total,
                ),
                metadata["queue"],
                [tasks[0]],
                metadata,
            )
        )

    if len(tasks):
        Task(
            flow_id,
            partial(collect_transcriptions),
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
    flow_id: str,
    **metadata,
):
    in_path = getFilePath(flow_id, "upload", ext="")
    out_path = getFilePath(flow_id, convert_to_numpy.__name__)
    audio = load_audio(in_path)
    np.save(out_path, audio)
    task = Task(
        flow_id,
        partial(
            detect_voice_segments,
        ),
        metadata["queue"],
        metadata=metadata,
    )
    task.enqueue()

    response = {}

    return response
