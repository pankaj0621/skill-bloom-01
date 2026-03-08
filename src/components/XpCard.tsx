import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import AnimatedCounter from "@/components/AnimatedCounter";
import AnimatedProgress from "@/components/AnimatedProgress";
import { getXpLevel, getNextMilestone, getXpMilestone } from "@/components/XpMilestoneToast";

interface XpCardProps {
  xp: number;
  weeklyXp: number;
}

const XpCard = ({ xp, weeklyXp }: XpCardProps) => {
  const level = getXpLevel(xp);
  const nextMilestone = getNextMilestone(xp);
  const currentMilestone = getXpMilestone(xp);
  const progressToNext = nextMilestone
    ? Math.round((xp / nextMilestone.threshold) * 100)
    : 100;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-md overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              className="p-1.5 rounded-full bg-amber-500/10"
            >
              <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
            </motion.div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <AnimatedCounter value={xp} className="text-2xl font-bold" />
                <span className="text-sm text-muted-foreground">XP</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Level {level}</p>
            </div>
          </div>
          {weeklyXp > 0 && (
            <div className="text-right">
              <p className="text-sm font-semibold text-primary">+{weeklyXp}</p>
              <p className="text-[10px] text-muted-foreground">this week</p>
            </div>
          )}
        </div>

        {currentMilestone && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{currentMilestone}</p>
        )}

        {nextMilestone && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Next: {nextMilestone.label}</span>
              <span>{xp}/{nextMilestone.threshold}</span>
            </div>
            <AnimatedProgress value={progressToNext} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default XpCard;
