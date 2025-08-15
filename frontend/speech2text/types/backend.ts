type task_type =
  | "transcribe_segment"
  | "detect_language"
  | "detect_voice_segments"
  | "merge_jobs"
  | "convert_to_numpy";

type baseTaskResponse = {
  user: string;
  task_id: string;
  task_type: task_type;
};

export type transcriptionResponse = baseTaskResponse & {
  transcription: {
    text: string;
    start: number;
    end: number;
  };
  segment_path: string;
};

export type languageDetectionResponse = baseTaskResponse & {
  detected_language: string;
};
export type voiceSegmentsDetectionResponse = baseTaskResponse & {
  segments_output_paths: string[];
  segments_timestamps: [number, number][];
};
export type mergeResponse = baseTaskResponse;

export type toNumpyResponse = baseTaskResponse & {
  complete_data_output_path: string;
  language_data_output_pat: string;
  language_detection_job_id: string;
  voice_detection_job_id: string;
  merge_step_job_id: string;
};

export type backendResponse =
  | transcriptionResponse
  | languageDetectionResponse
  | voiceSegmentsDetectionResponse
  | mergeResponse
  | toNumpyResponse;
