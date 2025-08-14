/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, Play, X, FileAudio, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy } from "lucide-react";
import { Dropzone } from "@/components/ui/dropzone";

// Drop this component into app/page.tsx (Next.js App Router)
// Assumes shadcn/ui is installed and Tailwind is configured.
// The Flask backend must expose POST /transcribe accepting form-data: audio_file=<file>

// Types returned by your Flask API
interface Segment {
  start: number;
  end: number;
  text: string;
  speaker: string;
}

interface FileJob {
  id: string; // unique per file
  file: File;
  color: string; // hsl string
  progress: number; // 0..100
  status: "queued" | "uploading" | "processing" | "done" | "error";
  error?: string;
  result?: Segment[];
}

// Generate a stable, pleasant HSL color for each file
function randomColor(seed: string) {
  // simple hash
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const hue = (h + 360) % 360;
  return `hsl(${hue} 80% 45%)`;
}

export default function WhisperS2TPage() {
  const [jobs, setJobs] = useState<FileJob[]>([]);

  const canStart = useMemo(
    () => jobs.some((j) => j.status === "queued"),
    [jobs]
  );

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    const items: FileJob[] = [];
    Array.from(files).forEach((f) => {
      if (!f.type || !f.type.includes("wav")) return; // only wav
      const id = `${f.name}-${f.size}-${f.lastModified}-${crypto.randomUUID()}`;
      items.push({
        id,
        file: f,
        color: randomColor(f.name + f.size + ""),
        progress: 0,
        status: "queued",
      });
    });
    if (items.length) setJobs((prev) => [...prev, ...items]);
  }, []);

  const removeJob = (id: string) =>
    setJobs((prev) => prev.filter((j) => j.id !== id));

  const startAll = async () => {
    // process each queued job sequentially for simplicity
    for (const job of jobs) {
      if (job.status !== "queued") continue;
      await runJob(job.id);
    }
  };

  const runJob = async (id: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === id ? { ...j, status: "uploading", progress: 10 } : j
      )
    );

    const job = jobs.find((j) => j.id === id);
    if (!job) return;

    const form = new FormData();
    form.append("audio_file", job.file);

    try {
      // "Fake" progress while waiting for server response
      let pct = 10;
      const tick = setInterval(() => {
        pct = Math.min(95, pct + Math.random() * 7);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? {
                  ...j,
                  progress: pct,
                  status: j.status === "uploading" ? "processing" : j.status,
                }
              : j
          )
        );
      }, 400);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      console.log("BACKEND RESPONSE:", data);
      clearInterval(tick);

      if (!res.ok) {
        const msg = !res.ok
          ? data?.error || res.statusText
          : "Unexpected response";
        setJobs((prev) =>
          prev.map((j) =>
            j.id === id
              ? { ...j, status: "error", error: msg, progress: 100 }
              : j
          )
        );
        return;
      }

      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? { ...j, status: "done", result: data.segments, progress: 100 }
            : j
        )
      );
    } catch (err: any) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === id
            ? {
                ...j,
                status: "error",
                error: err?.message || String(err),
                progress: 100,
              }
            : j
        )
      );
    }
  };
  const handleCopy = useCallback(
    (jobId: string) => {
      const tableText = [
        "Start Time\tEnd Time\tText",
        ...jobs
          .find((v) => v.id === jobId)!
          .result!.map((row) => `${row.start}\t${row.end}\t${row.text}`),
      ].join("\n");

      navigator.clipboard
        .writeText(tableText)
        .then(() => {
          alert("Table copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy table:", err);
        });
    },
    [jobs]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            Whisper S2T Batch Transcriber
          </h1>
          <div className="flex gap-2">
            <Button onClick={startAll} disabled={!canStart}>
              <Play className="mr-2 h-4 w-4" /> Start
            </Button>
          </div>
        </div>

        {/* Dropzone */}
        <Dropzone
          text="Drag & drop WAV files or click here"
          addFiles={addFiles}
          fullScreen={true}
        />
        {/* File jobs */}
        <div className="grid gap-4">
          <AnimatePresence>
            {jobs.map((job) => (
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
                      <span>{job.file.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        ({(job.file.size / 1024).toFixed(0)} KB)
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {job.status === "done" && (
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
                    {job.status !== "done" && job.status !== "error" && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {job.status === "queued"
                              ? "Queued"
                              : job.status === "uploading"
                              ? "Uploading"
                              : "Processing"}
                          </span>
                          <span>{Math.round(job.progress)}%</span>
                        </div>
                        <Progress
                          value={job.progress}
                          className="h-2"
                          style={{
                            // style progress bar color via CSS variable fallback
                            // you can also customize your shadcn theme for a cleaner approach
                            ["--progress-foreground" as any]: job.color,
                          }}
                        />
                      </div>
                    )}

                    {job.status === "error" && (
                      <p className="text-sm text-destructive">
                        {job.error || "Something went wrong"}
                      </p>
                    )}

                    {job.status === "done" && job.result && (
                      <div
                        className="mt-2 overflow-x-auto rounded-xl border"
                        style={{ borderColor: job.color }}
                      >
                        <Table>
                          <TableHeader>
                            <TableRow
                              style={{
                                backgroundColor: `color-mix(in oklab, ${job.color} 12%, transparent)`,
                              }}
                            >
                              <TableHead>Start Time (s)</TableHead>
                              <TableHead>End Time (s)</TableHead>
                              <TableHead>Speaker</TableHead>
                              <TableHead>Text</TableHead>
                              <TableHead>
                                <button
                                  onClick={() => handleCopy(job.id)}
                                  className="ml-2 text-gray-500 hover:text-gray-800"
                                  title="Copy table"
                                >
                                  <Copy size={16} />
                                </button>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {job.result.map((seg, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="whitespace-nowrap tabular-nums">
                                  {seg.start}
                                </TableCell>
                                <TableCell className="whitespace-nowrap tabular-nums">
                                  {seg.end}
                                </TableCell>
                                <TableCell className="whitespace-nowrap tabular-nums">
                                  {seg.speaker}
                                </TableCell>
                                <TableCell className="whitespace-pre-wrap">
                                  {seg.text}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
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
