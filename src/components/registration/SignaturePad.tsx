import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Eraser, PenTool, Type } from "lucide-react";

interface SignaturePadProps {
  onSignature: (dataUrl: string) => void;
  existingSignature?: string | null;
  label?: string;
  signerRole?: string;
}

function stampSignature(
  sourceCanvas: HTMLCanvasElement,
  signerRole?: string
): string {
  const stampHeight = 30;
  const w = sourceCanvas.width / 2; // account for 2x scale
  const h = sourceCanvas.height / 2;

  const out = document.createElement("canvas");
  out.width = w * 2;
  out.height = (h + stampHeight) * 2;
  const ctx = out.getContext("2d")!;
  ctx.scale(2, 2);

  // Draw original signature
  ctx.drawImage(sourceCanvas, 0, 0, w, h);

  // Draw stamp footer
  ctx.fillStyle = "hsl(220, 15%, 94%)";
  ctx.fillRect(0, h, w, stampHeight);

  ctx.fillStyle = "hsl(220, 10%, 45%)";
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textBaseline = "middle";

  const now = new Date();
  const timestamp = now.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const parts = [`Signed: ${timestamp}`];
  if (signerRole) parts.push(`Role: ${signerRole}`);
  parts.push("Digitally signed via Scorz");

  ctx.fillText(parts.join("  ·  "), 8, h + stampHeight / 2);

  return out.toDataURL("image/png");
}

export function SignaturePad({
  onSignature,
  existingSignature,
  label = "Sign here",
  signerRole,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const hasDrawnRef = useRef(false);
  const [typedName, setTypedName] = useState("");
  const [mode, setMode] = useState<string>("draw");

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "hsl(220, 15%, 90%)";

    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
        setHasDrawn(true);
      };
      img.src = existingSignature;
    }
  }, [existingSignature]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
    hasDrawnRef.current = true;
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawnRef.current) {
      onSignature(stampSignature(canvas, signerRole));
    }
  };

  const clearDraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    hasDrawnRef.current = false;
    onSignature("");
  };

  const confirmTyped = () => {
    if (!typedName.trim()) return;
    const canvas = document.createElement("canvas");
    const w = 400;
    const h = 120;
    canvas.width = w * 2;
    canvas.height = h * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

    // Render typed name in cursive
    ctx.fillStyle = "hsl(220, 25%, 10%)";
    ctx.font = "36px 'Dancing Script', cursive";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(typedName, w / 2, h / 2);

    onSignature(stampSignature(canvas, signerRole));
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>

      <Tabs value={mode} onValueChange={setMode} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-8">
          <TabsTrigger value="draw" className="text-xs gap-1.5">
            <PenTool className="h-3 w-3" /> Draw
          </TabsTrigger>
          <TabsTrigger value="type" className="text-xs gap-1.5">
            <Type className="h-3 w-3" /> Type to Sign
          </TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-2">
          <div className="flex justify-end mb-1">
            <Button type="button" variant="ghost" size="sm" onClick={clearDraw} className="h-6 text-xs">
              <Eraser className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
          <div
            className="border border-border rounded-md bg-card/50 relative overflow-hidden"
            style={{ touchAction: "none" }}
          >
            <canvas
              ref={canvasRef}
              className="w-full cursor-crosshair"
              style={{ height: 120 }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-muted-foreground text-xs">Draw your signature above</span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="type" className="mt-2 space-y-3">
          <Input
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="text-sm"
          />
          {typedName && (
            <div className="border border-border rounded-md bg-card/50 p-4 flex items-center justify-center min-h-[120px]">
              <span
                className="text-foreground text-3xl"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                {typedName}
              </span>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Metadata stamp preview */}
      <p className="text-[10px] text-muted-foreground">
        Signature will be digitally stamped with date, time
        {signerRole ? `, role (${signerRole})` : ""}, and platform verification.
      </p>
    </div>
  );
}
