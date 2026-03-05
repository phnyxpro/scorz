import { useState } from "react";
import { ContestantRegistration } from "@/hooks/useRegistrations";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, ExternalLink, Video, MapPin, Phone, Mail, Calendar, Shield, User, Image as ImageIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

const statusColor: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary border-secondary/30",
  pending: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

interface Props {
  registration: ContestantRegistration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function ContestantDetailSheet({ registration, open, onOpenChange, onApprove, onReject }: Props) {
  const reg = registration;
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  if (!reg) return null;

  const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "avif"];

  const { data: mediaFiles } = useQuery({
    queryKey: ["contestant-media-sheet", reg?.user_id],
    enabled: open && !!reg?.user_id,
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
        .filter(f => {
          const ext = f.name.split(".").pop()?.toLowerCase() || "";
          return IMAGE_EXTENSIONS.includes(ext);
        })
        .map(f => ({
          name: f.name,
          url: `${prefix}/${f.name}`,
        }));
    },
  });

  const socialHandles = reg.social_handles as Record<string, string> | null;
  const hasSocials = socialHandles && Object.keys(socialHandles).length > 0;
  const isMinor = reg.age_category === "minor";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-base">Contestant Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Header with photo */}
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 rounded-lg border border-border">
              <AvatarImage src={reg.profile_photo_url || undefined} alt={reg.full_name} />
              <AvatarFallback className="rounded-lg text-lg bg-muted">
                {reg.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{reg.full_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-[10px] ${statusColor[reg.status] || ""}`}>
                  {reg.status}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{reg.age_category}</Badge>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {reg.status === "pending" && (
              <>
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => onApprove(reg.id)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => onReject(reg.id)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </>
            )}
            {reg.status === "approved" && (
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => onReject(reg.id)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Revoke Approval
              </Button>
            )}
            {reg.status === "rejected" && (
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => onApprove(reg.id)}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Re-approve
              </Button>
            )}
            <Button size="sm" variant="outline" asChild>
              <Link to={`/profile/${reg.user_id}`}>
                <User className="h-3.5 w-3.5 mr-1" /> Profile
              </Link>
            </Button>
          </div>

          <Separator />

          {/* Contact Info */}
          <Section title="Contact Information">
            <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={reg.email} />
            {reg.phone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={reg.phone} />}
            {reg.location && <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Location" value={reg.location} />}
          </Section>

          {/* Bio */}
          {reg.bio && (
            <Section title="Bio">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reg.bio}</p>
            </Section>
          )}

          {/* Social Handles */}
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
              <a
                href={reg.performance_video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Video className="h-3.5 w-3.5" /> Watch Video <ExternalLink className="h-3 w-3" />
              </a>
            </Section>
          )}

          {/* Media Gallery */}
          {mediaFiles && mediaFiles.length > 0 && (
            <Section title="Performance Photos">
              <div className="grid grid-cols-3 gap-2">
                {mediaFiles.map((file) => (
                  <motion.div
                    key={file.name}
                    className="aspect-square rounded-lg overflow-hidden border border-border/30 cursor-pointer bg-muted"
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setLightboxUrl(file.url)}
                  >
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </motion.div>
                ))}
              </div>
            </Section>
          )}

          {/* Guardian Info (minors) */}
          {isMinor && (
            <Section title="Guardian Information">
              {reg.guardian_name && <InfoRow label="Name" value={reg.guardian_name} />}
              {reg.guardian_email && <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={reg.guardian_email} />}
              {reg.guardian_phone && <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={reg.guardian_phone} />}
              <SignatureStatus label="Guardian Signature" signed={!!reg.guardian_signature} timestamp={reg.guardian_signed_at} />
            </Section>
          )}

          <Separator />

          {/* Compliance */}
          <Section title="Compliance & Signatures">
            <SignatureStatus
              label="Rules Acknowledged"
              signed={reg.rules_acknowledged}
              timestamp={reg.rules_acknowledged_at}
            />
            <SignatureStatus
              label="Contestant Signature"
              signed={!!reg.contestant_signature}
              timestamp={reg.contestant_signed_at}
            />
          </Section>

          {/* Metadata */}
          <Section title="Registration Info">
            <InfoRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Registered"
              value={format(new Date(reg.created_at), "MMM d, yyyy 'at' h:mm a")}
            />
            <InfoRow
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Last Updated"
              value={format(new Date(reg.updated_at), "MMM d, yyyy 'at' h:mm a")}
            />
          </Section>
        </div>

        {/* Photo Lightbox */}
        <AnimatePresence>
          {lightboxUrl && (
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxUrl(null)}
            >
              <motion.div
                className="relative max-w-lg max-h-[80vh] w-full mx-4"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
              >
                <img src={lightboxUrl} alt="Performance photo" className="w-full h-auto max-h-[75vh] object-contain rounded-lg" />
                <Button size="icon" variant="secondary" className="absolute top-2 right-2 h-8 w-8" onClick={() => setLightboxUrl(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
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
        {signed ? (
          <Shield className="h-3.5 w-3.5 text-secondary" />
        ) : (
          <Shield className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
        <span className={signed ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      </div>
      {signed && timestamp ? (
        <span className="text-[10px] text-muted-foreground font-mono">
          {format(new Date(timestamp), "MMM d, yyyy")}
        </span>
      ) : (
        <span className="text-[10px] text-muted-foreground">Not yet</span>
      )}
    </div>
  );
}
