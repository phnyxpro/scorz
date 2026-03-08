import { useMemo } from "react";
import { ProfileSkeleton } from "@/components/shared/PageSkeletons";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useContestantRegistrations,
  useCompetitionNames,
  useContestantScores,
  useContestantVotes,
  useSubEventNames,
} from "@/hooks/useContestantProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Trophy, Star, Heart, MapPin, Mail, Phone, Calendar, Video, Award, FileText, Shield, Globe, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { ContestantMediaGallery } from "@/components/contestant/MediaGallery";

const statusColor: Record<string, string> = {
  approved: "bg-secondary/20 text-secondary border-secondary/30",
  pending: "bg-primary/20 text-primary border-primary/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function ContestantProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isJudgeViewer = hasRole("judge") && userId && userId !== user?.id;

  const profileUserId = userId || user?.id;
  const isOwnProfile = profileUserId === user?.id;

  const { data: registrations, isLoading } = useContestantRegistrations(profileUserId);

  const competitionIds = useMemo(
    () => [...new Set((registrations || []).map((r) => r.competition_id))],
    [registrations]
  );
  const registrationIds = useMemo(
    () => (registrations || []).map((r) => r.id),
    [registrations]
  );
  const subEventIds = useMemo(
    () => [...new Set((registrations || []).filter((r) => r.sub_event_id).map((r) => r.sub_event_id!))],
    [registrations]
  );

  const { data: competitions } = useCompetitionNames(competitionIds);
  const { data: scores } = useContestantScores(registrationIds);
  const { data: voteCounts } = useContestantVotes(registrationIds);
  const { data: subEvents } = useSubEventNames(subEventIds);

  const compMap = useMemo(() => {
    const m: Record<string, { name: string; status: string }> = {};
    (competitions || []).forEach((c) => (m[c.id] = c));
    return m;
  }, [competitions]);

  const subEventMap = useMemo(() => {
    const m: Record<string, { name: string; event_date: string | null }> = {};
    (subEvents || []).forEach((s) => (m[s.id] = s));
    return m;
  }, [subEvents]);

  // Aggregate scores per registration
  const scoresByReg = useMemo(() => {
    const m: Record<string, { avgFinal: number; count: number; certified: number }> = {};
    (scores || []).forEach((s) => {
      if (!m[s.contestant_registration_id]) {
        m[s.contestant_registration_id] = { avgFinal: 0, count: 0, certified: 0 };
      }
      const entry = m[s.contestant_registration_id];
      entry.avgFinal += s.final_score;
      entry.count += 1;
      if (s.is_certified) entry.certified += 1;
    });
    for (const k of Object.keys(m)) {
      if (m[k].count > 0) m[k].avgFinal /= m[k].count;
    }
    return m;
  }, [scores]);

  const latestReg = registrations?.[0];
  const totalVotes = Object.values(voteCounts || {}).reduce((a, b) => a + b, 0);
  const totalComps = competitionIds.length;
  const avgScore =
    Object.values(scoresByReg).length > 0
      ? Object.values(scoresByReg).reduce((a, b) => a + b.avgFinal, 0) / Object.values(scoresByReg).length
      : 0;

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!registrations || registrations.length === 0) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Card className="border-border/50 bg-card/80">
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{isOwnProfile ? "You haven't registered for any competitions yet." : "No contestant profile found."}</p>
            {isOwnProfile && (
              <Button className="mt-4" onClick={() => navigate("/competitions")}>
                Browse Competitions
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      {/* Hero / Bio Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/50 bg-card/80 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar area */}
              <div className="flex-shrink-0">
                {latestReg?.profile_photo_url ? (
                  <img
                    src={latestReg.profile_photo_url}
                    alt={latestReg.full_name}
                    className="w-24 h-24 rounded-xl object-cover border-2 border-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-muted flex items-center justify-center border-2 border-border">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{latestReg?.full_name}</h1>
                  <Badge className={statusColor[latestReg?.age_category || "adult"] || "bg-muted text-muted-foreground"}>
                    {latestReg?.age_category === "minor" ? "Minor" : "Adult"}
                  </Badge>
                </div>

                {latestReg?.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{latestReg.bio}</p>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {latestReg?.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {latestReg.location}</span>
                  )}
                  {latestReg?.email && (
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {latestReg.email}</span>
                  )}
                  {latestReg?.phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {latestReg.phone}</span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex md:flex-col gap-4 md:gap-2 md:text-right">
                <StatBadge icon={Trophy} label="Competitions" value={totalComps} />
                <StatBadge icon={Star} label="Avg Score" value={avgScore > 0 ? avgScore.toFixed(1) : "–"} />
                <StatBadge icon={Heart} label="People's Choice" value={totalVotes} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className={`grid w-full ${isJudgeViewer ? "grid-cols-3" : "grid-cols-5"}`}>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {!isJudgeViewer && <TabsTrigger value="scores">Scores</TabsTrigger>}
          {!isJudgeViewer && <TabsTrigger value="votes">Votes</TabsTrigger>}
        </TabsList>

        {/* Media Gallery Tab */}
        <TabsContent value="media">
          <ContestantMediaGallery userId={profileUserId!} isOwnProfile={isOwnProfile} />
        </TabsContent>

        {/* Registration Details Tab */}
        <TabsContent value="details">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {(registrations || []).map((reg) => {
              const comp = compMap[reg.competition_id];
              const sub = reg.sub_event_id ? subEventMap[reg.sub_event_id] : null;
              const socialHandles = reg.social_handles as Record<string, string> | null;

              return (
                <Card key={reg.id} className="border-border/50 bg-card/80">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{comp?.name || "Unknown Competition"}</CardTitle>
                      <Badge variant="outline" className={`text-[10px] ${statusColor[reg.status] || ""}`}>{reg.status}</Badge>
                    </div>
                    {sub && <CardDescription>{sub.name}{sub.event_date ? ` · ${sub.event_date}` : ""}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Personal Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailField icon={User} label="Full Name" value={reg.full_name} />
                      <DetailField icon={Mail} label="Email" value={reg.email} />
                      <DetailField icon={Phone} label="Phone" value={reg.phone} />
                      <DetailField icon={MapPin} label="Location" value={reg.location} />
                      <DetailField icon={Calendar} label="Age Category" value={reg.age_category === "minor" ? "Minor" : "Adult"} />
                      <DetailField icon={Calendar} label="Registered" value={new Date(reg.created_at).toLocaleDateString()} />
                    </div>

                    {/* Bio */}
                    {reg.bio && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio</p>
                        <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/30">{reg.bio}</p>
                      </div>
                    )}

                    {/* Social Handles */}
                    {socialHandles && Object.keys(socialHandles).length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Social Handles
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(socialHandles).filter(([, v]) => v).map(([platform, handle]) => (
                            <Badge key={platform} variant="outline" className="text-xs font-mono">
                              {platform}: {handle}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Media */}
                    <div className="flex flex-wrap gap-3">
                      {reg.profile_photo_url && (
                        <a href={reg.profile_photo_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                          <User className="h-3 w-3" /> Profile Photo <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {reg.performance_video_url && (
                        <a href={reg.performance_video_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                          <Video className="h-3 w-3" /> Performance Video <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Guardian Info (minors) */}
                    {reg.age_category === "minor" && (reg.guardian_name || reg.guardian_email) && (
                      <div className="space-y-1.5 pt-2 border-t border-border/30">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Shield className="h-3 w-3" /> Guardian Information
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailField icon={User} label="Guardian Name" value={reg.guardian_name} />
                          <DetailField icon={Mail} label="Guardian Email" value={reg.guardian_email} />
                          <DetailField icon={Phone} label="Guardian Phone" value={reg.guardian_phone} />
                        </div>
                      </div>
                    )}

                    {/* Compliance */}
                    <div className="flex flex-wrap gap-3 pt-2 border-t border-border/30">
                      <Badge variant={reg.rules_acknowledged ? "default" : "outline"} className="text-[10px]">
                        <FileText className="h-3 w-3 mr-1" />
                        Rules {reg.rules_acknowledged ? "Acknowledged" : "Not Acknowledged"}
                      </Badge>
                      {reg.contestant_signed_at && (
                        <Badge variant="outline" className="text-[10px]">
                          Signed {new Date(reg.contestant_signed_at).toLocaleDateString()}
                        </Badge>
                      )}
                      {reg.guardian_signed_at && (
                        <Badge variant="outline" className="text-[10px]">
                          Guardian Signed {new Date(reg.guardian_signed_at).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        </TabsContent>

        {/* Performance History Tab */}
        <TabsContent value="history">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Competition History</CardTitle>
                <CardDescription>All competitions this contestant has participated in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(registrations || []).map((reg) => {
                    const comp = compMap[reg.competition_id];
                    const sub = reg.sub_event_id ? subEventMap[reg.sub_event_id] : null;
                    const regScore = scoresByReg[reg.id];
                    const votes = voteCounts?.[reg.id] || 0;

                    return (
                      <div
                        key={reg.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{comp?.name || "Unknown Competition"}</span>
                            <Badge variant="outline" className="text-[10px]">{reg.status}</Badge>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            {sub && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{sub.name}{sub.event_date ? ` · ${sub.event_date}` : ""}</span>}
                            {reg.performance_video_url && <span className="flex items-center gap-1"><Video className="h-3 w-3" /> Video submitted</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          {regScore ? (
                            <div>
                              <p className="font-mono font-bold text-sm text-primary">{regScore.avgFinal.toFixed(2)}</p>
                              <p className="text-[10px] text-muted-foreground">{regScore.certified}/{regScore.count} certified</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No scores</span>
                          )}
                          {votes > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Heart className="h-3 w-3 text-destructive" /> {votes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Score Details Tab */}
        <TabsContent value="scores">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Detailed Scores</CardTitle>
                <CardDescription>Breakdown of scores received from each judge. Scores are visible after full event certification.</CardDescription>
              </CardHeader>
              <CardContent>
                {(scores || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No scores available yet. Scores will appear here after the event is fully certified by the chief judge.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Competition</TableHead>
                          <TableHead className="text-xs text-center">Raw Total</TableHead>
                          <TableHead className="text-xs text-center">Penalty</TableHead>
                          <TableHead className="text-xs text-center">Final</TableHead>
                          <TableHead className="text-xs text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(scores || []).map((s) => {
                          const reg = registrations?.find((r) => r.id === s.contestant_registration_id);
                          const comp = reg ? compMap[reg.competition_id] : null;
                          return (
                            <TableRow key={s.id}>
                              <TableCell className="text-sm">{comp?.name || "–"}</TableCell>
                              <TableCell className="text-center font-mono text-sm">{s.raw_total}</TableCell>
                              <TableCell className="text-center font-mono text-sm text-destructive">
                                {s.time_penalty > 0 ? `-${s.time_penalty}` : "0"}
                              </TableCell>
                              <TableCell className="text-center font-mono font-bold text-primary text-sm">
                                {Number(s.final_score).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center">
                                {s.is_certified ? (
                                  <Badge className="bg-secondary/20 text-secondary text-[10px]">
                                    <Award className="h-3 w-3 mr-1" /> Certified
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">Pending</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Judge Feedback */}
            {(scores || []).some((s) => s.comments && s.is_certified) && (
              <Card className="border-border/50 bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-secondary" /> Judge Feedback
                  </CardTitle>
                  <CardDescription>Comments from judges on your performances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(scores || [])
                    .filter((s) => s.comments && s.is_certified)
                    .map((s) => {
                      const reg = registrations?.find((r) => r.id === s.contestant_registration_id);
                      const comp = reg ? compMap[reg.competition_id] : null;
                      return (
                        <div key={s.id} className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-foreground">{comp?.name || "Unknown"}</span>
                            <span className="text-xs font-mono text-primary font-bold">{s.final_score} pts</span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{s.comments}</p>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* People's Choice Tab */}
        <TabsContent value="votes">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-4 w-4 text-destructive" /> People's Choice
                </CardTitle>
                <CardDescription>Audience votes received across competitions</CardDescription>
              </CardHeader>
              <CardContent>
                {totalVotes === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No audience votes received yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(registrations || [])
                      .filter((r) => (voteCounts?.[r.id] || 0) > 0)
                      .sort((a, b) => (voteCounts?.[b.id] || 0) - (voteCounts?.[a.id] || 0))
                      .map((reg) => {
                        const comp = compMap[reg.competition_id];
                        const votes = voteCounts?.[reg.id] || 0;
                        const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

                        return (
                          <div key={reg.id} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">{comp?.name || "Unknown"}</span>
                              <span className="font-mono text-primary font-bold flex items-center gap-1">
                                <Heart className="h-3 w-3 text-destructive" /> {votes}
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-destructive/70 to-destructive rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        );
                      })}

                    <Separator className="my-4" />
                    <div className="text-center">
                      <p className="text-2xl font-bold font-mono text-foreground">{totalVotes}</p>
                      <p className="text-xs text-muted-foreground">Total Audience Votes</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function StatBadge({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 md:justify-end">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="font-mono font-bold text-sm text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function DetailField({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
