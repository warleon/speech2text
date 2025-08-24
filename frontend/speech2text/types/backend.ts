export interface segment {
  start: number;
  end: number;
  text: string[];
  total_time: number;
}

export interface wordSegment {
  word: string;
  start: number;
  end: number;
  score: number;
}
export interface charSegment {
  char: string;
  start: number;
  end: number;
  score: number;
}

type alignedSegment = segment & {
  words: wordSegment[];
  chars?: charSegment[];
};

type task_type =
  | "diarize"
  | "align_words"
  | "collect_transcriptions"
  | "transcribe_segment"
  | "detect_language"
  | "detect_voice_segments"
  | "convert_to_numpy"
  | "";

type baseTaskResponse = {
  task_id: string;
  task_type: task_type;
};

type speaker = { speaker: string };

export type diarizationResponse = baseTaskResponse & {
  diarization: {
    segments: alignedSegment &
      speaker & {
        words: (wordSegment & speaker)[];
        chars?: (charSegment & speaker)[];
      };
  };
};

export type alignmentResponse = baseTaskResponse & {
  aligned: alignedSegment;
};

export type collectTranscriptionsResponse = backendResponse;

export type transcriptionResponse = baseTaskResponse & {
  transcription: segment;
};

export type languageDetectionResponse = baseTaskResponse & {
  lang: string;
};
export type voiceSegmentsDetectionResponse = baseTaskResponse & {
  segments_timestamps: [number, number][];
  total_useful_time: number;
};

export type toNumpyResponse = baseTaskResponse & {};

export type backendResponse =
  | transcriptionResponse
  | languageDetectionResponse
  | voiceSegmentsDetectionResponse
  | toNumpyResponse;
