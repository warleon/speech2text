export interface segment {
  start: number;
  end: number;
  text: string;
  speaker: string;
  total_time: number;
}
type task_type =
  | "transcribe_segment"
  | "detect_language"
  | "detect_voice_segments"
  | "convert_to_numpy"
  | "";

type baseTaskResponse = {
  user: string;
  task_id: string;
  task_type: task_type;
  next_task_type: task_type;
};

export type transcriptionResponse = baseTaskResponse & {
  transcription: segment;
  segment_path: string;
};

export type languageDetectionResponse = baseTaskResponse & {
  detected_language: string;
};
export type voiceSegmentsDetectionResponse = baseTaskResponse & {
  segments_output_paths: string[];
  segments_timestamps: [number, number][];
  total_useful_time: number;
};

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
  | toNumpyResponse;
