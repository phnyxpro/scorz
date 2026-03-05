import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffView } from "@/hooks/useStaffView";
import { useRegistrations } from "@/hooks/useRegistrations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, User, ChevronRight, Star, ClipboardList } from "lucide-react";

export default function JudgeDashboard() {
    const { assignedCompetitions, subEventDetails, isLoading } = useStaffView("judge");

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
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
                <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                    Competition
                </Badge>
                <h2 className="text-lg font-bold">{competition.name}</h2>
            </div>

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
