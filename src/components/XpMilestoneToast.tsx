import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface XpMilestoneToastProps {
  xp: number;
  milestone?: string | null;
}

const XP_MILESTONES = [
  { threshold: 100, label: "XP Rookie 🌱" },
  { threshold: 250, label: "XP Explorer 🧭" },
  { threshold: 500, label: "XP Warrior ⚔️" },
  { threshold: 1000, label: "XP Master 🏆" },
  { threshold: 2500, label: "XP Legend 🌟" },
];

export function getXpMilestone(xp: number): string | null {
  for (let i = XP_MILESTONES.length - 1; i >= 0; i--) {
    if (xp >= XP_MILESTONES[i].threshold) return XP_MILESTONES[i].label;
  }
  return null;
}

export function getNextMilestone(xp: number): { label: string; threshold: number } | null {
  for (const m of XP_MILESTONES) {
    if (xp < m.threshold) return m;
  }
  return null;
}

export function getXpLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

const XpMilestoneToast = ({ xp, milestone }: XpMilestoneToastProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (milestone) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 4000);
      return () => clearTimeout(t);
    }
  }, [milestone]);

  return (
    <AnimatePresence>
      {visible && milestone && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-card border shadow-2xl">
            <motion.div
              animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6 }}
            >
              <Zap className="h-6 w-6 text-amber-500 fill-amber-500" />
            </motion.div>
            <div>
              <p className="text-sm font-bold">{milestone}</p>
              <p className="text-[11px] text-muted-foreground">{xp} XP earned</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XpMilestoneToast;
