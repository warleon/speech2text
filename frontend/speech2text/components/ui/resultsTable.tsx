import { Copy } from "lucide-react";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "./table";
import { FileJob } from "@/types/job";
import { useCallback } from "react";

interface Props {
  job: FileJob;
}
export function ResultsTable({ job }: Props) {
  const handleCopy = useCallback(() => {
    const tableText = [
      "Start Time\tEnd Time\tText",
      ...(job.result?.map(
        (row) => `${row.start.toFixed(2)}\t${row.end.toFixed(2)}\t${row.text}`
      ) ?? []),
    ].join("\n");

    navigator.clipboard
      .writeText(tableText)
      .then(() => {
        alert("Table copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy table:", err);
      });
  }, [job]);
  return (
    <Table>
      <TableHeader>
        <TableRow
          style={{
            backgroundColor: `color-mix(in oklab, ${job.color} 12%, transparent)`,
          }}
        >
          <TableHead>Start Time (s)</TableHead>
          <TableHead>End Time (s)</TableHead>
          <TableHead>Text</TableHead>
          <TableHead>
            <button
              onClick={() => handleCopy()}
              className="ml-2 text-gray-500 hover:text-gray-800"
              title="Copy table"
            >
              <Copy size={16} />
            </button>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {job.result &&
          job.result.map((seg, idx) => (
            <TableRow key={idx}>
              <TableCell className="whitespace-nowrap tabular-nums">
                {seg.start.toFixed(2)}
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">
                {seg.end.toFixed(2)}
              </TableCell>
              <TableCell className="whitespace-pre-wrap">{seg.text}</TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}
