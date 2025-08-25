"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { X, FileAudio, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dropzone } from "@/components/ui/dropzone";
import { useFileJobs } from "@/hooks/useFileJobs";
import { CircularProgress } from "@/components/ui/circularProgress";
import { backend_status } from "@/types/job";
import { ResultsTable } from "@/components/ui/resultsTable";

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
              .map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Card
                    className="overflow-hidden"
                    style={{
                      borderColor: job.color,
                      boxShadow: `0 0 0 1px ${job.color} inset, 0 6px 24px -8px color-mix(in oklab, ${job.color} 40%, transparent)`,
                    }}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileAudio
                          style={{ color: job.color }}
                          className="h-5 w-5"
                        />
                        <span>{job.fileName}</span>
                        <span className="text-xs font-normal text-muted-foreground">
                          ({job.fileSize})
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {job.done && (
                          <CheckCircle
                            className="h-5 w-5"
                            style={{ color: job.color }}
                          />
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeJob(job.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!job.done && !job.error && (
                        <div className="space-y-2 flex justify-around flex-wrap">
                          {(
                            [
                              "uploading",
                              "processing",
                              "detecting_language",
                              "fragmenting",
                              "transcribing",
                            ] as backend_status[]
                          ).map((key) => (
                            <CircularProgress
                              key={key}
                              value={Math.round(job.status[key])}
                              color={job.color}
                              activated={
                                job.status[key] > 0 && !Boolean(job.error)
                              }
                              action={key}
                              size={120}
                            />
                          ))}
                        </div>
                      )}

                      {job.error && (
                        <p className="text-sm text-destructive">
                          {job.error || "Something went wrong"}
                        </p>
                      )}

                      {job.done && job.result && (
                        <div
                          className="mt-2 overflow-x-auto rounded-xl border"
                          style={{ borderColor: job.color }}
                        >
                          <ResultsTable job={job} />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
