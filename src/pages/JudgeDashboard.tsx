import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyAssignedSubEvents } from "@/hooks/useSubEventAssignments";
import { useCompetitions, useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useJudgeScoresRealtime } from "@/hooks/useJudgeScores";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, ClipboardList, User, ChevronRight, Star, Info, FileText, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useRubricCriteria, usePenaltyRules } from "@/hooks/useCompetitions";
import { PublicRubric } from "@/components/public/PublicRubric";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

export default function JudgeDashboard() {
    const { user } = useAuth();
    const { data: myAssignments, isLoading: assignmentsLoading } = useMyAssignedSubEvents("judge");
    const { data: competitions } = useCompetitions();

    // Get distinct competition IDs from assignments
    const assignedCompIds = useMemo(() => {
        if (!myAssignments) return [];
        return [...new Set(myAssignments.map((a) => a.sub_event_id))]; // Wait, assignments have sub_event_id. We need the competition_id.
    }, [myAssignments]);

    // Fetch sub-event details to get competition_id and level_id
    const { data: subEventDetails } = useQuery({
        queryKey: ["assigned_sub_events_details", assignedCompIds],
        enabled: assignedCompIds.length > 0,
        queryFn: async () => {
            const { data, error } = await supabase
                .from("sub_events")
                .select("*, level:competition_levels(*)")
                .in("id", assignedCompIds);
            if (error) throw error;
            return data;
        },
    });

    const assignedCompetitions = useMemo(() => {
        if (!subEventDetails || !competitions) return [];
        const compIds = [...new Set(subEventDetails.map((se) => se.level.competition_id))];
        return competitions.filter((c) => compIds.includes(c.id));
    }, [subEventDetails, competitions]);

    if (assignmentsLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!myAssignments || myAssignments.length === 0) {
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
                    />
                ))}
            </div>
        </div>
    );
}

function CompetitionAssignmentSection({ competition, subEventDetails }: { competition: any, subEventDetails: any[] }) {
    const { data: criteria } = useRubricCriteria(competition.id);
    const { data: penalties } = usePenaltyRules(competition.id);
    const rulesUrl = (competition as any).rules_url as string | undefined;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                    Competition
                </Badge>
                <h2 className="text-lg font-bold">{competition.name}</h2>
            </div>

            {/* Collapsible Rubric & Rules */}
            <Collapsible>
                <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs">
                        <Info className="h-3.5 w-3.5" /> View Rules & Rubric
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4">
                    {rulesUrl && (
                        <Card className="border-border/50 bg-card/80 p-4 flex items-center justify-between gap-4">
                            <div className="flex gap-3 items-center">
                                <FileText className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-medium text-sm">Official Rules</p>
                                    <p className="text-xs text-muted-foreground">Competition handbook</p>
                                </div>
                            </div>
                            <a href={rulesUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm flex items-center gap-1 hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" /> View
                            </a>
                        </Card>
                    )}
                    <PublicRubric criteria={criteria || []} penalties={penalties || []} />
                </CollapsibleContent>
            </Collapsible>

            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                {subEventDetails.map((se) => (
                    <SubEventCard key={se.id} subEvent={se} competitionId={competition.id} />
                ))}
            </div>
        </div>
    );
}

function SubEventCard({ subEvent, competitionId }: { subEvent: any, competitionId: string }) {
    const { data: registrations } = useRegistrations(competitionId);
    const contestants = useMemo(() => {
        return (registrations || []).filter((r) => r.sub_event_id === subEvent.id && r.status === "approved");
    }, [registrations, subEvent.id]);

    return (
        <Card className="border-border/50 bg-card/80 overflow-hidden hover:border-primary/30 transition-colors">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base">{subEvent.name}</CardTitle>
                        <CardDescription className="text-xs font-mono">
                            Level: {subEvent.level?.name}
                        </CardDescription>
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

                <Button asChild variant="outline" className="w-full text-xs" size="sm">
                    <Link to={`/competitions/${competitionId}/score?sub_event=${subEvent.id}`}>
                        <ClipboardList className="h-3.5 w-3.5 mr-2" /> Full Score Sheet
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}
