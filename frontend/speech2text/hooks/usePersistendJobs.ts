import { FileJob } from "@/types/job";
import { useEffect, useState } from "react";

export function usePersistentJobs(key: string) {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  useEffect(() => {
    const state = () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
      }
      return [];
    };

    setJobs(state);
  }, [key]);

  useEffect(() => {
    localStorage.setItem(
      key,
      JSON.stringify(
        jobs.filter((j) => !["queued", "uploading"].includes(j.status))
      )
    );
  }, [jobs, key]);
  console.log("JOBS:", jobs);

  return { jobs, setJobs } as const;
}
