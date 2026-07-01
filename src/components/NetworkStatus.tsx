import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Verify real connectivity with a lightweight no-cors HEAD ping.
 * `navigator.onLine` is unreliable on mobile — it flips to false when
 * the OS throttles a backgrounded tab and stays false briefly after the
 * tab is foregrounded again, causing a spurious "offline" banner.
 */
async function verifyOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    await fetch("/favicon.ico?_ping=" + Date.now(), {
      method: "HEAD",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return true;
  } catch {
    return false;
  }
}

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const wasOfflineRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const goOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowBanner(true);
      clearHideTimer();
      hideTimerRef.current = setTimeout(() => setShowBanner(false), 2500);
    } else {
      setShowBanner(false);
    }
  }, []);

  const goOffline = useCallback(() => {
    setIsOnline(false);
    wasOfflineRef.current = true;
    setShowBanner(true);
    clearHideTimer();
  }, []);

  // Only mark offline if a real connectivity probe fails. Prevents the
  // false "offline" flash when a mobile tab is being backgrounded/foregrounded.
  const handleBrowserOffline = useCallback(async () => {
    const ok = await verifyOnline();
    if (ok) goOnline();
    else goOffline();
  }, [goOnline, goOffline]);

  const handleBrowserOnline = useCallback(async () => {
    const ok = await verifyOnline();
    if (ok) goOnline();
  }, [goOnline]);

  const handleVisibility = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    // Coming back from background — re-verify so a stale offline banner clears.
    const ok = await verifyOnline();
    if (ok) goOnline();
    else goOffline();
  }, [goOnline, goOffline]);

  useEffect(() => {
    window.addEventListener("online", handleBrowserOnline);
    window.addEventListener("offline", handleBrowserOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    return () => {
      window.removeEventListener("online", handleBrowserOnline);
      window.removeEventListener("offline", handleBrowserOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      clearHideTimer();
    };
  }, [handleBrowserOnline, handleBrowserOffline, handleVisibility]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium shadow-lg",
            isOnline
              ? "bg-green-500 text-white"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Back online!</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 animate-pulse" />
              <span>No internet connection</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                className="h-7 px-2 text-xs bg-white/20 hover:bg-white/30 text-inherit ml-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatus;
