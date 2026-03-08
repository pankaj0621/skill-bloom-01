import { memo } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface ErrorAlertProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string; icon: typeof AlertTriangle }> = {
  network: {
    title: "Connection issue",
    message: "Couldn't reach the server. Check your internet and try again.",
    icon: WifiOff,
  },
  default: {
    title: "Something went wrong",
    message: "We couldn't load this data. Please try again.",
    icon: AlertTriangle,
  },
};

function getErrorInfo(error?: unknown) {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
      return ERROR_MESSAGES.network;
    }
  }
  return ERROR_MESSAGES.default;
}

/** Reusable error display with optional retry button */
const ErrorAlert = memo(({ title, message, onRetry, retryLabel = "Try again", compact = false }: ErrorAlertProps) => {
  const info = ERROR_MESSAGES.default;
  const Icon = AlertTriangle;
  const displayTitle = title || info.title;
  const displayMessage = message || info.message;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
        <Icon className="h-4 w-4 text-destructive shrink-0" />
        <p className="text-foreground flex-1">{displayMessage}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" />
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center text-center py-10 px-6 gap-4">
          <div className="p-3 rounded-full bg-destructive/10">
            <Icon className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">{displayTitle}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{displayMessage}</p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2 mt-2">
              <RefreshCw className="h-4 w-4" />
              {retryLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

ErrorAlert.displayName = "ErrorAlert";

/** Helper to create error alert props from react-query error */
export function getQueryErrorProps(error: unknown): { title: string; message: string } {
  const info = getErrorInfo(error);
  return { title: info.title, message: info.message };
}

export default ErrorAlert;
