from dataclasses import dataclass
from typing import Optional
from pyannote.core import Annotation
from pyannote.audio.utils.signal import Binarize


@dataclass
class VadSegment:
    start: float
    end: float
    speaker: Optional[str] = None

def sliding_window_to_segments(
    vad_result,
    onset: float = 0.5,
    offset: float = 0.5,
    min_duration_on: float = 0.0,
    min_duration_off: float = 0.0,
    speaker: Optional[str] = None,
) -> list[VadSegment]:
    """
    Converts the output of a pyannote VAD model (SlidingWindowFeature)
    into the list of SingleSegment objects expected by WhisperX's
    merge_chunks() function.

    Parameters
    ----------
    vad_result:
        The SlidingWindowFeature returned by the pyannote VAD model.

    onset:
        Speech activation threshold.

    offset:
        Speech deactivation threshold.

    min_duration_on:
        Minimum duration for a speech segment.

    min_duration_off:
        Minimum duration for a silence segment.

    speaker:
        Optional speaker identifier. Since diarization has not yet been
        performed, this should usually be None.

    Returns
    -------
    list[SingleSegment]
        A list of WhisperX compatible segments.
    """

    binarize = Binarize(
        onset=onset,
        offset=offset,
        min_duration_on=min_duration_on,
        min_duration_off=min_duration_off,
    )

    annotation: Annotation = binarize(vad_result)

    return [
        VadSegment(
            start=segment.start,
            end=segment.end,
            speaker=speaker,
        )
        for segment in annotation.itersegments()
    ]
