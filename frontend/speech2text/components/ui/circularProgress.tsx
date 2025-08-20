"use client";
import * as React from "react";
import { motion } from "framer-motion";

// Reusable SVG-based circular progress with a centered inner circle for text/content
// Works great alongside shadcn/ui. Drop it anywhere in your app.
//
// Props:
// - value: number from 0 to 100
// - size: overall square size in px
// - thickness: stroke width of the outer progress ring
// - trackClassName: Tailwind classes for the background track ring
// - progressClassName: Tailwind classes for the animated progress ring
// - innerClassName: Tailwind classes for the inner circle container
// - roundedCaps: whether the ring ends should be rounded
// - label: string | React.ReactNode – what's shown in the center (defaults to the % value)
// - animateFrom: initial value for entry animation (default 0)
// - duration: seconds for animation (default 1)
// - ariaLabel: accessible label text
export function CircularProgress({
  value = 65,
  size = 180,
  thickness = 12,
  trackClassName = "stroke-muted",
  progressClassName = "stroke-primary",
  innerClassName = "bg-background border border-border shadow-sm",
  roundedCaps = true,
  label,
  animateFrom = 0,
  duration = 1,
  ariaLabel = "Loading progress",
}: {
  value?: number;
  size?: number;
  thickness?: number;
  trackClassName?: string;
  progressClassName?: string;
  innerClassName?: string;
  roundedCaps?: boolean;
  label?: React.ReactNode;
  animateFrom?: number;
  duration?: number;
  ariaLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  // We rotate -90deg so progress starts at the top (12 o'clock)
  const center = size / 2;

  return (
    <div
      className="relative inline-block select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${ariaLabel}: ${clamped}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          className={trackClassName}
          fill="transparent"
          strokeWidth={thickness}
        />
        {/* Progress ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          className={progressClassName}
          fill="transparent"
          strokeWidth={thickness}
          strokeLinecap={roundedCaps ? "round" : "butt"}
          strokeDasharray={circumference}
          initial={{
            strokeDashoffset:
              circumference *
              (1 - Math.max(0, Math.min(100, animateFrom)) / 100),
          }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration, ease: "easeInOut" }}
        />
      </svg>

      {/* Inner circle with centered content */}
      <div
        className={`absolute inset-[${
          thickness * 1.15
        }px] rounded-full flex items-center justify-center ${innerClassName}`}
        style={{
          inset: thickness * 1.15,
        }}
      >
        <div className="text-center leading-tight">
          {label ?? (
            <>
              <div className="text-3xl font-semibold tabular-nums">
                {clamped}
                <span className="opacity-70 text-lg">%</span>
              </div>
              <div className="text-xs text-muted-foreground">Processing</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
