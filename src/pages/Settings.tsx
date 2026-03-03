import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { User, Bell, Shield, Palette, Sun, Moon, Save, KeyRound } from "lucide-react";

export default function Settings() {
  const { user, roles } = useAuth();
  const { isDark, toggleTheme, brightness, setBrightness, contrast, setContrast } = useTheme();
  const queryClient = useQueryClient();

  // ── Profile tab state ──
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);

  // Sync loaded profile into local state
  const profileLoaded = profile && !profileDirty;
  if (profileLoaded && fullName === "" && phone === "" && avatarUrl === "") {
    setFullName(profile.full_name || "");
    setPhone(profile.phone || "");
    setAvatarUrl(profile.avatar_url || "");
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, avatar_url: avatarUrl || null })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      setProfileDirty(false);
      toast({ title: "Profile updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ── Security tab state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // ── Notifications (placeholder preferences) ──
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [scoreNotifs, setScoreNotifs] = useState(true);
  const [registrationNotifs, setRegistrationNotifs] = useState(true);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5 text-xs sm:text-sm">
            <Bell className="h-3.5 w-3.5" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-xs sm:text-sm">
            <Palette className="h-3.5 w-3.5" /> Theme
          </TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-[11px] text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setProfileDirty(true); }}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setProfileDirty(true); }}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-2">
                <Label>Avatar URL</Label>
                <Input
                  value={avatarUrl}
                  onChange={(e) => { setAvatarUrl(e.target.value); setProfileDirty(true); }}
                  placeholder="https://..."
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-1.5">
                  {roles.length > 0 ? roles.map((r) => (
                    <Badge key={r} variant="secondary" className="font-mono text-[10px]">
                      {r.replace("_", " ")}
                    </Badge>
                  )) : <p className="text-sm text-muted-foreground">No roles assigned</p>}
                </div>
              </div>
              <Button
                onClick={() => updateProfile.mutate()}
                disabled={!profileDirty || updateProfile.isPending}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>Choose what alerts you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Score Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when scores are certified</p>
                </div>
                <Switch checked={scoreNotifs} onCheckedChange={setScoreNotifs} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Registration Updates</p>
                  <p className="text-xs text-muted-foreground">Status changes on your registrations</p>
                </div>
                <Switch checked={registrationNotifs} onCheckedChange={setRegistrationNotifs} />
              </div>
              <p className="text-[11px] text-muted-foreground pt-2">Notification preferences are saved locally for now. Backend notification delivery coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword}
                className="gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {changingPassword ? "Updating…" : "Update Password"}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sessions</CardTitle>
              <CardDescription>Your active session information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Signed in since {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "—"}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">Current</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Theme</CardTitle>
              <CardDescription>Customize your visual experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDark ? <Moon className="h-4 w-4 text-primary" /> : <Sun className="h-4 w-4 text-primary" />}
                  <div>
                    <p className="text-sm font-medium">{isDark ? "Dark Mode" : "Light Mode"}</p>
                    <p className="text-xs text-muted-foreground">Toggle between dark and light theme</p>
                  </div>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleTheme} />
              </div>
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Brightness — {brightness}%</Label>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full mt-1 accent-primary"
                  />
                </div>
                <div>
                  <Label className="text-sm">Contrast — {contrast}%</Label>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full mt-1 accent-primary"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setBrightness(100); setContrast(100); }}
                  disabled={brightness === 100 && contrast === 100}
                >
                  Reset to defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
