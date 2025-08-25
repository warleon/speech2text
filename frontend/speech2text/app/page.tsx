"use client";

import React from "react";

import { Dropzone } from "@/components/ui/dropzone";
import { useFileJobs } from "@/hooks/useFileJobs";
import { JobCard } from "@/components/ui/jobCard";
import { AnimatePresence } from "framer-motion";

export default function WhisperS2TPage() {
  const { addFiles, jobs, removeJob } = useFileJobs();

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Whisper S2T Batch Transcriber
          </h1>
        </div>

        {/* Dropzone */}
        <Dropzone addFiles={addFiles} fullScreen={true} />
        {/* File jobs */}
        <div className="grid gap-4">
          <AnimatePresence>
            {jobs
              .filter((j) => !j.removed)
              .map((job, i) => (
                <JobCard job={job} key={i} removeJob={removeJob} />
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
