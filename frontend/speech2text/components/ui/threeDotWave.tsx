import { cn } from "@/lib/utils";
import { HTMLMotionProps, motion } from "framer-motion";

export function ThreeDotWave({ className, style }: HTMLMotionProps<"span">) {
  const dots = [0, 1, 2];

  return (
    <div className="flex gap-2 items-center justify-center">
      {dots.map((i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: [0, -5, 0] }}
          exit={{ opacity: 0, y: 5 }}
          transition={{
            duration: 1.0,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.2,
            ease: "easeInOut",
          }}
          className={cn("w-2 h-2 rounded-full bg-primary", className)}
          style={style}
        />
      ))}
    </div>
  );
}
