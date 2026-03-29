import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle, Star } from "lucide-react";
import type { RubricCriterion, RubricScaleLabels } from "@/hooks/useCompetitions";

interface CriterionSliderProps {
  criterion: RubricCriterion;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  scaleLabels?: RubricScaleLabels;
}

export function CriterionSlider({ criterion, value, onChange, disabled = false, scaleLabels }: CriterionSliderProps) {
  const [isFocused, setIsFocused] = useState(false);

  const scaleMin = scaleLabels?.min ?? 1;
  const scaleMax = scaleLabels?.max ?? 5;

  // Build descriptions from either fixed columns (1-5) or scale_descriptions for higher values
  const descriptions: Record<number, string> = {};
  for (let n = scaleMin; n <= scaleMax; n++) {
    if (n <= 5) {
      descriptions[n] = (criterion as any)[`description_${n}`] || "";
    } else {
      descriptions[n] = criterion.scale_descriptions?.[String(n)] || "";
    }
  }

  // Get the nearest whole-number descriptor for display
  const nearestDesc = value > 0 ? descriptions[Math.round(value)] : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const key = parseInt(e.key, 10);
    if (!isNaN(key) && key >= scaleMin && key <= Math.min(scaleMax, 9)) {
      onChange(key);
      e.preventDefault();
    }
  };

  const handleNumberInput = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const clamped = Math.min(scaleMax, Math.max(0.1, Math.round(num * 10) / 10));
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
          {criterion.is_bonus && <Star className="h-3.5 w-3.5 text-amber-500" />}
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs space-y-1 text-xs">
              {Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map(n => (
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
              Press {scaleMin}-{Math.min(scaleMax, 9)}
            </span>
          )}
          <Input
            type="number"
            inputMode="decimal"
            min={0.1}
            max={scaleMax}
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
        max={scaleMax}
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
      {criterion.notes && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{criterion.notes}</p>
      )}
    </div>
  );
}
