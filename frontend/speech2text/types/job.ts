// Types returned by your Flask API
export interface Segment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}
export type FileJobStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "processing"
  | "done"
  | "error";

export interface FileJob {
  id: string; // unique per file
  file: File;
  fileName: string;
  fileSize: string;
  color: string; // hsl string
  progress: number; // 0..100
  status: FileJobStatus;
  error?: string | null;
  result?: Segment[];
  removed?: boolean;
}
