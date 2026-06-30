import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowRight, Sparkles, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TodaysFocusProps {
  nextSkillName?: string;
  nextTrackName?: string;
  difficulty?: string;
  completed: number;
  total: number;
}

const TodaysFocus = ({ nextSkillName, nextTrackName, difficulty, completed, total }: TodaysFocusProps) => {
  const navigate = useNavigate();
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(total - completed, 0);

  if (!nextSkillName) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-500/10 p-3">
              <Sparkles className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">All caught up</h3>
              <p className="text-xs text-muted-foreground">Pick a new track to keep the momentum going.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/roadmap")}>
              Browse tracks
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="relative overflow-hidden border-primary/20">
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/15 p-1.5">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Today's focus</p>
                <h3 className="text-base font-bold leading-tight">{nextSkillName}</h3>
              </div>
            </div>
            {difficulty && (
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                {difficulty}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
            {nextTrackName && (
              <span className="truncate">{nextTrackName}</span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {remaining} left · {pct}% done
            </span>
          </div>

          <Button
            size="sm"
            className="w-full sm:w-auto group"
            onClick={() => navigate("/roadmap")}
          >
            Start now
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TodaysFocus;
