import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Detects when a new service worker is actually waiting (i.e. a real update
 * shipped while the user already had a controller) and prompts to refresh.
 *
 * Deliberately does NOT:
 *  - auto-post SKIP_WAITING on load (that fires controllerchange on first
 *    install and causes a phantom "App updated" banner)
 *  - show a toast on the raw `controllerchange` event (same reason)
 */
const useServiceWorkerUpdate = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const promptUpdate = (worker: ServiceWorker) => {
      toast.info("New version available", {
        duration: 15000,
        action: {
          label: "Update",
          onClick: () => {
            worker.postMessage({ type: "SKIP_WAITING" });
            // Reload once the new SW takes control
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => window.location.reload(),
              { once: true }
            );
          },
        },
      });
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // A worker was already waiting from a previous session — only prompt
      // if we actually have a controller (i.e. not a first-ever install).
      if (reg.waiting && navigator.serviceWorker.controller) {
        promptUpdate(reg.waiting);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            promptUpdate(newWorker);
          }
        });
      });
    });
  }, []);
};

export default useServiceWorkerUpdate;
