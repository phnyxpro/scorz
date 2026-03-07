import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import type { RubricCriterion } from "@/hooks/useCompetitions";

interface CriterionSliderProps {
  criterion: RubricCriterion;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function CriterionSlider({ criterion, value, onChange, disabled = false }: CriterionSliderProps) {
  const [isFocused, setIsFocused] = useState(false);

  const descriptions: Record<number, string> = {
    1: criterion.description_1,
    2: criterion.description_2,
    3: criterion.description_3,
    4: criterion.description_4,
    5: criterion.description_5,
  };

  // Get the nearest whole-number descriptor for display
  const nearestDesc = value > 0 ? descriptions[Math.round(value)] : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const key = e.key;
    if (["1", "2", "3", "4", "5"].includes(key)) {
      onChange(parseInt(key, 10));
      e.preventDefault();
    }
  };

  const handleNumberInput = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    // Clamp to 0.1–5 and round to nearest 0.1
    const clamped = Math.min(5, Math.max(0.1, Math.round(num * 10) / 10));
    onChange(clamped);
  };

  return (
    <div
      className={`space-y-1.5 sm:space-y-2 p-1.5 sm:p-2 rounded-lg transition-colors ${isFocused ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={disabled ? -1 : 0}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{criterion.name}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs space-y-1 text-xs">
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} className={n === Math.round(value) ? "font-bold text-primary" : ""}>
                  <span className="font-mono">{n}.</span> {descriptions[n]}
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          {isFocused && (
            <span className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1 rounded animate-pulse">
              Press 1-5
            </span>
          )}
          <Input
            type="number"
            min={0.1}
            max={5}
            step={0.1}
            value={value > 0 ? value : ""}
            onChange={(e) => handleNumberInput(e.target.value)}
            disabled={disabled}
            className="w-16 h-7 text-center font-mono font-bold text-sm px-1"
            tabIndex={-1}
            placeholder="–"
          />
        </div>
      </div>

      <Slider
        min={0.1}
        max={5}
        step={0.1}
        value={[value || 0.1]}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="py-1"
        tabIndex={-1}
        gradientTrack={true}
      />

      {nearestDesc && value > 0 && (
        <p className="text-xs text-muted-foreground italic">{nearestDesc}</p>
      )}
    </div>
  );
}
