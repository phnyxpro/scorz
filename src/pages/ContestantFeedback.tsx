import { useState, useMemo } from "react";
import { ArrowLeft, MessageSquare, Star, Heart, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useContestantRegistrations, useCompetitionNames, useContestantScores, useContestantVotes } from "@/hooks/useContestantProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

export default function ContestantFeedback() {
  const { user } = useAuth();
  const [selectedCompId, setSelectedCompId] = useState<string>("");

  const { data: registrations, isLoading: regsLoading } = useContestantRegistrations(user?.id);

  const compIds = useMemo(() => [...new Set(registrations?.map(r => r.competition_id) || [])], [registrations]);
  const { data: competitions } = useCompetitionNames(compIds);

  const selectedRegs = useMemo(
    () => registrations?.filter(r => r.competition_id === selectedCompId) || [],
    [registrations, selectedCompId]
  );
  const regIds = useMemo(() => selectedRegs.map(r => r.id), [selectedRegs]);

  const { data: scores } = useContestantScores(regIds);
  const { data: voteCounts } = useContestantVotes(regIds);

  // Fetch rubric criteria for the selected competition
  const { data: criteria } = useQuery({
    queryKey: ["rubric_criteria", selectedCompId],
    enabled: !!selectedCompId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rubric_criteria")
        .select("id, name, sort_order")
        .eq("competition_id", selectedCompId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch the competition's peoples choice toggle
  const { data: compSettings } = useQuery({
    queryKey: ["comp_pc_toggle", selectedCompId],
    enabled: !!selectedCompId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("show_peoples_choice_to_contestants, voting_enabled")
        .eq("id", selectedCompId)
        .single();
      if (error) throw error;
      return data as { show_peoples_choice_to_contestants: boolean; voting_enabled: boolean };
    },
  });

  const criteriaMap = useMemo(() => {
    const m: Record<string, string> = {};
    criteria?.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [criteria]);

  const totalVotes = useMemo(() => {
    if (!voteCounts) return 0;
    return Object.values(voteCounts).reduce((s, v) => s + v, 0);
  }, [voteCounts]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Feedback</h1>
          <p className="text-muted-foreground text-sm">View judge scores and audience feedback</p>
        </div>
      </div>

      {/* Competition Selector */}
      <Card className="border-border/50 bg-card/80 mb-6">
        <CardContent className="pt-4">
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Select Competition</label>
          <Select value={selectedCompId} onValueChange={setSelectedCompId}>
            <SelectTrigger>
              <SelectValue placeholder={regsLoading ? "Loading…" : "Choose a competition"} />
            </SelectTrigger>
            <SelectContent>
              {competitions?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!regsLoading && (!competitions || competitions.length === 0) && (
            <p className="text-xs text-muted-foreground mt-2">You have no competition registrations yet.</p>
          )}
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {selectedCompId && (
          <motion.div
            key={selectedCompId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* Judge Feedback Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 text-accent" />
                <h2 className="font-semibold text-foreground">Judge Scores & Comments</h2>
              </div>

              {!scores || scores.length === 0 ? (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    <Lock className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    No certified scores available yet. Scores appear here once the chief judge certifies results.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {scores.map((score) => (
                    <Card key={score.id} className="border-border/50 bg-card/80">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">Score Card</CardTitle>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {score.final_score.toFixed(1)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Criterion breakdown */}
                        {score.criterion_scores && typeof score.criterion_scores === "object" && (
                          <div className="space-y-1.5">
                            {Object.entries(score.criterion_scores as Record<string, number>).map(([critId, val]) => (
                              <div key={critId} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground truncate mr-2">
                                  {criteriaMap[critId] || "Criterion"}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-accent rounded-full transition-all"
                                      style={{ width: `${(val / 5) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-mono w-6 text-right text-foreground">{val}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {score.time_penalty > 0 && (
                          <p className="text-xs text-destructive">Time penalty: -{score.time_penalty}</p>
                        )}

                        {score.comments && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Judge Comments</p>
                              <p className="text-sm text-foreground leading-relaxed">{score.comments}</p>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* People's Choice Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-accent" />
                <h2 className="font-semibold text-foreground">People's Choice</h2>
              </div>

              {compSettings?.show_peoples_choice_to_contestants ? (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="py-6 text-center">
                    <div className="text-4xl font-bold font-mono text-accent mb-1">{totalVotes}</div>
                    <p className="text-sm text-muted-foreground">
                      {totalVotes === 1 ? "vote received" : "votes received"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50 bg-card/80">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    <Lock className="h-5 w-5 mx-auto mb-2 opacity-50" />
                    People's Choice results are not yet available.
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
