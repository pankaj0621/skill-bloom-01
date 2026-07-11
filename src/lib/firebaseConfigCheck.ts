/**
 * Validates VITE_FIREBASE_* env vars at runtime.
 * Detects missing values and unreplaced placeholders (e.g. "YOUR_FIREBASE_API_KEY").
 */
export type FirebaseConfigIssue = {
  key: string;
  value: string | undefined;
  reason: "missing" | "placeholder";
};

const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const PLACEHOLDER_PATTERNS = [
  /^YOUR_/i,
  /^your-/i,
  /^your\./i,
  /xxxxxxxx/i,
  /^0+$/,
  /^G-XXXX/i,
  /^1:0+:/,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

export function checkFirebaseConfig(): FirebaseConfigIssue[] {
  const env = import.meta.env as Record<string, string | undefined>;
  const issues: FirebaseConfigIssue[] = [];
  for (const key of REQUIRED_KEYS) {
    const value = env[key];
    if (!value || !value.trim()) {
      issues.push({ key, value, reason: "missing" });
    } else if (isPlaceholder(value.trim())) {
      issues.push({ key, value, reason: "placeholder" });
    }
  }
  return issues;
}

export function isFirebaseConfigured(): boolean {
  return checkFirebaseConfig().length === 0;
}
