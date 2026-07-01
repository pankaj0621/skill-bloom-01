import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import appIcon from "@/assets/app-icon-512.png";

// localStorage-based so freshly-opened tabs within the same session don't
// re-play the splash. TTL keeps it feeling fresh after a long absence.
const SPLASH_KEY = "spct-splash-shown-at";
const SPLASH_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const shouldSkipSplash = () => {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(SPLASH_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < SPLASH_TTL_MS;
  } catch {
    return false;
  }
};

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [visible, setVisible] = useState(() => !shouldSkipSplash());
  // Guard against StrictMode double-invoke firing onComplete twice.
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  };

  useEffect(() => {
    if (!visible) {
      // Already shown recently — hand control back on next frame so parent
      // doesn't paint a splash-less flash first.
      const id = requestAnimationFrame(finish);
      return () => cancelAnimationFrame(id);
    }
    try {
      localStorage.setItem(SPLASH_KEY, String(Date.now()));
    } catch {
      /* storage disabled — ignore */
    }
    const timer = setTimeout(() => setVisible(false), 1600);
    // finish() is called from onExitComplete so the fade-out finishes first.
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence onExitComplete={finish}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <motion.img
            src={appIcon}
            alt="Level Up"
            className="w-24 h-24 rounded-2xl shadow-2xl"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
          />
          <motion.h1
            className="mt-5 text-xl font-bold text-foreground tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.35 }}
          >
            Level Up
          </motion.h1>
          <motion.p
            className="mt-1 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.35 }}
          >
            Track your growth journey
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
