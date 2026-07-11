import { AlertTriangle } from "lucide-react";
import { FirebaseConfigIssue } from "@/lib/firebaseConfigCheck";

interface Props {
  issues: FirebaseConfigIssue[];
}

/** Inline warning shown when Firebase env vars are missing or contain placeholders. */
const FirebaseConfigWarning = ({ issues }: Props) => {
  if (issues.length === 0) return null;
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
            <code className="text-[11px] rounded bg-muted px-1 py-0.5">.env</code> and redeploy:
          </p>
        </div>
      </div>
      <ul className="text-xs space-y-1 pl-6 list-disc text-muted-foreground">
        {issues.map((i) => (
          <li key={i.key}>
            <code className="text-[11px]">{i.key}</code>{" "}
            <span className="text-destructive/80">
              ({i.reason === "missing" ? "not set" : "still a placeholder"})
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground pl-6">
        Get values from Firebase Console → Project Settings → General → Your apps.
      </p>
    </div>
  );
};

export default FirebaseConfigWarning;
