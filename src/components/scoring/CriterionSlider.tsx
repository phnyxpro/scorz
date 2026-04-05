import { useState, useMemo } from "react";
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

interface PointRange { min: number; max: number }

function hasCustomPoints(pv: Record<string, number | PointRange> | undefined): pv is Record<string, number | PointRange> {
  if (!pv) return false;
  const keys = Object.keys(pv);
  return keys.length > 0 && keys.some(k => {
    const v = pv[k];
    return (typeof v === "number" && v > 0) || (typeof v === "object" && v !== null && v.max > 0);
  });
}

function getOverallMax(pv: Record<string, number | PointRange>): number {
  let max = 0;
  for (const v of Object.values(pv)) {
    if (typeof v === "number") max = Math.max(max, v);
    else if (v && typeof v === "object" && "max" in v) max = Math.max(max, v.max);
  }
  return max;
}

function getBandForValue(
  value: number,
  pv: Record<string, number | PointRange>,
  scaleLabels: Record<string, string>,
  criterion: RubricCriterion,
): { level: number; label: string; range: string; description: string } | null {
  const positions = Object.keys(pv).map(Number).sort((a, b) => a - b);
  for (const pos of positions) {
    const v = pv[String(pos)];
    const desc = pos <= 5
      ? ((criterion as any)[`description_${pos}`] || "")
      : (criterion.scale_descriptions?.[String(pos)] || "");
    if (typeof v === "object" && v !== null && "min" in v && "max" in v) {
      if (value >= v.min && value <= v.max) {
        return { level: pos, label: scaleLabels[String(pos)] || `Level ${pos}`, range: `${v.min}–${v.max}`, description: desc };
      }
    } else if (typeof v === "number" && Math.round(value) === v) {
      return { level: pos, label: scaleLabels[String(pos)] || `Level ${pos}`, range: `${v}`, description: desc };
    }
  }
  return null;
}

export function CriterionSlider({ criterion, value, onChange, disabled = false, scaleLabels }: CriterionSliderProps) {
  const [isFocused, setIsFocused] = useState(false);

  const scaleMin = scaleLabels?.min ?? 1;
  const scaleMax = scaleLabels?.max ?? 5;
  const labels = scaleLabels?.labels ?? {};

  const useCustom = hasCustomPoints(criterion.point_values);
  const overallMax = useMemo(() => useCustom ? getOverallMax(criterion.point_values) : scaleMax, [criterion.point_values, useCustom, scaleMax]);

  // Build descriptions from either fixed columns (1-5) or scale_descriptions for higher values
  const descriptions: Record<number, string> = {};
  for (let n = scaleMin; n <= scaleMax; n++) {
    if (n <= 5) {
      descriptions[n] = (criterion as any)[`description_${n}`] || "";
    } else {
      descriptions[n] = criterion.scale_descriptions?.[String(n)] || "";
    }
  }

  // Current band for custom points
  const currentBand = useCustom && value > 0 ? getBandForValue(value, criterion.point_values, labels) : null;

  // For non-custom: get the nearest whole-number descriptor
  const nearestDesc = !useCustom && value > 0 ? descriptions[Math.round(value)] : null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!useCustom) {
      const key = parseInt(e.key, 10);
      if (!isNaN(key) && key >= scaleMin && key <= Math.min(scaleMax, 9)) {
        onChange(key);
        e.preventDefault();
      }
    }
  };

  const handleNumberInput = (raw: string) => {
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const clamped = Math.min(overallMax, Math.max(0.1, Math.round(num * 10) / 10));
    onChange(clamped);
  };

  // Build band markers for the tooltip when custom points are used
  const bandTooltipItems = useMemo(() => {
    if (!useCustom) return null;
    const positions = Object.keys(criterion.point_values).map(Number).sort((a, b) => a - b);
    return positions.map(pos => {
      const v = criterion.point_values[String(pos)];
      const range = typeof v === "object" && v !== null && "min" in v ? `${(v as PointRange).min}–${(v as PointRange).max}` : `${v}`;
      const label = labels[String(pos)] || `Level ${pos}`;
      const desc = pos <= 5 ? (criterion as any)[`description_${pos}`] || "" : criterion.scale_descriptions?.[String(pos)] || "";
      return { pos, label, range, desc, isActive: currentBand?.level === pos };
    });
  }, [useCustom, criterion, labels, currentBand]);

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
          {useCustom && (
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1 rounded">
              /{overallMax}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs space-y-1 text-xs">
              {useCustom && bandTooltipItems ? (
                bandTooltipItems.map(b => (
                  <div key={b.pos} className={b.isActive ? "font-bold text-primary" : ""}>
                    <span className="font-mono">{b.range} pts</span> — {b.label}
                    {b.desc && <span className="text-muted-foreground ml-1">({b.desc})</span>}
                  </div>
                ))
              ) : (
                Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i).map(n => (
                  <div key={n} className={n === Math.round(value) ? "font-bold text-primary" : ""}>
                    <span className="font-mono">{n}.</span> {descriptions[n]}
                  </div>
                ))
              )}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          {isFocused && !useCustom && (
            <span className="hidden sm:inline text-[10px] text-muted-foreground bg-muted px-1 rounded animate-pulse">
              Press {scaleMin}-{Math.min(scaleMax, 9)}
            </span>
          )}
          <Input
            type="number"
            inputMode="decimal"
            min={0.1}
            max={overallMax}
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
        max={overallMax}
        step={0.1}
        value={[value || 0.1]}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        className="py-1"
        tabIndex={-1}
        gradientTrack={true}
      />

      {/* Band indicator for custom points */}
      {useCustom && currentBand && value > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-primary">{currentBand.label}</span>
          <span className="text-muted-foreground font-mono">({currentBand.range} pts)</span>
        </div>
      )}

      {/* Standard description for non-custom */}
      {!useCustom && nearestDesc && value > 0 && (
        <p className="text-xs text-muted-foreground italic">{nearestDesc}</p>
      )}
      {criterion.notes && (
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{criterion.notes}</p>
      )}
    </div>
  );
}
