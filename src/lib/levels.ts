export type Level = "Beginner" | "Intermediate" | "Advanced";

export function getLevel(completedCount: number, totalCount: number): Level {
  if (totalCount === 0) return "Beginner";
  const pct = (completedCount / totalCount) * 100;
  if (pct >= 67) return "Advanced";
  if (pct >= 34) return "Intermediate";
  return "Beginner";
}

export function getLevelColor(level: Level): string {
  switch (level) {
    case "Advanced": return "text-emerald-600 bg-emerald-100";
    case "Intermediate": return "text-blue-600 bg-blue-100";
    case "Beginner": return "text-amber-600 bg-amber-100";
  }
}
