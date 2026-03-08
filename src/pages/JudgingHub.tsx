import { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStaffDisplayNames } from "@/hooks/useStaffDisplayNames";
import { CardGridSkeleton } from "@/components/shared/PageSkeletons";
import { Link } from "react-router-dom";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffView } from "@/hooks/useStaffView";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, ChevronRight, ChevronDown, Trophy, Search } from "lucide-react";
import { motion } from "framer-motion";


const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
import { useJudgingOverview } from "@/hooks/useJudgingOverview";

export function JudgingHubContent() {
  const { hasRole } = useAuth();
  const isPrivileged = hasRole("admin") || hasRole("organizer");
  const { data: allCompetitions, isLoading: allCompsLoading } = useCompetitions();
  const { assignedCompetitions, isLoading: staffLoading } = useStaffView();

  const compsLoading = isPrivileged ? allCompsLoading : staffLoading;
  const competitions = isPrivileged ? allCompetitions : assignedCompetitions;

  const activeComps = useMemo(
    () => (competitions || []).filter((c) => c.status === "active" || c.status === "completed"),
    [competitions]
  );
  const [selectedCompId, setSelectedCompId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedContestant, setExpandedContestant] = useState<string | null>(null);
  const [selectedLevelTab, setSelectedLevelTab] = useState("");
  const isMobile = useIsMobile();

  const { data: overview, isLoading: overviewLoading } = useJudgingOverview(selectedCompId || undefined);

  const filteredComps = useMemo(() => {
    if (!searchQuery.trim()) return activeComps;
    const q = searchQuery.toLowerCase();
    return activeComps.filter((c) => c.name.toLowerCase().includes(q));
  }, [activeComps, searchQuery]);

  const overviewUserIds = useMemo(() => (overview?.profiles || []).map((p: any) => p.user_id), [overview?.profiles]);
  const profileMap = useStaffDisplayNames(overviewUserIds);

  const rubricNames = useMemo(
    () => (overview?.rubric || []).map((r: any) => r.name),
    [overview?.rubric]
  );

  if (compsLoading) return <CardGridSkeleton cards={3} />;

  return (
    <div className="space-y-6">

      {/* Competition table with search */}
      <Card className="border-border/50 bg-card/80 mb-6">
        <CardContent className="pt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search competitions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {filteredComps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No competitions found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competition</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Start</TableHead>
                    <TableHead className="text-center">End</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComps.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer transition-colors ${selectedCompId === c.id ? "bg-primary/10" : ""}`}
                      onClick={() => setSelectedCompId(c.id)}
                    >
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs">{c.start_date || "—"}</TableCell>
                      <TableCell className="text-center font-mono text-xs">{c.end_date || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overview with tabbed levels */}
      {selectedCompId && overviewLoading && (
        <CardGridSkeleton cards={2} />
      )}

      {selectedCompId && overview && (
        <>
          {overview.levels.length === 0 ? (
            <Card className="border-border/50 bg-card/80">
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No levels configured for this competition yet.
              </CardContent>
            </Card>
          ) : (
            <Tabs value={selectedLevelTab || overview.levels[0]?.id} onValueChange={setSelectedLevelTab} className="w-full">
              {isMobile ? (
                <Select value={selectedLevelTab || overview.levels[0]?.id} onValueChange={setSelectedLevelTab}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {overview.levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
              <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {overview.levels.map((level) => (
                  <TabsTrigger key={level.id} value={level.id} className="text-xs sm:text-sm flex-1 min-w-[80px]">
                    {level.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              )}

              {overview.levels.map((level) => {
                const levelSubEvents = overview.subEvents.filter((se) => se.level_id === level.id);
                return (
                  <TabsContent key={level.id} value={level.id}>
                    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4 mt-4">
                      <div className="flex justify-end">
                        <Button asChild variant="default" size="sm">
                          <Link to={`/competitions/${selectedCompId}/level-sheet?level=${level.id}`}>
                            <Trophy className="h-3.5 w-3.5 mr-1.5" />
                            Level Master Sheet
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                      {levelSubEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No sub-events yet.</p>
                      ) : (
                        levelSubEvents.map((se) => {
                          const judges = overview.assignments.filter((a: any) => a.sub_event_id === se.id);
                          const contestants = overview.registrations.filter((r: any) => r.sub_event_id === se.id);
                          const seScores = (overview.scores || []).filter((s) => s.sub_event_id === se.id);

                          return (
                            <motion.div key={se.id} variants={item}>
                              <Card className="border-border/40 bg-card/80">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <CardTitle className="text-sm">{se.name}</CardTitle>
                                      <CardDescription className="font-mono text-xs">
                                        {se.event_date || "No date"} {se.start_time ? `• ${se.start_time}` : ""}
                                      </CardDescription>
                                    </div>
                                    <Badge
                                      className={
                                        se.status === "in_progress"
                                          ? "bg-primary/20 text-primary"
                                          : se.status === "completed"
                                          ? "bg-secondary/20 text-secondary"
                                          : "bg-muted text-muted-foreground"
                                      }
                                    >
                                      {se.status}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {/* Judges */}
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                      Judges ({judges.length})
                                    </p>
                                    {judges.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">No judges assigned</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {judges.map((j: any) => (
                                          <span
                                            key={j.id}
                                            className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                                          >
                                            {profileMap.get(j.user_id) || "Unknown"}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Contestants – link to overview */}
                                  <div>
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                                      Contestants ({contestants.length})
                                    </p>
                                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                                      <Link to={`/competitions/${selectedCompId}/contestant-scores?sub_event=${se.id}`}>
                                        <ChevronRight className="h-3.5 w-3.5 mr-1.5" /> Contestant Scores Overview
                                      </Link>
                                    </Button>
                                  </div>

                                  {/* Score sheet link */}
                                  <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                                    <Link to={`/competitions/${selectedCompId}/master-sheet?sub_event=${se.id}`}>
                                      <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                      Master Score Sheet
                                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                    </Link>
                                  </Button>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })
                      )}
                    </motion.div>
                  </TabsContent>
                );
              })}
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}

export default function JudgingHub() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> Judging Hub
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a competition to view score sheets and judges per level.
        </p>
      </div>
      <JudgingHubContent />
    </div>
  );
}
