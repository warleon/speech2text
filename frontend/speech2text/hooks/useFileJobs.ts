/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomColor } from "@/lib/utils";
import { FileJob, FileJobStatus, Segment } from "@/types/job";
import { useCallback, useMemo, useEffect } from "react";
import { usePersistentId } from "./usePersistentId";
import { usePersistentJobs } from "./usePersistendJobs";
import { FILE_KEY, FILE_NAME_KEY, TASK_KEY, USER_KEY } from "@/lib/constants";
import { useBackendSubscription } from "./useBackendSubscription";
import axios from "axios";

interface Props {
  fakeProgressDuration: number;
}

export function useFileJobs(
  { fakeProgressDuration }: Props = { fakeProgressDuration: 10000 }
) {
  const { jobs, setJobs } = usePersistentJobs("jobs");
  const userId = usePersistentId("userId");
  const logIt = useCallback((m: unknown) => {
    console.log(m);
  }, []);
  useBackendSubscription({
    user: userId,
    on: {
      languageFound: logIt,
      merge: logIt,
      preProcess: logIt,
      segmentation: logIt,
      transcription: logIt,
    },
  });

  const canStart = useMemo(
    () => jobs.some((j) => j.status === "queued"),
    [jobs]
  );
  const restoreJob = useCallback(
    (id: string, file?: File) => {
      setJobs((prev) =>
        prev.map((j) => {
          return j.id === id
            ? {
                ...j,
                removed: false,
                status: j.status === "error" ? "queued" : j.status,
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

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const items: FileJob[] = [];
      Array.from(files).forEach((f) => {
        if (!f.type || !f.type.includes("wav")) return; // only wav
        const id = `${f.name}-${f.size}-${f.lastModified}-${userId}`;
        const alreadyJob = jobs.find((j) => j.id === id);
        if (alreadyJob) {
          if (alreadyJob.removed || alreadyJob.status === "error")
            restoreJob(alreadyJob.id, f);
          return;
        }
        items.push({
          id,
          file: f,
          fileSize: `${(f.size / (1024 * 1024)).toLocaleString()} MB`,
          fileName: f.name,
          color: randomColor(f.name + f.size + ""),
          progress: 0,
          status: "queued",
        } satisfies FileJob);
      });
      if (items.length) setJobs((prev) => [...prev, ...items]);
    },
    [setJobs, userId, jobs, restoreJob]
  );
  const progressJob = useCallback(
    (
      id: string,
      status: FileJobStatus,
      pastTick?: NodeJS.Timeout,
      done?: boolean,
      error?: string | null,
      result?: Segment[]
    ) => {
      if (pastTick) clearInterval(pastTick);
      if (done || error) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  progress: error ? 0 : 100,
                  status,
                  error,
                  result,
                }
              : j
          )
        );
        return;
      }
      // "Fake" progress while waiting for server response
      const startTime = Date.now();
      const tick = setInterval(() => {
        const elapsed = Date.now() - startTime;
        let t = elapsed / fakeProgressDuration;

        if (t >= 1) t = 1;

        const progress = easeInOutCubic(t) * 99; // scale to 99%

        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  progress,
                  status,
                }
              : j
          )
        );

        if (t >= 1) {
          clearInterval(tick);
        }
      }, 500);
      return tick;
    },
    [fakeProgressDuration, setJobs]
  );

  const runJob = useCallback(
    async (id: string) => {
      const job = jobs.find((j) => j.id === id);
      if (!job) return;

      const formData = new FormData();
      formData.append(FILE_KEY, job.file);
      formData.append(FILE_NAME_KEY, job.id);
      formData.append(USER_KEY, userId);
      formData.append(TASK_KEY, id);

      const tick = progressJob(id, "uploading");
      try {
        const res = await axios.post("/api/upload", formData);
        console.log("BACKEND RESPONSE:", res);

        progressJob(id, "uploaded", tick!, true, null);
      } catch (err: any) {
        progressJob(id, "error", tick!, true, err.message);
      }
    },
    [jobs, progressJob, userId]
  );

  const start = useCallback(() => {
    // process each queued job sequentially for simplicity
    for (const job of jobs) {
      if (job.status !== "queued") continue;
      if (job.removed) continue;
      runJob(job.id);
    }
  }, [jobs, runJob]);

  useEffect(() => {
    start();
  }, [jobs, start]);

  return { jobs, addFiles, canStart, removeJob, runJob, restoreJob };
}

// EaseInOutCubic function (t from 0 to 1)
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
