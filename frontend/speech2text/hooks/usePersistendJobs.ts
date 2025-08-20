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
    console.log("JOBS:", jobs);
    localStorage.setItem(key, JSON.stringify(jobs));
  }, [jobs, key]);

  return { jobs, setJobs } as const;
}
