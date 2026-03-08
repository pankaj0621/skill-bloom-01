import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STREAMS = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

interface SearchFiltersProps {
  selectedStream: string | null;
  selectedLevel: string | null;
  onStreamChange: (stream: string | null) => void;
  onLevelChange: (level: string | null) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

const SearchFilters = ({
  selectedStream,
  selectedLevel,
  onStreamChange,
  onLevelChange,
  showFilters,
  onToggleFilters,
}: SearchFiltersProps) => {
  const hasActive = !!selectedStream || !!selectedLevel;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onToggleFilters}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {hasActive && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {(selectedStream ? 1 : 0) + (selectedLevel ? 1 : 0)}
            </span>
          )}
        </Button>
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground gap-1 h-7"
            onClick={() => {
              onStreamChange(null);
              onLevelChange(null);
            }}
          >
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 overflow-hidden"
          >
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Stream</p>
              <div className="flex flex-wrap gap-1.5">
                {STREAMS.map((s) => (
                  <Badge
                    key={s}
                    variant={selectedStream === s ? "default" : "outline"}
                    className="cursor-pointer text-[11px] transition-colors hover:bg-accent"
                    onClick={() => onStreamChange(selectedStream === s ? null : s)}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Level</p>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((l) => (
                  <Badge
                    key={l}
                    variant={selectedLevel === l ? "default" : "outline"}
                    className="cursor-pointer text-[11px] transition-colors hover:bg-accent"
                    onClick={() => onLevelChange(selectedLevel === l ? null : l)}
                  >
                    {l}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchFilters;
