import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const SUGGESTIONS = [
  "Computer Science",
  "Advanced",
  "Web Dev",
  "DSA",
  "Intermediate",
  "System Design",
];

interface SearchSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  visible: boolean;
}

const SearchSuggestions = ({ onSuggestionClick, visible }: SearchSuggestionsProps) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <TrendingUp className="h-3 w-3" />
        <span>Popular searches</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <Badge
            key={s}
            variant="outline"
            className="cursor-pointer text-[11px] gap-1 hover:bg-accent transition-colors"
            onClick={() => onSuggestionClick(s)}
          >
            <Search className="h-2.5 w-2.5" />
            {s}
          </Badge>
        ))}
      </div>
    </motion.div>
  );
};

export default SearchSuggestions;
