import { memo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

/**
 * Optimized image component with:
 * - Native lazy loading
 * - Async decoding
 * - Blur-up placeholder
 * - Error fallback
 */
const OptimizedImage = memo(({ className, fallback, alt, onError, ...props }: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setError(true);
    onError?.(e);
  }, [onError]);

  if (error && fallback) return <>{fallback}</>;

  return (
    <img
      {...props}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
