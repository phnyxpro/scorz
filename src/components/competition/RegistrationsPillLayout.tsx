import { useState, useCallback } from "react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Settings, FileText, ExternalLink, Copy, Check } from "lucide-react";
import { RegistrationsManager } from "@/components/competition/RegistrationsManager";
import { RegistrationSettingsPanel } from "@/components/competition/RegistrationSettingsPanel";
import { RegistrationFormsInline } from "@/components/competition/RegistrationFormsInline";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const categories = {
  contestants: { label: "Contestants", icon: Users, description: "View and manage contestant registrations, approvals, and performance order." },
  settings: { label: "Settings", icon: Settings, description: "Control when registrations are open and manage the registration window." },
  forms: { label: "Forms", icon: FileText, description: "Configure custom registration form fields and requirements." },
} as const;

type Category = keyof typeof categories;

interface Props {
  competitionId: string;
}

export function RegistrationsPillLayout({ competitionId }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>("contestants");
  const [copied, setCopied] = useState(false);
  const ActiveIcon = categories[activeCategory].icon;
  const keys = Object.keys(categories) as Category[];
  const swipeNav = useCallback((dir: 1 | -1) => {
    setActiveCategory(prev => {
      const i = keys.indexOf(prev);
      const next = i + dir;
      return next >= 0 && next < keys.length ? keys[next] : prev;
    });
  }, [keys]);
  const swipeHandlers = useSwipeGesture({ onSwipeLeft: () => swipeNav(1), onSwipeRight: () => swipeNav(-1) });

  const { data: comp } = useQuery({
    queryKey: ["comp-slug", competitionId],
    queryFn: async () => {
      const { data } = await supabase.from("competitions").select("slug").eq("id", competitionId).maybeSingle();
      return data;
    },
  });

  const publicUrl = comp?.slug ? `${window.location.origin}/events/${comp.slug}/registrations` : null;

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: "Link copied", description: "Public registration link copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Category pill bar + share link */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {(Object.keys(categories) as Category[]).map((key) => {
            const cat = categories[key];
            const Icon = cat.icon;
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 min-h-[44px] rounded-full text-sm font-medium border transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contestants — rendered directly (not inside a card, it has its own layout) */}
      {activeCategory === "contestants" && (
        <div {...swipeHandlers}>
          <RegistrationsManager competitionId={competitionId} />
        </div>
      )}

      {/* Settings & Forms — wrapped in the pill card pattern */}
      {activeCategory === "settings" && (
        <Card className="rounded-xl border-border/50 bg-card/80" {...swipeHandlers}>
          <CardContent className="p-3 sm:p-5 space-y-4">
            <div className="space-y-2">
              <Badge className="rounded-full gap-1.5 px-3 py-1 text-xs">
                <ActiveIcon className="h-3.5 w-3.5" />
                {categories[activeCategory].label}
              </Badge>
              <p className="text-sm text-muted-foreground">{categories[activeCategory].description}</p>
            </div>
            <RegistrationSettingsPanel competitionId={competitionId} />
          </CardContent>
        </Card>
      )}

      {activeCategory === "forms" && (
        <Card className="rounded-xl border-border/50 bg-card/80" {...swipeHandlers}>
          <CardContent className="p-3 sm:p-5 space-y-4">
            <div className="space-y-2">
              <Badge className="rounded-full gap-1.5 px-3 py-1 text-xs">
                <ActiveIcon className="h-3.5 w-3.5" />
                {categories[activeCategory].label}
              </Badge>
              <p className="text-sm text-muted-foreground">{categories[activeCategory].description}</p>
            </div>
            <RegistrationFormsInline competitionId={competitionId} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
