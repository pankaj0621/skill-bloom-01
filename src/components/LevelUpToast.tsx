import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Level } from "@/lib/levels";

const levelEmoji: Record<Level, string> = {
  Beginner: "🌱",
  Intermediate: "⚡",
  Advanced: "🏆",
};

const LevelUpToast = () => {
  const [visible, setVisible] = useState(false);
  const [level, setLevel] = useState<Level>("Beginner");

  const trigger = useCallback((newLevel: Level) => {
    setLevel(newLevel);
    setVisible(true);
    setTimeout(() => setVisible(false), 3500);
  }, []);

  return {
    triggerLevelUp: trigger,
    LevelUpAnimation: (
      <AnimatePresence>
        {visible && (
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Backdrop glow */}
            <motion.div
              className="absolute inset-0 bg-primary/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Particles */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i / 12) * 360;
              const rad = (angle * Math.PI) / 180;
              const dist = 120 + Math.random() * 60;
              return (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-primary"
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(rad) * dist,
                    y: Math.sin(rad) * dist,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 1.2, delay: 0.1 + i * 0.03, ease: "easeOut" }}
                />
              );
            })}

            {/* Main card */}
            <motion.div
              className="relative bg-background border border-primary/30 rounded-2xl px-8 py-6 shadow-2xl shadow-primary/20 text-center pointer-events-auto"
              initial={{ scale: 0.5, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <motion.div
                className="text-4xl mb-2"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.15 }}
              >
                {levelEmoji[level]}
              </motion.div>
              <motion.p
                className="text-sm font-medium text-primary uppercase tracking-wider"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Level Up!
              </motion.p>
              <motion.p
                className="text-xl font-bold mt-1"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                You reached {level}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    ),
  };
};

export default LevelUpToast;
