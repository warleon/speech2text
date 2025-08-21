import React from "react";
import { FilePlay, FileAudio2, FileVideo2 } from "lucide-react";

/**
 * ComposedMediaFolderIcon
 *
 * A large, single React component that composes four lucide icons
 * into one: three file icons fanned
 * on top (like a hand of cards) to look as if they popped out of the folder.
 *
 * Props
 * - size: overall square size in px (default 192)
 * - strokeWidth: forwarded to Lucide icons (default 1.75)
 * - className: additional classes for the outer wrapper
 *
 * Usage: <ComposedMediaFolderIcon size={220} className="text-gray-900" />
 */
export default function MediaFolderIcon({
  size = 192,
  strokeWidth = 1.75,
  className = "",
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  // Derived sizes (keep icons crisp and proportional to the canvas)
  const fileSize = Math.round(size * 0.35); // each file icon size

  // Common visual touches
  const shadow = "drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]";
  const centerOffset = 0.07;

  return (
    <div
      className={`relative inline-block   ${className}`}
      style={{ width: size, height: size * 0.4 }}
      aria-label="Composed icon: folder with fanned media files"
      role="img"
    >
      {/* Left file: FilePlay */}
      <div
        className={`absolute ${shadow}`}
        style={{
          left: size * -0.03 + size * centerOffset,
          top: size * 0.05,
          transform: "rotate(-12deg)",
          transformOrigin: "bottom center",
        }}
      >
        <FilePlay
          width={fileSize}
          height={fileSize}
          strokeWidth={strokeWidth}
        />
      </div>

      {/* Middle file: FileAudio2 (slightly higher, centered) */}
      <div
        className={`absolute ${shadow}`}
        style={{
          left: size * 0.26 + size * centerOffset,
          top: size * 0.01,
          transform: "rotate(0deg)",
          transformOrigin: "bottom center",
        }}
      >
        <FileVideo2
          width={fileSize}
          height={fileSize}
          strokeWidth={strokeWidth}
        />
      </div>

      {/* Right file: FileVideo2 */}
      <div
        className={`absolute ${shadow}`}
        style={{
          right: size * 0.1 - size * centerOffset,
          top: size * 0.05,
          transform: "rotate(12deg)",
          transformOrigin: "bottom center",
        }}
      >
        <FileAudio2
          width={fileSize}
          height={fileSize}
          strokeWidth={strokeWidth}
        />
      </div>
    </div>
  );
}
