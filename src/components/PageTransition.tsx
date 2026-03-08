import { ReactNode, memo } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const prefersReducedMotion = typeof window !== "undefined"
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
  : false;

const pageVariants = prefersReducedMotion
  ? { initial: {}, animate: {}, exit: {} }
  : {
      initial: { opacity: 0, y: 12, scale: 0.99 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: -8, scale: 0.99 },
    };

const pageTransition = prefersReducedMotion
  ? { duration: 0 }
  : {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth feel
    };

const PageTransition = memo(({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
});

PageTransition.displayName = "PageTransition";

export default PageTransition;
