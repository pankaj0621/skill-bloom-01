/**
 * Validates VITE_FIREBASE_* env vars at runtime.
 * Detects missing values, unreplaced placeholders (e.g. "YOUR_FIREBASE_API_KEY"),
 * secret references (e.g. "@secret:GOOGLE_API_KEY"), and trailing whitespace.
 */
export type FirebaseConfigIssueReason =
  | "missing"
  | "placeholder"
  | "secret_reference"
  | "trailing_space"
  | "leading_space";

export type FirebaseConfigIssue = {
  key: string;
  value: string | undefined;
  reason: FirebaseConfigIssueReason;
  hint?: string;
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
  /^@secret:/i,
  /YOUR_FIREBASE_API_KEY/,
  /YOUR_PROJECT_ID/,
  /YOUR_APP_ID/,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function detectWhitespace(value: string): FirebaseConfigIssueReason | null {
  if (/\s$/.test(value)) return "trailing_space";
  if (/^\s/.test(value)) return "leading_space";
  return null;
}

export function checkFirebaseConfig(): FirebaseConfigIssue[] {
  const env = import.meta.env as Record<string, string | undefined>;
  const issues: FirebaseConfigIssue[] = [];

  for (const key of REQUIRED_KEYS) {
    const rawValue = env[key];
    const value = rawValue?.trim();

    if (!value) {
      issues.push({
        key,
        value: rawValue,
        reason: "missing",
        hint: "Set a real value from Firebase Console → Project Settings → General → Your apps.",
      });
      continue;
    }

    // Detect whitespace that will break the Firebase SDK (API keys are especially sensitive).
    const whitespaceReason = detectWhitespace(rawValue);
    if (whitespaceReason) {
      issues.push({
        key,
        value: rawValue,
        reason: whitespaceReason,
        hint: "Remove surrounding spaces from the value in your .env file.",
      });
      // Still check for other problems below, so we surface the most serious issue.
    }

    if (isPlaceholder(value)) {
      const isSecretRef = value.startsWith("@secret:");
      issues.push({
        key,
        value: rawValue,
        reason: isSecretRef ? "secret_reference" : "placeholder",
        hint: isSecretRef
          ? "@secret: references are not resolved in Vite env vars. Paste the actual public Firebase Web API key."
          : "Replace the placeholder with a real Firebase value.",
      });
    }
  }

  return issues;
}

export function isFirebaseConfigured(): boolean {
  return checkFirebaseConfig().length === 0;
}
