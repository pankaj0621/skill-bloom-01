import React from "react";
import { cn } from "@/lib/utils";

interface ImmersiveLayoutProps {
  children: React.ReactNode;
  /** Add a subtle primary→background gradient backdrop */
  gradient?: boolean;
  /** Center content vertically + horizontally (good for forms/onboarding) */
  center?: boolean;
  /** Constrain inner content width (e.g. "max-w-3xl") */
  maxWidth?: string;
  /** Extra classes for the inner content wrapper */
  className?: string;
}

/**
 * Full-screen immersive wrapper for pages where the global Navbar is hidden
 * (onboarding, AI mentor chat, focused flows). Handles:
 *  - 100dvh height (mobile keyboard-safe)
 *  - safe-area padding on iOS notch + home indicator
 *  - optional centered layout for single-card screens
 *  - optional ambient gradient backdrop
 *
 * Senior-dev rationale: one wrapper = consistent immersive feel across all
 * "navbar-less" pages, and a single place to tweak chrome/safe-areas later.
 */
const ImmersiveLayout: React.FC<ImmersiveLayoutProps> = ({
  children,
  gradient = true,
  center = false,
  maxWidth,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "min-h-screen min-h-[100dvh]",
        gradient && "bg-gradient-to-br from-background via-background to-primary/5",
        !gradient && "bg-background",
        center && "flex items-center justify-center"
      )}
      style={{
        paddingTop: "max(env(safe-area-inset-top), 0px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        paddingLeft: "max(env(safe-area-inset-left), 0px)",
        paddingRight: "max(env(safe-area-inset-right), 0px)",
      }}
    >
      {/* Ambient glow accents — purely decorative, pointer-events disabled */}
      {gradient && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
          />
        </>
      )}

      <div
        className={cn(
          "relative z-10 w-full",
          maxWidth && `${maxWidth} mx-auto`,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default ImmersiveLayout;
