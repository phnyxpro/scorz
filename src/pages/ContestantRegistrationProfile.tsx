import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Shield, Video, ExternalLink,
  UserX, Ban, LogOut, RotateCcw, X, Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const statusColor: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary border-secondary/30",
  pending: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  no_show: "bg-muted text-muted-foreground border-border",
  disqualified: "bg-destructive/20 text-destructive border-destructive/30",
  dropped_out: "bg-muted text-muted-foreground border-border",
};

const statusLabel: Record<string, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
  no_show: "No Show",
  disqualified: "Disqualified",
  dropped_out: "Dropped Out",
};

const withdrawnStatuses = ["no_show", "disqualified", "dropped_out"];

export default function ContestantRegistrationProfile() {
  const { id: competitionId, registrationId } = useParams<{ id: string; registrationId: string }>();
  const navigate = useNavigate();
  const { roles } = useAuth();
  const queryClient = useQueryClient();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const isAdminOrOrg = roles.includes("admin") || roles.includes("organizer");

  const { data: reg, isLoading } = useQuery({
    queryKey: ["registration-profile", registrationId],
    enabled: !!registrationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contestant_registrations")
        .select("*")
        .eq("id", registrationId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: competition } = useQuery({
    queryKey: ["competition-name", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("name")
        .eq("id", competitionId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif"];

  const { data: mediaFiles } = useQuery({
    queryKey: ["contestant-media-profile", reg?.user_id],
    enabled: !!reg?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("contestant-media")
        .list(reg!.user_id, { limit: 50, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const { data: { publicUrl: baseUrl } } = supabase.storage
        .from("contestant-media")
        .getPublicUrl(`${reg!.user_id}/placeholder`);
      const prefix = baseUrl.replace("/placeholder", "");
      return (data || [])
        .filter(f => f.name !== ".emptyFolderPlaceholder")
        .filter(f => IMAGE_EXTENSIONS.includes(f.name.split(".").pop()?.toLowerCase() || ""))
        .map(f => ({ name: f.name, url: `${prefix}/${f.name}` }));
    },
  });

  const handleWithdraw = async (newStatus: string) => {
    if (!registrationId) return;
    setWithdrawing(true);
    try {
      const { error } = await supabase.rpc("withdraw_contestant", {
        _registration_id: registrationId,
        _new_status: newStatus,
      });
      if (error) throw error;
      toast({ title: "Status updated", description: `Contestant marked as ${statusLabel[newStatus] || newStatus}.` });
      queryClient.invalidateQueries({ queryKey: ["registration-profile", registrationId] });
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!reg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Registration not found.</p>
      </div>
    );
  }

  const socialHandles = reg.social_handles as Record<string, string> | null;
  const hasSocials = socialHandles && Object.keys(socialHandles).length > 0;
  const isMinor = reg.age_category === "minor";
  const isWithdrawn = withdrawnStatuses.includes(reg.status);

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      {/* Hero */}
      <div className="flex items-start gap-5">
        <Avatar className="h-20 w-20 rounded-xl border border-border">
          <AvatarImage src={reg.profile_photo_url || undefined} alt={reg.full_name} />
          <AvatarFallback className="rounded-xl text-xl bg-muted">
            {reg.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{reg.full_name}</h1>
          {competition && <p className="text-sm text-muted-foreground mt-0.5">{competition.name}</p>}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={statusColor[reg.status] || ""}>
              {statusLabel[reg.status] || reg.status}
            </Badge>
            <Badge variant="outline">{reg.age_category}</Badge>
            {reg.special_entry_type && <Badge variant="secondary">{reg.special_entry_type}</Badge>}
          </div>
        </div>
      </div>

      {/* Status Actions */}
      {isAdminOrOrg && (
        <Card className="border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Status Actions</CardTitle>
          </CardHeader>
          <CardContent>
            {isWithdrawn ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This contestant has been marked as <strong>{statusLabel[reg.status]}</strong>. All scoring data has been removed.
                </p>
                <StatusActionButton
                  label="Reinstate"
                  description="This will set the contestant back to approved status. Scoring data that was deleted cannot be recovered."
                  icon={<RotateCcw className="h-4 w-4 mr-1.5" />}
                  variant="secondary"
                  onConfirm={() => handleWithdraw("approved")}
                  disabled={withdrawing}
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <StatusActionButton
                  label="No Show"
                  description="Mark this contestant as a no-show. This will remove all their scores, timer data, votes, and slot assignments."
                  icon={<UserX className="h-4 w-4 mr-1.5" />}
                  variant="destructive"
                  onConfirm={() => handleWithdraw("no_show")}
                  disabled={withdrawing}
                />
                <StatusActionButton
                  label="Disqualified"
                  description="Disqualify this contestant. This will remove all their scores, timer data, votes, and slot assignments."
                  icon={<Ban className="h-4 w-4 mr-1.5" />}
                  variant="destructive"
                  onConfirm={() => handleWithdraw("disqualified")}
                  disabled={withdrawing}
                />
                <StatusActionButton
                  label="Drop Out"
                  description="Mark this contestant as dropped out. This will remove all their scores, timer data, votes, and slot assignments."
                  icon={<LogOut className="h-4 w-4 mr-1.5" />}
                  variant="destructive"
                  onConfirm={() => handleWithdraw("dropped_out")}
                  disabled={withdrawing}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Contact */}
      <Section title="Contact Information">
        <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={reg.email} />
        {reg.phone && <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={reg.phone} />}
        {reg.location && <InfoRow icon={<MapPin className="h-4 w-4" />} label="Location" value={reg.location} />}
      </Section>

      {/* Bio */}
      {reg.bio && (
        <Section title="Bio">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reg.bio}</p>
        </Section>
      )}

      {/* Socials */}
      {hasSocials && (
        <Section title="Social Handles">
          <div className="space-y-1.5">
            {Object.entries(socialHandles!).map(([platform, handle]) => (
              <div key={platform} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground capitalize">{platform}</span>
                <span className="font-mono text-xs text-foreground">{handle}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Performance Video */}
      {reg.performance_video_url && (
        <Section title="Performance Video">
          <a href={reg.performance_video_url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Video className="h-4 w-4" /> Watch Video <ExternalLink className="h-3 w-3" />
          </a>
        </Section>
      )}

      {/* Media Gallery */}
      {mediaFiles && mediaFiles.length > 0 && (
        <Section title="Performance Photos">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {mediaFiles.map((file) => (
              <motion.div key={file.name}
                className="aspect-square rounded-lg overflow-hidden border border-border/30 cursor-pointer bg-muted"
                whileHover={{ scale: 1.03 }}
                onClick={() => setLightboxUrl(file.url)}>
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* Guardian */}
      {isMinor && (
        <Section title="Guardian Information">
          {reg.guardian_name && <InfoRow label="Name" value={reg.guardian_name} />}
          {reg.guardian_email && <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={reg.guardian_email} />}
          {reg.guardian_phone && <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={reg.guardian_phone} />}
          <SignatureStatus label="Guardian Signature" signed={!!reg.guardian_signature} timestamp={reg.guardian_signed_at} />
        </Section>
      )}

      <Separator />

      {/* Compliance */}
      <Section title="Compliance & Signatures">
        <SignatureStatus label="Rules Acknowledged" signed={reg.rules_acknowledged} timestamp={reg.rules_acknowledged_at} />
        <SignatureStatus label="Contestant Signature" signed={!!reg.contestant_signature} timestamp={reg.contestant_signed_at} />
      </Section>

      {/* Metadata */}
      <Section title="Registration Info">
        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Registered"
          value={format(new Date(reg.created_at), "MMM d, yyyy 'at' h:mm a")} />
        <InfoRow icon={<Calendar className="h-4 w-4" />} label="Last Updated"
          value={format(new Date(reg.updated_at), "MMM d, yyyy 'at' h:mm a")} />
      </Section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxUrl(null)}>
            <motion.div className="relative max-w-lg max-h-[80vh] w-full mx-4"
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}>
              <img src={lightboxUrl} alt="Performance photo" className="w-full h-auto max-h-[75vh] object-contain rounded-lg" />
              <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8"
                onClick={() => setLightboxUrl(null)}>
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusActionButton({ label, description, icon, variant, onConfirm, disabled }: {
  label: string; description: string; icon: React.ReactNode;
  variant: "destructive" | "secondary"; onConfirm: () => void; disabled: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant === "destructive" ? "destructive" : "secondary"} disabled={disabled}>
          {icon} {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground font-medium truncate">{value}</span>
    </div>
  );
}

function SignatureStatus({ label, signed, timestamp }: { label: string; signed: boolean; timestamp: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-1.5">
        <Shield className={`h-4 w-4 ${signed ? "text-secondary" : "text-muted-foreground/50"}`} />
        <span className={signed ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      </div>
      {signed && timestamp ? (
        <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(timestamp), "MMM d, yyyy")}</span>
      ) : (
        <span className="text-[10px] text-muted-foreground">Not yet</span>
      )}
    </div>
  );
}
