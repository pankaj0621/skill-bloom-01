/**
 * Simple client-side rate limiter using sessionStorage.
 * Tracks attempts per action key and blocks after maxAttempts within windowMs.
 */
interface RateLimitEntry {
  attempts: number[];
}

const STORAGE_KEY = "auth_rate_limit";

function getEntries(): Record<string, RateLimitEntry> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveEntries(entries: Record<string, RateLimitEntry>) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function checkRateLimit(
  action: string,
  maxAttempts: number = 5,
  windowMs: number = 60_000
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entries = getEntries();
  const entry = entries[action] || { attempts: [] };

  // Clean old attempts outside the window
  entry.attempts = entry.attempts.filter((t) => now - t < windowMs);

  if (entry.attempts.length >= maxAttempts) {
    const oldestInWindow = entry.attempts[0];
    const retryAfterMs = windowMs - (now - oldestInWindow);
    return { allowed: false, retryAfterMs };
  }

  entry.attempts.push(now);
  entries[action] = entry;
  saveEntries(entries);
  return { allowed: true, retryAfterMs: 0 };
}

export function formatRetryTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes > 1 ? "s" : ""}`;
}
