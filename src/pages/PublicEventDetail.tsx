import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetitionSponsors } from "@/hooks/useCompetitionSponsors";
import { useCompetitionUpdates } from "@/hooks/useCompetitionUpdates";
import { useRubricCriteria, usePenaltyRules } from "@/hooks/useCompetitions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Calendar, MapPin, Clock, UserPlus, Ticket,
  FileText, Users, Award, Info, Heart, ExternalLink, Newspaper
} from "lucide-react";
import scorzLogo from "@/assets/logo.png";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { useState } from "react";
import { SocialLinks } from "@/components/public/SocialLinks";
import { AudienceTicketForm } from "@/components/public/AudienceTicketForm";
import { LevelParticipants } from "@/components/public/LevelParticipants";
import { PublicRoleList } from "@/components/public/PublicRoleList";
import { SponsorsStrip } from "@/components/public/SponsorsStrip";
import { NewsFeed } from "@/components/public/NewsFeed";
import { PublicRubric } from "@/components/public/PublicRubric";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "schedule";

  const { data: comp, isLoading } = usePublicCompetition(id);
  const { data: levels } = usePublicLevelsWithSubEvents(id);
  const { data: sponsors } = useCompetitionSponsors(id);
  const { data: updates } = useCompetitionUpdates(id);
  const { data: criteria } = useRubricCriteria(id);
  const { data: penalties } = usePenaltyRules(id);

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

  const allSubEventIds = levels?.flatMap(l => l.sub_events.map((s: any) => s.id)) || [];

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={scorzLogo} alt="Scorz" className="h-6 w-6" />
            <span className="font-bold tracking-tighter text-foreground font-mono">SCORZ</span>
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
            <img src={scorzLogo} alt="Scorz" className="h-16 w-16 opacity-20" />
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

      <div className="max-w-5xl mx-auto px-0 sm:px-6 py-6 space-y-8">
        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <div className="px-4 sm:px-0 overflow-x-auto no-scrollbar">
            <TabsList className="w-full sm:w-auto flex justify-start sm:justify-center mb-6 bg-muted/20 backdrop-blur p-1">
              <TabsTrigger value="schedule" className="flex-1 sm:flex-none gap-2 px-6">
                <Calendar className="h-4 w-4" /> Schedule
              </TabsTrigger>
              <TabsTrigger value="contestants" className="flex-1 sm:flex-none gap-2 px-6">
                <Users className="h-4 w-4" /> Contestants
              </TabsTrigger>
              <TabsTrigger value="judges" className="flex-1 sm:flex-none gap-2 px-6">
                <Award className="h-4 w-4" /> Judges
              </TabsTrigger>
              <TabsTrigger value="voting" className="flex-1 sm:flex-none gap-2 px-6">
                <Heart className="h-4 w-4" /> Voting
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex-1 sm:flex-none gap-2 px-6">
                <Info className="h-4 w-4" /> Rules
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 sm:px-0">
            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {comp.description && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground leading-relaxed text-sm">
                    {comp.description}
                  </motion.p>
                )}

                {comp.status === "active" && (
                  <Button size="lg" className="w-full sm:w-auto" onClick={() => {
                    if (user) navigate(`/competitions/${id}/register`);
                    else navigate(`/auth?redirect=/competitions/${id}/register`);
                  }}>
                    <UserPlus className="h-4 w-4 mr-2" /> Register as Contestant
                  </Button>
                )}

                <div className="space-y-4">
                  {levels && levels.length > 0 ? levels.map(level => (
                    <Card key={level.id} className="border-border/50 bg-card/80 overflow-hidden shadow-sm">
                      {level.banner_url && (
                        <div className="h-32 overflow-hidden">
                          <img src={level.banner_url} alt={level.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{level.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <LevelParticipants subEventIds={level.sub_events.map((s: any) => s.id)} />

                        {level.sub_events.length > 0 ? level.sub_events.map((se: any) => (
                          <div key={se.id} className="border border-border/30 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-muted/10">
                            <div className="space-y-2">
                              {se.banner_url && (
                                <img src={se.banner_url} alt={se.name} className="w-full sm:w-48 h-24 object-cover rounded-md" />
                              )}
                              <div>
                                <p className="font-bold text-base text-foreground">{se.name}</p>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                                  {se.event_date && <span className="flex items-center gap-1 font-mono"><Calendar className="h-3 w-3" />{format(new Date(se.event_date), "MMM d, yyyy")}</span>}
                                  {se.start_time && <span className="flex items-center gap-1 font-mono"><Clock className="h-3 w-3" />{se.start_time}{se.end_time ? ` – ${se.end_time}` : ""}</span>}
                                  {se.location && <span className="flex items-center gap-1 font-mono"><MapPin className="h-3 w-3" />{se.location}</span>}
                                </div>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" className="shrink-0" onClick={() => setSelectedTicketEvent(selectedTicketEvent === se.id ? null : se.id)}>
                              <Ticket className="h-4 w-4 mr-2" /> Get Ticket
                            </Button>
                          </div>
                        )) : (
                          <p className="text-sm text-muted-foreground italic text-center py-4">No sessions scheduled yet.</p>
                        )}

                        {level.sub_events.map((se: any) => (
                          selectedTicketEvent === se.id && (
                            <motion.div key={`ticket-${se.id}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="border border-primary/20 rounded-lg p-4 bg-primary/5 mt-2">
                              <AudienceTicketForm subEventId={se.id} subEventName={se.name} />
                            </motion.div>
                          )
                        ))}
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-muted-foreground text-center py-12 font-mono">No levels defined for this competition yet.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Contestants Tab */}
            <TabsContent value="contestants">
              <div className="max-w-4xl mx-auto">
                <PublicRoleList subEventIds={allSubEventIds} role="contestants" />
              </div>
            </TabsContent>

            {/* Judges Tab */}
            <TabsContent value="judges">
              <div className="max-w-4xl mx-auto">
                <PublicRoleList subEventIds={allSubEventIds} role="judges" />
              </div>
            </TabsContent>

            {/* Voting Tab */}
            <TabsContent value="voting" className="space-y-6 text-center py-12">
              <div className="max-w-md mx-auto space-y-4">
                <Heart className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold font-mono">People's Choice Awards</h2>
                <p className="text-muted-foreground">
                  Supporters can vote for their favorite contestants across all events.
                  Every vote helps promote their artistic journey!
                </p>
                <Button size="lg" className="w-full" onClick={() => navigate(`/competitions/${id}/vote`)}>
                  <Ticket className="h-5 w-5 mr-2" /> Go to Voting Page
                </Button>
              </div>
            </TabsContent>

            {/* Rules & Rubric Tab */}
            <TabsContent value="rules">
              <div className="max-w-4xl mx-auto space-y-8">
                {rulesUrl && (
                  <Card className="border-border/50 bg-card/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Official Rules</h3>
                        <p className="text-sm text-muted-foreground">Download the full competition handbook</p>
                      </div>
                    </div>
                    <Button asChild size="lg" variant="default" className="w-full sm:w-auto">
                      <a href={rulesUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> View Handbook
                      </a>
                    </Button>
                  </Card>
                )}

                <PublicRubric criteria={criteria || []} penalties={penalties || []} />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Sponsors & Updates */}
        <div className="px-4 sm:px-0 space-y-12 border-t border-border/30 pt-12">
          {updates && updates.length > 0 && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <Newspaper className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold font-mono">Latest News</h2>
              </div>
              <NewsFeed updates={updates} />
            </div>
          )}

          {sponsors && sponsors.length > 0 && (
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-5 w-5 text-secondary" />
                <h2 className="text-xl font-bold font-mono">Our Sponsors</h2>
              </div>
              <SponsorsStrip sponsors={sponsors} />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 text-center text-xs text-muted-foreground space-y-4">
        {socialLinks && Object.keys(socialLinks).some(k => socialLinks[k]) && (
          <div className="flex justify-center">
            <SocialLinks links={socialLinks} />
          </div>
        )}
        <div className="space-y-1 font-mono uppercase tracking-widest text-[10px]">
          <p>© {new Date().getFullYear()} {comp.name}</p>
          <p className="font-bold text-foreground">Scorz</p>
        </div>
      </footer>
    </div>
  );
}
