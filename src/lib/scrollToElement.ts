/**
 * Smoothly scroll an element into view after an instant action, so the user
 * doesn't have to hunt for the updated row/card. Safe to call when the element
 * doesn't exist yet — uses a short rAF + setTimeout chain to wait for the DOM
 * update from React Query's optimistic cache write.
 */
export function scrollToElement(
  selector: string,
  options: { block?: ScrollLogicalPosition; offset?: number; flash?: boolean } = {}
) {
  const { block = "center", offset = 0, flash = true } = options;

  const attempt = (tries = 0) => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) {
      if (tries < 6) requestAnimationFrame(() => setTimeout(() => attempt(tries + 1), 40));
      return;
    }

    if (offset) {
      const rect = el.getBoundingClientRect();
      const top = window.scrollY + rect.top - offset;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      el.scrollIntoView({ behavior: "smooth", block });
    }

    // Subtle highlight pulse so the eye lands on what changed
    if (flash) {
      el.classList.add("ring-2", "ring-primary", "ring-offset-2", "transition-all");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
      }, 1200);
    }
  };

  requestAnimationFrame(() => setTimeout(attempt, 30));
}
