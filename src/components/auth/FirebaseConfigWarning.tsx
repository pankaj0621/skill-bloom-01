import { AlertTriangle } from "lucide-react";
import { FirebaseConfigIssue, FirebaseConfigIssueReason } from "@/lib/firebaseConfigCheck";

interface Props {
  issues: FirebaseConfigIssue[];
}

const reasonLabel: Record<FirebaseConfigIssueReason, string> = {
  missing: "not set",
  placeholder: "still a placeholder",
  secret_reference: "uses a @secret: reference (not supported in Vite env vars)",
  trailing_space: "has a trailing space",
  leading_space: "has a leading space",
};

function getApiKeyWarning(issues: FirebaseConfigIssue[]): string | null {
  const apiKeyIssues = issues.filter((i) => i.key === "VITE_FIREBASE_API_KEY");
  if (apiKeyIssues.length === 0) return null;

  const hasSecretRef = apiKeyIssues.some((i) => i.reason === "secret_reference");
  const hasSpace = apiKeyIssues.some(
    (i) => i.reason === "trailing_space" || i.reason === "leading_space"
  );

  if (hasSecretRef) {
    return "VITE_FIREBASE_API_KEY looks like a secret reference. Firebase Web API keys are public identifiers, so paste the real key value directly into .env.";
  }
  if (hasSpace) {
    return "VITE_FIREBASE_API_KEY has extra spaces. Remove leading/trailing spaces or the Firebase SDK will reject it.";
  }
  return null;
}

/** Inline warning shown when Firebase env vars are missing or contain placeholders. */
const FirebaseConfigWarning = ({ issues }: Props) => {
  if (issues.length === 0) return null;

  const apiKeyWarning = getApiKeyWarning(issues);

  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-2"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-destructive">Phone sign-in unavailable</p>
          <p className="text-xs text-muted-foreground">
            Firebase config is incomplete. Update the following in your{" "}
            <code className="text-[11px] rounded bg-muted px-1 py-0.5">.env</code>{" "}
            and redeploy:
          </p>
        </div>
      </div>

      <ul className="text-xs space-y-1 pl-6 list-disc text-muted-foreground">
        {issues.map((i) => (
          <li key={`${i.key}-${i.reason}`}>
            <code className="text-[11px]">{i.key}</code>{" "}
            <span className="text-destructive/80">({reasonLabel[i.reason]})</span>
            {i.hint && <span className="block text-[11px] opacity-80">{i.hint}</span>}
          </li>
        ))}
      </ul>

      {apiKeyWarning && (
        <p className="text-[11px] text-destructive/90 pl-6 font-medium">{apiKeyWarning}</p>
      )}

      <p className="text-[11px] text-muted-foreground pl-6">
        Get values from Firebase Console → Project Settings → General → Your apps.
      </p>
    </div>
  );
};

export default FirebaseConfigWarning;
