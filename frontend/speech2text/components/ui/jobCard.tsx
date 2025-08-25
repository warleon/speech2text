import { backend_status, FileJob } from "@/types/job";
import { motion } from "framer-motion";
import { FileAudio, CheckCircle, X } from "lucide-react";
import { Button } from "./button";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { CircularProgress } from "./circularProgress";
import { ResultsTable } from "./resultsTable";

interface Props {
  job: FileJob;
  removeJob: (id: string) => void;
}
export function JobCard({ job, removeJob }: Props) {
  return (
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
            <FileAudio style={{ color: job.color }} className="h-5 w-5" />
            <span>{job.fileName}</span>
            <span className="text-xs font-normal text-muted-foreground">
              ({job.fileSize})
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {job.done && (
              <CheckCircle className="h-5 w-5" style={{ color: job.color }} />
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
                  "fragmenting",
                  "detecting_language",
                  "transcribing",
                ] as backend_status[]
              ).map((key) => (
                <CircularProgress
                  key={key}
                  value={Math.round(job.status[key])}
                  color={job.color}
                  activated={job.status[key] > 0 && !Boolean(job.error)}
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
  );
}
