import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import appIcon from "@/assets/app-icon-512.png";

const SPLASH_KEY = "spct-splash-shown";

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  // Splash sirf tab dikhaye jab session mein pehli baar app khula ho.
  // Refresh/route change pe dobara na dikhe.
  const alreadyShown =
    typeof window !== "undefined" && sessionStorage.getItem(SPLASH_KEY) === "1";
  const [visible, setVisible] = useState(!alreadyShown);

  useEffect(() => {
    if (alreadyShown) {
      onComplete();
      return;
    }
    try {
      sessionStorage.setItem(SPLASH_KEY, "1");
    } catch {
      /* storage disabled — ignore */
    }
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // wait for fade-out
    }, 1800);
    return () => clearTimeout(timer);
  }, [onComplete, alreadyShown]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
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
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            Level Up
          </motion.h1>
          <motion.p
            className="mt-1 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            Track your growth journey
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
