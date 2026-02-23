import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BadgePopupState {
  name: string;
  emoji: string;
}

const useBadgePopup = () => {
  const [popup, setPopup] = useState<BadgePopupState | null>(null);

  const showBadgePopup = useCallback((name: string, emoji = "🏆") => {
    setPopup({ name, emoji });
    setTimeout(() => setPopup(null), 3000);
  }, []);

  const BadgePopup = (
    <AnimatePresence>
      {popup && (
        <motion.div
          className="fixed bottom-6 right-6 z-50 pointer-events-none"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
        >
          <div className="pointer-events-auto bg-background border border-primary/30 rounded-xl px-5 py-3 shadow-lg shadow-primary/10 flex items-center gap-3">
            <motion.span
              className="text-2xl"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 250, damping: 12, delay: 0.1 }}
            >
              {popup.emoji}
            </motion.span>
            <div>
              <p className="text-xs font-medium text-primary uppercase tracking-wider">Badge Earned!</p>
              <p className="text-sm font-semibold">{popup.name}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { showBadgePopup, BadgePopup };
};

export default useBadgePopup;
