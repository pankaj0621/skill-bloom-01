import { toast } from "sonner";
import { CheckCircle, AlertTriangle, Info, XCircle } from "lucide-react";

/**
 * Consistent toast helpers with friendly messages and icons
 */
export const feedback = {
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },

  error: (message: string, options?: { description?: string; retry?: () => void }) => {
    toast.error(message, {
      description: options?.description,
      action: options?.retry
        ? { label: "Retry", onClick: options.retry }
        : undefined,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },

  /** Show a network error toast with automatic retry action */
  networkError: (retry?: () => void) => {
    toast.error("Connection failed", {
      description: "Please check your internet connection and try again.",
      action: retry ? { label: "Retry", onClick: retry } : undefined,
    });
  },

  /** Show a save success toast */
  saved: (what?: string) => {
    toast.success(what ? `${what} saved successfully` : "Changes saved successfully");
  },

  /** Show a delete success toast */
  deleted: (what?: string) => {
    toast.success(what ? `${what} deleted` : "Deleted successfully");
  },
};
