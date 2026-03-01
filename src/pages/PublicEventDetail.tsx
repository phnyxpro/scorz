import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitionSponsors } from "@/hooks/useCompetitionSponsors";
import { useCompetitionUpdates } from "@/hooks/useCompetitionUpdates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Zap, ArrowLeft, Calendar, MapPin, Clock, UserPlus, Ticket, CheckCircle,
  FileText, ExternalLink, Newspaper, Users, Award,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { SocialLinks } from "@/components/public/SocialLinks";
import { AudienceTicketForm } from "@/components/public/AudienceTicketForm";
import { LevelParticipants } from "@/components/public/LevelParticipants";
import { PublicRoleList } from "@/components/public/PublicRoleList";
import { SponsorsStrip } from "@/components/public/SponsorsStrip";
import { NewsFeed } from "@/components/public/NewsFeed";

function usePublicCompetition(id: string | undefined) {
  return useQuery({
    queryKey: ["public-competition", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("competitions").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

function usePublicLevelsWithSubEvents(compId: string | undefined) {
  return useQuery({
    queryKey: ["public-levels-sub", compId],
    enabled: !!compId,
    queryFn: async () => {
      const { data: levels, error: le } = await supabase
        .from("competition_levels").select("*").eq("competition_id", compId!).order("sort_order");
      if (le) throw le;
      const allLevelIds = (levels || []).map(l => l.id);
      if (allLevelIds.length === 0) return [];
      const { data: subEvents, error: se } = await supabase
        .from("sub_events").select("*").in("level_id", allLevelIds).order("event_date");
      if (se) throw se;
      return (levels || []).map(l => ({
        ...l,
        sub_events: (subEvents || []).filter(s => s.level_id === l.id),
      }));
    },
  });
}

export default function PublicEventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: comp, isLoading } = usePublicCompetition(id);
  const { data: levels } = usePublicLevelsWithSubEvents(id);
  const { data: sponsors } = useCompetitionSponsors(id);
  const { data: updates } = useCompetitionUpdates(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedTicketEvent, setSelectedTicketEvent] = useState<string | null>(null);

  const socialLinks = (comp as any)?.social_links as Record<string, string> | undefined;
  const rulesUrl = (comp as any)?.rules_url as string | undefined;

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>
    </div>
  );

  if (!comp) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Event not found</p>
      <Button asChild variant="outline"><Link to="/">Back to Events</Link></Button>
    </div>
  );

  // Collect all sub-event IDs for participant queries
  const allSubEventIds = levels?.flatMap(l => l.sub_events.map((s: any) => s.id)) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-bold tracking-tighter text-foreground font-mono">SCORE</span>
          </Link>
          <div className="flex items-center gap-2">
            {socialLinks && <SocialLinks links={socialLinks} />}
            {user ? (
              <Button asChild size="sm" variant="outline"><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <Button asChild size="sm"><Link to="/auth">Sign In</Link></Button>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
        {comp.banner_url ? (
          <img src={comp.banner_url} alt={comp.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Zap className="h-16 w-16 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 max-w-5xl mx-auto">
          <Button asChild variant="ghost" size="sm" className="mb-2 text-foreground/70 -ml-2">
            <Link to="/"><ArrowLeft className="h-3 w-3 mr-1" /> All Events</Link>
          </Button>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground font-mono">{comp.name}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            {comp.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(comp.start_date), "MMMM d, yyyy")}
                {comp.end_date && ` — ${format(new Date(comp.end_date), "MMMM d, yyyy")}`}
              </span>
            )}
            <Badge variant={comp.status === "active" ? "default" : "secondary"}>
              {comp.status === "active" ? "Live" : comp.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Description */}
        {comp.description && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-muted-foreground leading-relaxed">{comp.description}</p>
          </motion.div>
        )}

        {/* CTA buttons */}
        <div className="flex flex-wrap gap-3">
          {comp.status === "active" && (
            <Button size="lg" onClick={() => {
              if (user) navigate(`/competitions/${id}/register`);
              else navigate(`/auth?redirect=/competitions/${id}/register`);
            }}>
              <UserPlus className="h-4 w-4 mr-2" /> Register as Contestant
            </Button>
          )}
          {rulesUrl && (
            <Button asChild size="lg" variant="outline">
              <a href={rulesUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4 mr-2" /> Competition Rules
              </a>
            </Button>
          )}
        </div>

        {/* Quick nav */}
        {levels && levels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => document.getElementById("section-schedule")?.scrollIntoView({ behavior: "smooth" })}>
              <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule
            </Button>
            <Button variant="outline" size="sm" onClick={() => document.getElementById("section-contestants")?.scrollIntoView({ behavior: "smooth" })}>
              <Users className="h-3.5 w-3.5 mr-1" /> Contestants
            </Button>
            <Button variant="outline" size="sm" onClick={() => document.getElementById("section-judges")?.scrollIntoView({ behavior: "smooth" })}>
              <Award className="h-3.5 w-3.5 mr-1" /> Judges
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/competitions/${id}/vote`)}>
              <Ticket className="h-3.5 w-3.5 mr-1" /> People's Choice
            </Button>
          </div>
        )}

        {/* Schedule with judges & contestants */}
        {levels && levels.length > 0 && (
          <section id="section-schedule">
            <h2 className="text-lg font-bold text-foreground mb-4 font-mono">Schedule</h2>
            <div className="space-y-4">
              {levels.map(level => (
                <Card key={level.id} className="border-border/50 bg-card/80 overflow-hidden">
                  {level.banner_url && (
                    <div className="h-28 overflow-hidden">
                      <img src={level.banner_url} alt={level.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{level.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Judges & Contestants for this level */}
                    <LevelParticipants subEventIds={level.sub_events.map((s: any) => s.id)} />

                    {level.sub_events.length > 0 ? level.sub_events.map((se: any) => (
                      <div key={se.id} className="border border-border/50 rounded-md p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          {se.banner_url && (
                            <img src={se.banner_url} alt={se.name} className="w-full sm:w-40 h-20 object-cover rounded mb-2" />
                          )}
                          <p className="font-medium text-sm text-foreground">{se.name}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-0.5">
                            {se.event_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(se.event_date), "MMM d, yyyy")}</span>}
                            {se.start_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{se.start_time}{se.end_time ? ` – ${se.end_time}` : ""}</span>}
                            {se.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{se.location}</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedTicketEvent(selectedTicketEvent === se.id ? null : se.id)}>
                          <Ticket className="h-3 w-3 mr-1" /> Get Ticket
                        </Button>
                      </div>
                    )) : (
                      <p className="text-xs text-muted-foreground">No sessions scheduled yet.</p>
                    )}

                    {level.sub_events.map((se: any) => (
                      selectedTicketEvent === se.id && (
                        <motion.div key={`ticket-${se.id}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border border-primary/30 rounded-md p-4 bg-primary/5">
                          <AudienceTicketForm subEventId={se.id} subEventName={se.name} />
                        </motion.div>
                      )
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Judges Section */}
        {levels && levels.length > 0 && (
          <section id="section-judges">
            <h2 className="text-lg font-bold text-foreground mb-4 font-mono">Judges</h2>
            <PublicRoleList subEventIds={allSubEventIds} role="judges" />
          </section>
        )}

        {/* Contestants Section */}
        {levels && levels.length > 0 && (
          <section id="section-contestants">
            <h2 className="text-lg font-bold text-foreground mb-4 font-mono">Contestants</h2>
            <PublicRoleList subEventIds={allSubEventIds} role="contestants" />
          </section>
        )}

        {/* Sponsors */}
        {sponsors && sponsors.length > 0 && <SponsorsStrip sponsors={sponsors} />}

        {/* News Feed */}
        {updates && updates.length > 0 && <NewsFeed updates={updates} />}
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted-foreground space-y-3">
        {socialLinks && Object.keys(socialLinks).some(k => socialLinks[k]) && (
          <div className="flex justify-center">
            <SocialLinks links={socialLinks} />
          </div>
        )}
        <p>Powered by <span className="font-mono font-medium text-foreground">PHNYX.DEV</span></p>
      </footer>
    </div>
  );
}
