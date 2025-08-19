import os
from whisperx import load_audio
from whisperx.audio import SAMPLE_RATE
import numpy as np
from queues import enqueue
from models import AIWorker
from pubsub import notify
from models import logger


UPLOADS = "/uploads"
WHISPER_DATA = UPLOADS
EXT = ".npy"


def transcribe_segment(
    segment_path: str, start_time_s: float, end_time_s: float, user: str, task_id: str
):
    audio = np.load(segment_path)
    ai = AIWorker()
    segments = ai.get_transcription(audio)
    result = {"segments": list(segments), "start": start_time_s, "end": end_time_s}
    response = {
        "transcription": result,
        "user": user,
        "task_type": "transcribe_segment",
        "task_id": task_id,
        "segment_path": segment_path,
    }
    notify(response)
    return response


# TODO think on how to integrate this
# def detect_language(file_name: str, user: str, task_id: str):
#    audio = np.load(file_name)
#    lang = whisper_model.detect_language(audio)  # single language
#    response = {
#        "detected_language": lang,
#        "user": user,
#        "task_type": "detect_language",
#        "task_id": task_id,
#    }
#    rq_connection.publish(single, json.dumps(response))
#    return response


def detect_voice_segments(file_path: str, user: str, task_id: str):
    try:
        audio = np.load(file_path)
        file_name = os.path.basename(file_path)
        chunks = AIWorker.get_voice_segments(audio)
        timestamps = [(chunk["start"], chunk["end"]) for chunk in chunks]
        split_audio = [
            audio[int(s * SAMPLE_RATE) : int(e * SAMPLE_RATE)] for s, e in timestamps
        ]
        total = len(split_audio)
        out_paths = [
            os.path.join(WHISPER_DATA, str(i) + str(total) + file_name)
            for i in range(total)
        ]
        for op, sa, (s, e) in zip(out_paths, split_audio, timestamps):
            np.save(op, sa)
            enqueue(transcribe_segment, op, s, e, user, task_id)

        response = {
            # "segments_output_paths": out_paths,
            # "segments_timestamps": timestamps,
            "user": user,
            "task_id": task_id,
            "task_type": "detect_voice_segments",
        }

    except Exception as e:
        response = {"error": e}
    finally:
        notify(response)
        return response


# def merge_jobs(job_a_id, job_b_id, user: str, task_id: str):
#    ja = Job.fetch(job_a_id, connection=rq_connection)
#    jb = Job.fetch(job_b_id, connection=rq_connection)
#    # Wait until both finish
#    while not (ja.is_finished and jb.is_finished):
#        time.sleep(1)
#        ja.refresh()
#        jb.refresh()
#
#    ja_response = ja.result  # TODO test if language detection is necesary
#    jb_response = jb.result
#    for fp, (s, e) in zip(
#        jb_response["segments_output_paths"], jb_response["segments_timestamps"]
#    ):
#        segment = np.load(fp)
#        single_queue.enqueue(transcribe_segment, segment, s, e, user)
#
#    response = {
#        "user": user,
#        "task_id": task_id,
#        "task_type": "merge_jobs",
#    }  # TODO:think of response
#    rq_connection.publish(single, json.dumps(response))
#    return response


def convert_to_numpy(file_name: str, user: str, task_id: str):
    logger.info("In convert_to_numpy %s %s %s", file_name, user, task_id)
    in_path = os.path.join(UPLOADS, file_name)
    out_path = os.path.join(WHISPER_DATA, file_name) + EXT
    logger.info("Computed in and out paths: %s %s", in_path, out_path)
    # lang_out_path = os.path.join(WHISPER_DATA, file_name) + "-LANG" + EXT
    logger.info("Start loading audio")
    audio = load_audio(in_path)
    logger.info("Done loading audio")
    np.save(out_path, audio)
    logger.info("Saved audio")
    # np.save(lang_out_path, audio[:N_SAMPLES])
    # enqueue(detect_language, lang_out_path, user, task_id)
    enqueue(
        detect_voice_segments,
        out_path,
        user,
        task_id,
    )

    response = {
        "complete_data_output_path": out_path,
        "user": user,
        "task_id": task_id,
        "task_type": "conver_to_numpy",
    }

    notify(response)
    return response
