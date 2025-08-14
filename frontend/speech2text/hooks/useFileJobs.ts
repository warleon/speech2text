/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomColor } from "@/lib/utils";
import { FileJob, FileJobStatus, Segment } from "@/types/job";
import { useState, useCallback, useMemo, useEffect } from "react";
import { usePersistentId } from "./usePersistentId";

interface Props {
  fakeProgressDuration: number;
}

export function useFileJobs(
  { fakeProgressDuration }: Props = { fakeProgressDuration: 10000 }
) {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const userId = usePersistentId("userId");

  const canStart = useMemo(
    () => jobs.some((j) => j.status === "queued"),
    [jobs]
  );
  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const items: FileJob[] = [];
      Array.from(files).forEach((f) => {
        if (!f.type || !f.type.includes("wav")) return; // only wav
        const id = `${f.name}-${f.size}-${f.lastModified}-${userId}`;
        if (jobs.find((j) => j.id === id)) return;
        items.push({
          id,
          file: f,
          color: randomColor(f.name + f.size + ""),
          progress: 0,
          status: "queued",
        });
      });
      if (items.length) setJobs((prev) => [...prev, ...items]);
    },
    [userId, jobs]
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
    [fakeProgressDuration]
  );

  const runJob = useCallback(
    async (id: string) => {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, status: "uploading", progress: 10 } : j
        )
      );

      const job = jobs.find((j) => j.id === id);
      if (!job) return;

      const form = new FormData();
      form.append("file", job.file);

      const tick = progressJob(id, "uploading");
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        console.log("BACKEND RESPONSE:", data);

        if (!res.ok) {
          const msg = !res.ok
            ? data?.error || res.statusText
            : "Unexpected response";
          progressJob(id, "error", tick!, true, msg);
          return;
        }

        progressJob(id, "uploaded", tick!, true, null, data);
      } catch (err: any) {
        progressJob(id, "error", tick!, true, err.message);
      }
    },
    [jobs, progressJob]
  );

  const start = useCallback(() => {
    // process each queued job sequentially for simplicity
    for (const job of jobs) {
      if (job.status !== "queued") continue;
      runJob(job.id);
    }
  }, [jobs, runJob]);

  useEffect(() => {
    start();
  }, [jobs, start]);

  return { jobs, addFiles, canStart, removeJob, runJob };
}

// EaseInOutCubic function (t from 0 to 1)
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
