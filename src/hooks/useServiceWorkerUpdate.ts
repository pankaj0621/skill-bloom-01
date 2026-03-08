import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Detects when a new service worker is available and prompts the user to refresh.
 */
const useServiceWorkerUpdate = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handleControllerChange = () => {
      toast.info("App updated! Tap to refresh for the latest version.", {
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => window.location.reload(),
        },
      });
    };

    // Listen for new SW taking control
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Also check for waiting worker on existing registration
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // If there's already a waiting SW
      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      // Detect future updates
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            toast.info("New version available!", {
              duration: 15000,
              action: {
                label: "Update Now",
                onClick: () => {
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                },
              },
            });
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);
};

export default useServiceWorkerUpdate;
