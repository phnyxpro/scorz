import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStaffView } from "@/hooks/useStaffView";
import { useRegistrations } from "@/hooks/useRegistrations";
import { usePenaltyRules, useInfractions } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, User, ChevronRight, Star, ClipboardList, FileText, Info, ShieldCheck, MessageSquare, AlertTriangle, Timer, Ban } from "lucide-react";
import { EventChat } from "@/components/chat/EventChat";
import { useChatUnreadCount } from "@/hooks/useEventChat";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

export default function JudgeDashboard() {
    const { assignedCompetitions, subEventDetails, myAssignments, isLoading } = useStaffView("judge");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!assignedCompetitions || assignedCompetitions.length === 0) {
        return (
            <Card className="border-border/50 bg-card/80">
                <CardContent className="py-12 text-center">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold mb-2">No Assignments</h2>
                    <p className="text-muted-foreground">You don't have any judging assignments at the moment.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Star className="h-6 w-6 text-primary" /> Judge Dashboard
                    <ConnectionIndicator />
                </h1>
                <p className="text-muted-foreground">
                    Welcome back. You have assignments in {assignedCompetitions.length} competition(s).
                </p>
            </div>

            <div className="grid gap-6">
                {assignedCompetitions.map((comp) => (
                    <CompetitionAssignmentSection
                        key={comp.id}
                        competition={comp}
                        subEventDetails={subEventDetails?.filter(se => se.level.competition_id === comp.id) || []}
                        myAssignments={myAssignments || []}
                    />
                ))}
            </div>
        </div>
    );
}

function CompetitionAssignmentSection({ competition, subEventDetails, myAssignments }: { competition: any, subEventDetails: any[], myAssignments: any[] }) {
    const unreadCount = useChatUnreadCount(competition.id);
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                    Competition
                </Badge>
                <h2 className="text-lg font-bold">{competition.name}</h2>
            </div>

            {/* Quick links to Rules & Rubric */}
            <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link to={`/competitions/${competition.id}/rules`}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> Rules
                    </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link to={`/competitions/${competition.id}/penalties`}>
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Penalties
                    </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="text-xs">
                    <Link to={`/competitions/${competition.id}/rubric`}>
                        <Info className="h-3.5 w-3.5 mr-1" /> Rubric
                    </Link>
                </Button>
            </div>

            {/* Inline Penalties & Disqualifications */}
            <PenaltiesOverview competitionId={competition.id} />

            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {subEventDetails.map((se) => {
                    const isChiefForThis = myAssignments.some(
                        (a: any) => a.sub_event_id === se.id && a.is_chief
                    );
                    return (
                        <SubEventCard
                            key={se.id}
                            subEvent={se}
                            competitionId={competition.id}
                            isChief={isChiefForThis}
                        />
                    );
                })}
            </div>

            {/* Event Chat */}
            <Collapsible>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full gap-2 text-xs relative">
                        <MessageSquare className="h-4 w-4" /> Production Chat
                        {unreadCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                    <EventChat competitionId={competition.id} />
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

function SubEventCard({ subEvent, competitionId, isChief }: { subEvent: any, competitionId: string, isChief: boolean }) {
    const { data: registrations } = useRegistrations(competitionId);
    const contestants = useMemo(() => {
        return (registrations || []).filter((r) => r.sub_event_id === subEvent.id && r.status === "approved");
    }, [registrations, subEvent.id]);

    return (
        <Card className="border-border/50 bg-card/80 overflow-hidden hover:border-secondary/30 transition-colors">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{subEvent.name}</CardTitle>
                            {isChief && (
                                <Badge variant="outline" className="text-[10px] border-primary/50 text-primary gap-0.5">
                                    <ShieldCheck className="h-2.5 w-2.5" /> Chief
                                </Badge>
                            )}
                        </div>
                        <CardDescription className="text-xs font-mono">
                            Level: {subEvent.level?.name}
                        </CardDescription>
                        {(subEvent.event_date || subEvent.start_time) && (
                            <CardDescription className="text-xs font-mono mt-0.5">
                                {subEvent.event_date || ""}{subEvent.start_time ? ` • ${subEvent.start_time}` : ""}{subEvent.end_time ? ` – ${subEvent.end_time}` : ""}
                            </CardDescription>
                        )}
                        {subEvent.location && (
                            <CardDescription className="text-xs mt-0.5">{subEvent.location}</CardDescription>
                        )}
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                        {contestants.length} Contestants
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {contestants.slice(0, 3).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                            <span className="font-medium">{c.full_name}</span>
                            <div className="flex gap-2">
                                <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[10px]">
                                    <Link to={`/profile/${c.user_id}`}>
                                        <User className="h-3 w-3 mr-1" /> Profile
                                    </Link>
                                </Button>
                                <Button asChild variant="default" size="sm" className="h-7 px-2 text-[10px]">
                                    <Link to={`/competitions/${competitionId}/score?sub_event=${subEvent.id}&contestant=${c.id}`}>
                                        <ChevronRight className="h-3 w-3" /> Score
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                    {contestants.length > 3 && (
                        <p className="text-[10px] text-muted-foreground text-center pt-1 font-mono">
                            + {contestants.length - 3} more contestants
                        </p>
                    )}
                    {contestants.length === 0 && (
                        <p className="text-xs text-muted-foreground italic text-center py-2">
                            No approved contestants yet.
                        </p>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1 text-xs" size="sm">
                        <Link to={`/competitions/${competitionId}/score?sub_event=${subEvent.id}`}>
                            <ClipboardList className="h-3.5 w-3.5 mr-2" /> Full Score Sheet
                        </Link>
                    </Button>
                    {isChief && (
                        <Button asChild variant="secondary" className="text-xs" size="sm">
                            <Link to={`/competitions/${competitionId}/chief-judge`}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Chief Panel
                            </Link>
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
}

function PenaltiesOverview({ competitionId }: { competitionId: string }) {
    const { data: rules } = usePenaltyRules(competitionId);
    const { data: infractions } = useInfractions(competitionId);

    const penalties = infractions?.filter(i => i.category === "penalty") || [];
    const disqualifications = infractions?.filter(i => i.category === "disqualification") || [];
    const hasContent = (rules && rules.length > 0) || penalties.length > 0 || disqualifications.length > 0;

    if (!hasContent) return null;

    return (
        <Collapsible>
            <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full gap-2 text-xs">
                    <AlertTriangle className="h-4 w-4" /> Penalties & Disqualifications
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4">
                {/* Time Penalties */}
                {rules && rules.length > 0 && (
                    <Card className="border-border/50 bg-card/80">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Timer className="h-4 w-4 text-secondary" />
                                <CardTitle className="text-sm">Time Penalties</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {rules.map((r) => (
                                <div key={r.id} className="flex items-center gap-2 text-sm bg-muted/30 rounded-md px-3 py-1.5">
                                    <Timer className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="font-mono text-foreground">
                                        {formatTime(r.from_seconds)} {r.to_seconds ? `→ ${formatTime(r.to_seconds)}` : "+"}
                                    </span>
                                    <span className="text-destructive font-bold">−{r.penalty_points}pts</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* General Penalties */}
                {penalties.length > 0 && (
                    <Card className="border-border/50 bg-card/80">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-secondary" />
                                <CardTitle className="text-sm">General Penalties</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {penalties.map((p) => (
                                <div key={p.id} className="bg-muted/30 rounded-md px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">{p.title}</span>
                                        <Badge variant="destructive" className="font-mono text-[10px]">−{p.penalty_points}pts</Badge>
                                    </div>
                                    {p.description && <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Disqualifications */}
                {disqualifications.length > 0 && (
                    <Card className="border-border/50 bg-card/80">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2">
                                <Ban className="h-4 w-4 text-destructive" />
                                <CardTitle className="text-sm">Disqualification Rules</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            {disqualifications.map((d) => (
                                <div key={d.id} className="bg-muted/30 rounded-md px-3 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">{d.title}</span>
                                        <Badge variant="destructive" className="text-[10px]">DQ</Badge>
                                    </div>
                                    {d.description && <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}
