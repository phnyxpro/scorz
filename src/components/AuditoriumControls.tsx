import { useTheme } from "@/contexts/ThemeContext";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sun, Moon, SunDim, Contrast } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export function AuditoriumControls() {
  const { isDark, toggleTheme, brightness, setBrightness, contrast, setContrast } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Auditorium display settings">
          <SunDim className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-mono text-sm font-semibold text-foreground">Auditorium Mode</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
              <Label className="text-sm">{isDark ? "Dark" : "Light"}</Label>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Brightness: {brightness}%</Label>
            </div>
            <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={30} max={100} step={5} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Contrast className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm">Contrast: {contrast}%</Label>
            </div>
            <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={50} max={150} step={5} />
          </div>

          <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setBrightness(100); setContrast(100); }}>
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
