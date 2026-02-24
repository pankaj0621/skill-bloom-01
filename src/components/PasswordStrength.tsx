import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
}

const getStrength = (password: string) => {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
};

const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const colors = [
  "bg-destructive",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-emerald-400",
  "bg-emerald-500",
];

const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = useMemo(() => getStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i < strength ? colors[strength] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[strength]}</p>
    </div>
  );
};

export default PasswordStrength;
