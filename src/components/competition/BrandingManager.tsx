import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BannerUpload } from "@/components/shared/BannerUpload";
import { Palette, Type, Eye } from "lucide-react";
import { toast } from "sonner";

interface BrandingManagerProps {
  competitionId: string;
  competition: any;
}

const FONT_OPTIONS = [
  { value: "default", label: "Default (System)" },
  { value: "mono", label: "Monospace" },
  { value: "serif", label: "Serif" },
  { value: "rounded", label: "Rounded (Nunito)" },
];

export function BrandingManager({ competitionId, competition }: BrandingManagerProps) {
  const qc = useQueryClient();
  const [primaryColor, setPrimaryColor] = useState(competition?.branding_primary_color || "#6366f1");
  const [accentColor, setAccentColor] = useState(competition?.branding_accent_color || "#f59e0b");
  const [font, setFont] = useState(competition?.branding_font || "default");
  const [whiteLabel, setWhiteLabel] = useState(competition?.white_label || false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (competition) {
      setPrimaryColor(competition.branding_primary_color || "#6366f1");
      setAccentColor(competition.branding_accent_color || "#f59e0b");
      setFont(competition.branding_font || "default");
      setWhiteLabel(competition.white_label || false);
    }
  }, [competition]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("competitions")
        .update({
          branding_primary_color: primaryColor,
          branding_accent_color: accentColor,
          branding_font: font,
          white_label: whiteLabel,
        } as any)
        .eq("id", competitionId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["competition", competitionId] });
      toast.success("Branding saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Custom Branding</CardTitle>
          </div>
          <CardDescription>Customise colours, fonts, and logo for this competition's public event page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-6">
          {/* Competition Logo */}
          <BannerUpload
            currentUrl={competition?.branding_logo_url}
            folder={`branding/${competitionId}`}
            aspectLabel="Competition Logo"
            onUploaded={async (url) => {
              await supabase.from("competitions").update({ branding_logo_url: url } as any).eq("id", competitionId);
              qc.invalidateQueries({ queryKey: ["competition", competitionId] });
            }}
            onRemoved={async () => {
              await supabase.from("competitions").update({ branding_logo_url: null } as any).eq("id", competitionId);
              qc.invalidateQueries({ queryKey: ["competition", competitionId] });
            }}
          />

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  className="h-8 w-8 rounded border border-border cursor-pointer"
                />
                <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Accent Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  className="h-8 w-8 rounded border border-border cursor-pointer"
                />
                <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
          </div>

          {/* Font */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Type className="h-3 w-3" /> Font Family</Label>
            <Select value={font} onValueChange={setFont}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border/50 p-3 sm:p-4 space-y-2" style={{ fontFamily: font === "mono" ? "monospace" : font === "serif" ? "serif" : font === "rounded" ? "Nunito, sans-serif" : "inherit" }}>
            <p className="text-xs text-muted-foreground font-mono uppercase">Preview</p>
            <div className="flex items-center gap-3">
              {competition?.branding_logo_url && (
                <img src={competition.branding_logo_url} alt="Logo" className="h-8 w-8 rounded" />
              )}
              <span className="font-bold text-lg" style={{ color: primaryColor }}>{competition?.name || "Competition"}</span>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded text-xs text-white font-medium" style={{ backgroundColor: primaryColor }}>Primary</span>
              <span className="px-3 py-1 rounded text-xs text-white font-medium" style={{ backgroundColor: accentColor }}>Accent</span>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Branding"}
          </Button>
        </CardContent>
      </Card>

      {/* White Label Toggle */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">White-Label Mode</CardTitle>
          </div>
          <CardDescription>When enabled, the public event page will use your competition logo and branding instead of the Scorz brand.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="wl-toggle" className="text-sm font-medium">Enable White-Label</Label>
              <p className="text-xs text-muted-foreground">Hides Scorz branding on public pages for this competition</p>
            </div>
            <Switch id="wl-toggle" checked={whiteLabel} onCheckedChange={setWhiteLabel} />
          </div>
          {whiteLabel && (
            <p className="text-xs text-muted-foreground mt-2 border-l-2 border-accent pl-2">
              Make sure you've uploaded a competition logo above for the best white-label experience.
            </p>
          )}
          <Button onClick={handleSave} disabled={saving} className="mt-3">
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
