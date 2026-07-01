// Global navigate ref — set by <NavigateInjector /> inside <BrowserRouter>.
// Lets hooks/utilities that live outside the router tree (or that render
// before it) navigate without forcing a full page reload.
import type { NavigateFunction } from "react-router-dom";

let navigateRef: NavigateFunction | null = null;

export const setGlobalNavigate = (fn: NavigateFunction) => {
  navigateRef = fn;
};

export const globalNavigate = (to: string) => {
  if (navigateRef) {
    navigateRef(to);
  } else if (typeof window !== "undefined") {
    // Fallback: router not mounted yet
    window.location.href = to;
  }
};
