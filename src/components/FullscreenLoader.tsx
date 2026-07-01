import { motion } from "framer-motion";

/**
 * Shared full-screen loader. Used by ProtectedRoute, route Suspense
 * fallback, and Onboarding's "already-complete redirect" state so the
 * transitions between splash → auth check → onboarding/dashboard all
 * look like the same continuous surface (no flicker, no layout jump).
 */
const FullscreenLoader = ({ label = "Loading..." }: { label?: string }) => (
  <motion.div
    className="min-h-screen flex items-center justify-center bg-background"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
  >
    <div className="space-y-4 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
      <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
    </div>
  </motion.div>
);

export default FullscreenLoader;
