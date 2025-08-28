/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomColor } from "@/lib/utils";
import { backend_status, FileJob } from "@/types/job";
import { useCallback, useEffect } from "react";
import { usePersistentId } from "./usePersistentId";
import { usePersistentJobs } from "./usePersistendJobs";
import { FILE_KEY, TASK_KEY, USER_KEY } from "@/lib/constants";
import { useBackendSubscription } from "./useBackendSubscription";
import axios from "axios";
import {
  alignmentResponse,
  diarizationResponse,
  diarizedSegment,
  languageDetectionResponse,
  segment,
  toNumpyResponse,
  transcriptionResponse,
  voiceSegmentsDetectionResponse,
} from "@/types/backend";

interface Props {
  fakeProgressDuration: number;
  fakeProgressInterval: number;
}

export function useFileJobs(
  { fakeProgressDuration, fakeProgressInterval }: Props = {
    fakeProgressDuration: 30000,
    fakeProgressInterval: 3000,
  }
) {
  const { jobs, setJobs } = usePersistentJobs("jobs");
  const userId = usePersistentId("userId");

  const restoreJob = useCallback(
    (id: string, file?: File) => {
      setJobs((prev) =>
        prev.map((j) => {
          return j.id === id
            ? {
                ...j,
                removed: false,
                file: file ?? j.file,
                fileSize: file?.size
                  ? `${(file.size / (1024 * 1024)).toLocaleString()} MB`
                  : j.fileSize,
                fileName: file?.name ?? j.fileName,
              }
            : j;
        })
      );
    },
    [setJobs]
  );
  const removeJob = useCallback(
    (id: string) => {
      setJobs((prev) =>
        prev.map((j) => {
          return j.id === id
            ? {
                ...j,
                removed: true,
              }
            : j;
        })
      );
    },
    [setJobs]
  );
  const errorJob = useCallback(
    (id: string, error: string) => {
      setJobs((prev) =>
        prev.map((j) => {
          return j.id === id
            ? {
                ...j,
                error: error,
              }
            : j;
        })
      );
    },
    [setJobs]
  );

  const sentJob = useCallback(
    (id: string) => {
      setJobs((prev) =>
        prev.map((j) => {
          return j.id === id
            ? {
                ...j,
                sent: true,
                status: {
                  ...j.status,
                  uploading: 100,
                },
              }
            : j;
        })
      );
    },
    [setJobs]
  );

  const doneJob = useCallback(
    (id: string) => {
      setJobs((prev) =>
        prev.map((j) => {
          return j.id === id
            ? {
                ...j,
                done: true,
                status: {
                  detecting_language: 100,
                  fragmenting: 100,
                  processing: 100,
                  transcribing: 100,
                  uploading: 100,
                },
              }
            : j;
        })
      );
    },
    [setJobs]
  );

  const setResult = useCallback(
    (jid: string, rid: string, segment: segment | diarizedSegment) => {
      setJobs((prev) => {
        return prev.map((j) => {
          return j.id === jid
            ? {
                ...j,
                result: { ...j.result, [rid]: segment },
              }
            : j;
        });
      });
    },
    [setJobs]
  );
  const setStatus = useCallback(
    (id: string, status: backend_status, value: number) => {
      const job = jobs.find((j) => j.id === id);
      if (!job || job.done || job.error || job.status[status] >= value) {
        return true;
      }
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id === id) {
            if (j.done || j.error || j.status[status] >= value) {
              return j;
            }
            return {
              ...j,
              status: {
                ...j.status,
                [status]: value > 100 ? 100 : value < 0 ? 0 : value,
              },
            };
          } else {
            return j;
          }
        })
      );
      return false;
    },
    [setJobs, jobs]
  );

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      const items: FileJob[] = [];
      await Promise.all(
        Array.from(files).map(async (f) => {
          const id = await hashFile(f);
          const alreadyJob = jobs.find((j) => j.id === id);
          if (alreadyJob) {
            if (alreadyJob.removed || alreadyJob.error)
              restoreJob(alreadyJob.id, f);
            return;
          }
          const nlen = items.push({
            id,
            file: f,
            fileSize: `${(f.size / (1024 * 1024)).toLocaleString()} MB`,
            fileName: f.name,
            color: randomColor(f.name + f.size + ""),
            queued: true,
            done: false,
            error: null,
            removed: false,
            sent: false,
            status: {
              detecting_language: 0,
              processing: 0,
              transcribing: 0,
              uploading: 0,
              fragmenting: 0,
            },
          } satisfies FileJob);
          console.log("Added new file to the list, new size", nlen);
        })
      );
      if (items.length) setJobs((prev) => [...prev, ...items]);
    },
    [setJobs, jobs, restoreJob]
  );
  const progressJob = useCallback(
    (id: string, status: backend_status, limit: number = 99) => {
      // "Fake" progress while waiting for server response
      const startTime = Date.now();
      const tick = setInterval(() => {
        const elapsed = Date.now() - startTime;
        let t = elapsed / fakeProgressDuration;

        if (t >= 1) t = 1;

        const progress = easeInOutCubic(t) * limit;

        const shouldStop = setStatus(id, status, progress);

        if (shouldStop || progress >= limit) {
          clearInterval(tick);
        }
      }, fakeProgressInterval);
    },
    [fakeProgressDuration, fakeProgressInterval, setStatus]
  );
  const onPreProcess = useCallback(
    (task: toNumpyResponse) => {
      setStatus(task.task_id, "processing", 100);
      progressJob(task.task_id, "fragmenting");
    },
    [progressJob, setStatus]
  );
  const onSegmentation = useCallback(
    (task: voiceSegmentsDetectionResponse) => {
      setStatus(task.task_id, "fragmenting", 100);
      progressJob(task.task_id, "detecting_language");
    },
    [progressJob, setStatus]
  );
  const onLanguageFound = useCallback(
    (task: languageDetectionResponse) => {
      setStatus(task.task_id, "detecting_language", 100);
      setStatus(task.task_id, "transcribing", 1);
    },
    [setStatus]
  );
  const onTranscription = useCallback(
    (task: transcriptionResponse) => {
      console.log("On transcribe segment callback", task);
      setResult(task.task_id, task.transcription.text, task.transcription);
    },
    [setResult]
  );
  const onAlignment = useCallback((task: alignmentResponse) => {
    console.log("onAligment:", task);
  }, []);
  const onDiarization = useCallback((task: diarizationResponse) => {}, []);
  useBackendSubscription({
    user: userId,
    onPreProcess,
    onLanguageFound,
    onSegmentation,
    onTranscription,
    onAlignment,
    onDiarization,
  });

  const runJob = useCallback(
    async (id: string) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return;

      const formData = new FormData();
      formData.append(FILE_KEY, job.file);
      formData.append(USER_KEY, userId);
      formData.append(TASK_KEY, id);

      progressJob(id, "uploading");
      try {
        const res = await axios.post("/api/upload", formData);
        console.log("BACKEND RESPONSE:", res);
      } catch (err: any) {
        errorJob(id, err.message);
      }
    },
    [jobs, progressJob, userId, errorJob]
  );

  const process = useCallback(() => {
    for (const job of jobs) {
      if (job.removed || job.done || job.error) continue;
      if (job.result) {
        let sub_total = 0;
        let total = 0;
        for (const result of Object.values(job.result)) {
          total = result.total_time;
          sub_total += result.end - result.start;
        }
        console.log("Progress is", sub_total, "of", total);
        if (total - sub_total < 0.1) {
          doneJob(job.id);
          continue;
        }
        setStatus(job.id, "transcribing", (sub_total / total) * 100);
      }
      if (job.sent) continue;
      runJob(job.id);
      sentJob(job.id);
      progressJob(job.id, "processing");
    }
  }, [jobs, runJob, sentJob, progressJob, setStatus, doneJob]);

  useEffect(() => {
    process();
  }, [process]);

  return { jobs, addFiles, removeJob, runJob, restoreJob };
}

// EaseInOutCubic function (t from 0 to 1)
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

async function hashFile(file: File) {
  // 1. Read the file into an ArrayBuffer
  const buffer = await file.arrayBuffer();

  // 2. Hash it with SubtleCrypto
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  // 3. Convert ArrayBuffer -> hex string
  const hashArray = Array.from(new Uint8Array(digest));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}
