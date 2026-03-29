import { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TabStop {
  id: string;
  position: number; // px from left edge of ruler
}

interface EditorRulerProps {
  leftMargin: number;
  rightMargin: number;
  firstLineIndent: number;
  onLeftMarginChange: (px: number) => void;
  onRightMarginChange: (px: number) => void;
  onFirstLineIndentChange: (px: number) => void;
  tabStops: TabStop[];
  onTabStopsChange: (tabs: TabStop[]) => void;
}

const RULER_HEIGHT = 28;
const DPI = 96; // CSS pixels per inch
const TICK_MAJOR = DPI; // 1 inch
const TICK_HALF = DPI / 2;
const TICK_QUARTER = DPI / 4;

export function EditorRuler({
  leftMargin,
  rightMargin,
  firstLineIndent,
  onLeftMarginChange,
  onRightMarginChange,
  onFirstLineIndentChange,
  tabStops,
  onTabStopsChange,
}: EditorRulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<
    null | "left" | "right" | "indent" | { type: "tab"; id: string }
  >(null);
  const [rulerWidth, setRulerWidth] = useState(0);

  useEffect(() => {
    if (!rulerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setRulerWidth(entries[0].contentRect.width);
    });
    obs.observe(rulerRef.current);
    return () => obs.disconnect();
  }, []);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  const getX = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      if (!rulerRef.current) return 0;
      const rect = rulerRef.current.getBoundingClientRect();
      return e.clientX - rect.left;
    },
    []
  );

  const handlePointerDown = useCallback(
    (
      type: "left" | "right" | "indent" | { type: "tab"; id: string },
      e: React.PointerEvent
    ) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(type);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !rulerRef.current) return;
      const x = getX(e);

      if (dragging === "left") {
        onLeftMarginChange(clamp(x, 0, rulerWidth - rightMargin - 40));
      } else if (dragging === "right") {
        onRightMarginChange(
          clamp(rulerWidth - x, 0, rulerWidth - leftMargin - 40)
        );
      } else if (dragging === "indent") {
        onFirstLineIndentChange(
          clamp(x - leftMargin, -leftMargin, rulerWidth - leftMargin - rightMargin)
        );
      } else if (typeof dragging === "object" && dragging.type === "tab") {
        const rect = rulerRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        // If dragged off ruler, remove it
        if (y < -20 || y > RULER_HEIGHT + 20) {
          onTabStopsChange(tabStops.filter((t) => t.id !== dragging.id));
          setDragging(null);
          return;
        }
        onTabStopsChange(
          tabStops.map((t) =>
            t.id === dragging.id
              ? { ...t, position: clamp(x, leftMargin, rulerWidth - rightMargin) }
              : t
          )
        );
      }
    },
    [
      dragging,
      getX,
      leftMargin,
      rightMargin,
      rulerWidth,
      onLeftMarginChange,
      onRightMarginChange,
      onFirstLineIndentChange,
      tabStops,
      onTabStopsChange,
    ]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handleRulerClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragging) return;
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      // Only add tab if clicking in the content area
      if (x > leftMargin && x < rulerWidth - rightMargin) {
        onTabStopsChange([
          ...tabStops,
          { id: crypto.randomUUID(), position: x },
        ]);
      }
    },
    [dragging, leftMargin, rightMargin, rulerWidth, tabStops, onTabStopsChange]
  );

  // Render tick marks
  const ticks: React.ReactNode[] = [];
  if (rulerWidth > 0) {
    let inchNum = 0;
    for (let x = 0; x <= rulerWidth; x += TICK_QUARTER) {
      let height = 4;
      let showLabel = false;
      if (x % TICK_MAJOR === 0) {
        height = 12;
        showLabel = true;
        inchNum = x / TICK_MAJOR;
      } else if (x % TICK_HALF === 0) {
        height = 8;
      }
      ticks.push(
        <div
          key={x}
          className="absolute bottom-0"
          style={{ left: x, width: 1 }}
        >
          <div
            className="bg-muted-foreground/40"
            style={{ width: 1, height, marginLeft: 0 }}
          />
          {showLabel && inchNum > 0 && (
            <span
              className="absolute text-[8px] text-muted-foreground/60 select-none"
              style={{ bottom: height + 1, left: 3 }}
            >
              {inchNum}
            </span>
          )}
        </div>
      );
    }
  }

  // Marker triangle style helper
  const MarkerDown = ({
    x,
    color,
    onDown,
    title,
  }: {
    x: number;
    color: string;
    onDown: (e: React.PointerEvent) => void;
    title: string;
  }) => (
    <div
      className="absolute cursor-ew-resize touch-none z-10"
      style={{ left: x - 5, top: 0 }}
      onPointerDown={onDown}
      title={title}
    >
      <svg width="10" height="12" viewBox="0 0 10 12">
        <polygon points="0,0 10,0 5,10" fill={color} stroke="hsl(var(--border))" strokeWidth="0.5" />
      </svg>
    </div>
  );

  const MarkerUp = ({
    x,
    color,
    onDown,
    title,
  }: {
    x: number;
    color: string;
    onDown: (e: React.PointerEvent) => void;
    title: string;
  }) => (
    <div
      className="absolute cursor-ew-resize touch-none z-10"
      style={{ left: x - 5, bottom: 0 }}
      onPointerDown={onDown}
      title={title}
    >
      <svg width="10" height="12" viewBox="0 0 10 12">
        <polygon points="5,2 10,12 0,12" fill={color} stroke="hsl(var(--border))" strokeWidth="0.5" />
      </svg>
    </div>
  );

  return (
    <div
      ref={rulerRef}
      className="relative w-full bg-muted/30 border-b border-border select-none overflow-hidden"
      style={{ height: RULER_HEIGHT }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleRulerClick}
    >
      {/* Tick marks */}
      {ticks}

      {/* Margin shading */}
      <div
        className="absolute inset-y-0 left-0 bg-muted-foreground/5"
        style={{ width: leftMargin }}
      />
      <div
        className="absolute inset-y-0 right-0 bg-muted-foreground/5"
        style={{ width: rightMargin }}
      />

      {/* First-line indent marker (top triangle) */}
      <MarkerDown
        x={leftMargin + firstLineIndent}
        color="hsl(var(--primary))"
        onDown={(e) => handlePointerDown("indent", e)}
        title="First line indent"
      />

      {/* Left margin marker (bottom triangle) */}
      <MarkerUp
        x={leftMargin}
        color="hsl(var(--primary))"
        onDown={(e) => handlePointerDown("left", e)}
        title="Left margin"
      />

      {/* Right margin marker (bottom triangle) */}
      <MarkerUp
        x={rulerWidth - rightMargin}
        color="hsl(var(--primary))"
        onDown={(e) => handlePointerDown("right", e)}
        title="Right margin"
      />

      {/* Tab stops */}
      {tabStops.map((tab) => (
        <div
          key={tab.id}
          className="absolute cursor-ew-resize touch-none z-10"
          style={{ left: tab.position - 4, bottom: 0 }}
          onPointerDown={(e) =>
            handlePointerDown({ type: "tab", id: tab.id }, e)
          }
          title="Tab stop (drag off to remove)"
        >
          <svg width="8" height="10" viewBox="0 0 8 10">
            <polygon
              points="0,0 8,0 4,8"
              fill="hsl(var(--accent-foreground))"
              stroke="hsl(var(--border))"
              strokeWidth="0.5"
            />
          </svg>
        </div>
      ))}
    </div>
  );
}
