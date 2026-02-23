import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedProgressProps {
  value: number;
  className?: string;
}

const AnimatedProgress = ({ value, className }: AnimatedProgressProps) => {
  const prevValue = useRef(value);
  const [delta, setDelta] = useState<number | null>(null);
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    const diff = value - prevValue.current;
    if (diff > 0) {
      setDelta(diff);
      setGlowing(true);
      const t1 = setTimeout(() => setDelta(null), 1500);
      const t2 = setTimeout(() => setGlowing(false), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevValue.current = value;
  }, [value]);

  // Update ref after effect runs
  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary transition-shadow duration-500",
          glowing && "shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
        )}
      >
        <motion.div
          className={cn(
            "h-full rounded-full bg-primary",
            glowing && "brightness-125"
          )}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
      <AnimatePresence>
        {delta !== null && (
          <motion.span
            className="absolute -top-5 right-0 text-xs font-semibold text-primary"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            +{delta}%
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedProgress;
