/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomColor } from "@/lib/utils";
import { backend_status, FileJob } from "@/types/job";
import { useCallback, useMemo, useEffect } from "react";
import { usePersistentId } from "./usePersistentId";
import { usePersistentJobs } from "./usePersistendJobs";
import { FILE_KEY, FILE_NAME_KEY, TASK_KEY, USER_KEY } from "@/lib/constants";
import { useBackendSubscription } from "./useBackendSubscription";
import axios from "axios";
import { segment } from "@/types/backend";

interface Props {
  fakeProgressDuration: number;
}

export function useFileJobs(
  { fakeProgressDuration }: Props = { fakeProgressDuration: 30000 }
) {
  const { jobs, setJobs } = usePersistentJobs("jobs");
  const userId = usePersistentId("userId");

  const canStart = useMemo(() => jobs.some((j) => j.queued), [jobs]);
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

  const addResult = useCallback(
    (id: string, segment: segment) => {
      setJobs((prev) =>
        prev.map((j) => {
          return j.id === id
            ? {
                ...j,
                result: j.result ? [...j.result, segment] : [segment],
              }
            : j;
        })
      );
    },
    [setJobs]
  );
  const setStatus = useCallback(
    (id: string, status: backend_status, value: number) => {
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id === id) {
            if (j.error) return j;
            if (j.status[status] >= value) return j;
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
    },
    [setJobs]
  );

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const items: FileJob[] = [];
      Array.from(files).forEach((f) => {
        if (!f.type || !f.type.includes("wav")) return; // only wav
        const id = `${f.name}-${f.size}-${f.lastModified}-${userId}`;
        const alreadyJob = jobs.find((j) => j.id === id);
        if (alreadyJob) {
          if (alreadyJob.removed || alreadyJob.error)
            restoreJob(alreadyJob.id, f);
          return;
        }
        items.push({
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
      });
      if (items.length) setJobs((prev) => [...prev, ...items]);
    },
    [setJobs, userId, jobs, restoreJob]
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
        setStatus(id, status, progress);

        if (progress >= limit || progress >= 99) {
          clearInterval(tick);
        }
      }, 500);
      return tick;
    },
    [fakeProgressDuration, setStatus]
  );
  useBackendSubscription({
    user: userId,
    on: {
      preProcess: (task) => {
        setStatus(task.task_id, "processing", 100);
        progressJob(task.task_id, "detecting_language", 99);
      },
      languageFound: (task) => {
        setStatus(task.task_id, "detecting_language", 100);
        progressJob(task.task_id, "fragmenting", 99);
      },
      segmentation: (task) => {
        setStatus(task.task_id, "fragmenting", 100);
        setStatus(task.task_id, "transcribing", 1);
      },
      transcription: (task) => {
        const currentProgress = jobs.find((j) => j.id === task.task_id)!.status
          .transcribing;
        const diff = task.transcription.end - task.transcription.start;
        const total = task.transcription.total_time;
        const newTotal = currentProgress + diff / total;
        setStatus(task.task_id, "transcribing", newTotal);
        addResult(task.task_id, task.transcription);
        if (newTotal >= 100) doneJob(task.task_id);
      },
    },
  });

  const runJob = useCallback(
    async (id: string) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return;

      const formData = new FormData();
      formData.append(FILE_KEY, job.file);
      formData.append(FILE_NAME_KEY, job.id);
      formData.append(USER_KEY, userId);
      formData.append(TASK_KEY, id);

      progressJob(id, "uploading", 99);
      try {
        const res = await axios.post("/api/upload", formData);
        console.log("BACKEND RESPONSE:", res);
      } catch (err: any) {
        errorJob(id, err.message);
      }
    },
    [jobs, progressJob, userId, errorJob]
  );

  const start = useCallback(() => {
    // process each queued job sequentially for simplicity
    for (const job of jobs) {
      if (job.removed || job.done || job.error || job.sent) continue;
      runJob(job.id);
      sentJob(job.id);
    }
  }, [jobs, runJob, sentJob]);

  useEffect(() => {
    start();
  }, [jobs, start]);

  return { jobs, addFiles, canStart, removeJob, runJob, restoreJob };
}

// EaseInOutCubic function (t from 0 to 1)
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
