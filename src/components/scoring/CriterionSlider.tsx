import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import type { RubricCriterion } from "@/hooks/useCompetitions";

interface CriterionSliderProps {
  criterion: RubricCriterion;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const scoreLabels = ["", "1 – Very Weak", "2 – Weak", "3 – Average", "4 – Strong", "5 – Excellent"];

export function CriterionSlider({ criterion, value, onChange, disabled = false }: CriterionSliderProps) {
  const descriptions: Record<number, string> = {
    1: criterion.description_1,
    2: criterion.description_2,
    3: criterion.description_3,
    4: criterion.description_4,
    5: criterion.description_5,
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{criterion.name}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs space-y-1 text-xs">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={n === value ? "font-bold text-primary" : ""}>
                  <span className="font-mono">{n}.</span> {descriptions[n]}
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </div>
        <span className={`text-sm font-mono font-bold ${value > 0 ? "text-primary" : "text-muted-foreground"}`}>
          {value > 0 ? value : "–"}
        </span>
      </div>

      <Slider
        min={1}
        max={5}
        step={1}
        value={[value || 1]}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="py-1"
      />

      {value > 0 && (
        <p className="text-xs text-muted-foreground italic">{descriptions[value]}</p>
      )}
    </div>
  );
}
