import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import EmptyState from "@/components/EmptyState";
import { SearchX } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The page you're looking for doesn't exist or has been moved."
        actionLabel="Back to Dashboard"
        onAction={() => window.location.href = "/"}
      />
    </div>
  );
};

export default NotFound;
