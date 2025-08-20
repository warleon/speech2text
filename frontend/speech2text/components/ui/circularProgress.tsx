"use client";
import * as React from "react";
import { motion } from "framer-motion";

export function CircularProgress({
  value,
  color,
  size = 180,
  thickness = 12,
  duration = 1,
  action = "Processing",
  activated = true,
  deactivatedColor = "hsl(220, 10%, 70%)",
}: {
  value: number;
  size?: number;
  thickness?: number;
  duration?: number;
  action?: string;
  color: string;
  activated?: boolean;
  deactivatedColor?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);
  const center = size / 2;

  const ringColor = activated ? color : deactivatedColor;
  const textColor = activated ? "text-black" : "text-gray-400";

  return (
    <motion.div
      className="relative inline-block select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Loading progress: ${clamped}%`}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block overflow-visible"
        style={{ transform: "rotate(-90deg)" }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="4"
              floodColor={color}
              floodOpacity="0.8"
            />
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="10"
              floodColor={color}
              floodOpacity="0.6"
            />
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="hsl(220, 10%, 85%)"
          strokeWidth={thickness}
        />
        {/* Progress ring */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={ringColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration, ease: "easeInOut" }}
          filter={activated ? "url(#glow)" : undefined}
        />
      </motion.svg>

      {/* Inner circle with centered content */}
      <motion.div
        className="absolute rounded-full flex items-center justify-center bg-white border shadow-sm"
        style={{ inset: thickness * 1.15 }}
      >
        <div className={`text-center leading-tight ${textColor}`}>
          <div className="text-3xl font-semibold tabular-nums">
            {clamped}
            <span className="opacity-70 text-lg">%</span>
          </div>
          <div className="text-xs">{action}</div>
        </div>
      </motion.div>
    </motion.div>
  );
}
