export interface segment {
  start: number;
  end: number;
  text: string;
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
};

export type languageDetectionResponse = baseTaskResponse & {
  detected_language: string;
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
