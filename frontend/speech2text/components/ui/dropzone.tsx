import { useWindow } from "@/hooks/useWindow";
import { useCallback, useEffect, useRef, useState } from "react";
import MediaFolderIcon from "./mediaFolderIcon";

interface Props {
  addFiles: (files: FileList | null) => void;
  fullScreen?: boolean;
}
export function Dropzone({ addFiles, fullScreen }: Props) {
  const window = useWindow();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounter = useRef(0);

  const onDragOver = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setDragActive(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setDragActive(false);
    }
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent | DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setDragActive(false);
      if (e.dataTransfer?.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  useEffect(() => {
    if (fullScreen) {
      window?.addEventListener("dragover", onDragOver);
      window?.addEventListener("dragenter", onDragEnter);
      window?.addEventListener("dragleave", onDragLeave);
      window?.addEventListener("drop", onDrop);

      return () => {
        window?.removeEventListener("dragover", onDragOver);
        window?.removeEventListener("dragenter", onDragEnter);
        window?.removeEventListener("dragleave", onDragLeave);
        window?.removeEventListener("drop", onDrop);
      };
    }
  }, [onDrop, onDragOver, onDragLeave, onDragEnter, fullScreen, window]);
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
      className={
        "rounded-2xl border-2 border-dashed p-10 text-center transition cursor-pointer " +
        (dragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/30")
      }
    >
      <MediaFolderIcon />
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.wav,.ogg,.mp4,.mkv,.avi,.mov,.webm"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      {/* Fullscreen overlay for when dragging */}
      {fullScreen && dragActive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/10 border-4 border-primary border-dashed"
          onClick={() => inputRef.current?.click()}
        >
          <MediaFolderIcon />
        </div>
      )}
    </div>
  );
}
