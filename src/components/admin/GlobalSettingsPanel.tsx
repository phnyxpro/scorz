import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Palette, UserPlus, Mail, Flag } from "lucide-react";

interface SettingsMap {
  [key: string]: any;
}

export default function GlobalSettingsPanel() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("platform_settings").select("*");
      if (error) {
        toast.error("Failed to load settings");
        return;
      }
      const map: SettingsMap = {};
      data?.forEach((row: any) => {
        map[row.key] = row.value;
      });
      setSettings(map);
      setLoading(false);
    })();
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSetting = async (key: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: settings[key] })
      .eq("key", key);
    if (error) toast.error(`Failed to save ${key}`);
    else toast.success(`${key.replace("_", " ")} saved`);
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground animate-pulse font-mono">Loading settings…</div>;
  }

  const branding = settings.branding || {};
  const regDefaults = settings.registration_defaults || {};
  const emailNotifs = settings.email_notifications || {};
  const featureFlags = settings.feature_flags || {};

  return (
    <Tabs defaultValue="branding" className="space-y-4">
      <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
        <TabsTrigger value="branding" className="text-xs gap-1"><Palette className="h-3.5 w-3.5" />Branding</TabsTrigger>
        <TabsTrigger value="registration" className="text-xs gap-1"><UserPlus className="h-3.5 w-3.5" />Registration</TabsTrigger>
        <TabsTrigger value="email" className="text-xs gap-1"><Mail className="h-3.5 w-3.5" />Email</TabsTrigger>
        <TabsTrigger value="features" className="text-xs gap-1"><Flag className="h-3.5 w-3.5" />Features</TabsTrigger>
      </TabsList>

      {/* Branding */}
      <TabsContent value="branding">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono">Platform Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs">App Name</Label>
              <Input
                value={branding.app_name || ""}
                onChange={(e) => updateSetting("branding", { ...branding, app_name: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Tagline</Label>
              <Input
                value={branding.tagline || ""}
                onChange={(e) => updateSetting("branding", { ...branding, tagline: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Logo URL</Label>
              <Input
                value={branding.logo_url || ""}
                onChange={(e) => updateSetting("branding", { ...branding, logo_url: e.target.value })}
                className="h-9 text-sm"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Primary Color (hex)</Label>
              <Input
                value={branding.primary_color || ""}
                onChange={(e) => updateSetting("branding", { ...branding, primary_color: e.target.value })}
                className="h-9 text-sm"
                placeholder="#F59E0B"
              />
            </div>
            <Button size="sm" onClick={() => saveSetting("branding")} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />Save Branding
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Registration */}
      <TabsContent value="registration">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono">Registration Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs">Default Age Category</Label>
              <Input
                value={regDefaults.default_age_category || ""}
                onChange={(e) => updateSetting("registration_defaults", { ...regDefaults, default_age_category: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Require Guardian for Minors</Label>
              <Switch
                checked={regDefaults.require_guardian_for_minors ?? true}
                onCheckedChange={(v) => updateSetting("registration_defaults", { ...regDefaults, require_guardian_for_minors: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Auto-Approve Registrations</Label>
              <Switch
                checked={regDefaults.auto_approve ?? false}
                onCheckedChange={(v) => updateSetting("registration_defaults", { ...regDefaults, auto_approve: v })}
              />
            </div>
            <Button size="sm" onClick={() => saveSetting("registration_defaults")} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />Save Registration
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Email */}
      <TabsContent value="email">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono">Email Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(emailNotifs).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                <Switch
                  checked={!!value}
                  onCheckedChange={(v) => updateSetting("email_notifications", { ...emailNotifs, [key]: v })}
                />
              </div>
            ))}
            <Button size="sm" onClick={() => saveSetting("email_notifications")} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />Save Email
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Feature Flags */}
      <TabsContent value="features">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-mono">Feature Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(featureFlags).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs capitalize">{key.replace(/_/g, " ")}</Label>
                <Switch
                  checked={!!value}
                  onCheckedChange={(v) => updateSetting("feature_flags", { ...featureFlags, [key]: v })}
                />
              </div>
            ))}
            <Button size="sm" onClick={() => saveSetting("feature_flags")} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />Save Features
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
