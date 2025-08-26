// Types returned by your Flask API
import { diarizedSegment, segment } from "@/types/backend";

export type backend_status =
  | "uploading"
  | "processing"
  | "detecting_language"
  | "transcribing"
  | "fragmenting";

export type frontend_status = "queued" | "done" | "error" | "removed" | "sent";

export type FileJobStatus = backend_status | frontend_status;

export type FileJob = {
  id: string; // unique per file
  file: File;
  fileName: string;
  fileSize: string;
  color: string; // hsl string
  result?: Record<string, segment | diarizedSegment>;
  status: {
    [key in backend_status]: number;
  };
} & {
  [key in frontend_status]: boolean | string | null;
};
