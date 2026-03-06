import { useState, useMemo } from "react";
import { useInfractions } from "@/hooks/useCompetitions";
import { useCertification, useUpsertCertification, ChiefJudgeCertification } from "@/hooks/useChiefJudge";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Ban, Plus, X } from "lucide-react";

export interface AppliedInfraction {
  infraction_id: string;
  title: string;
  penalty_points: number;
  category: "penalty" | "disqualification";
}

interface InfractionApplicatorProps {
  competitionId: string;
  subEventId: string;
  contestantIds: string[];
  contestantName: (regId: string) => string;
  isCertified: boolean;
}

export function InfractionApplicator({
  competitionId,
  subEventId,
  contestantIds,
  contestantName,
  isCertified,
}: InfractionApplicatorProps) {
  const { user } = useAuth();
  const { data: infractions } = useInfractions(competitionId);
  const { data: certification } = useCertification(subEventId);
  const upsertCert = useUpsertCertification();

  const [selectedContestant, setSelectedContestant] = useState("");
  const [selectedInfraction, setSelectedInfraction] = useState("");

  // Parse applied infractions from certification penalty_adjustments
  const appliedInfractions = useMemo(() => {
    const adj = ((certification?.penalty_adjustments || {}) as unknown) as Record<string, AppliedInfraction[]>;
    const result: { contestantId: string; infraction: AppliedInfraction }[] = [];
    for (const [cId, items] of Object.entries(adj)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item.infraction_id) {
            result.push({ contestantId: cId, infraction: item });
          }
        }
      }
    }
    return result;
  }, [certification]);

  const handleApply = async () => {
    if (!selectedContestant || !selectedInfraction || !user) return;
    const inf = infractions?.find(i => i.id === selectedInfraction);
    if (!inf) return;

    const currentAdj = (certification?.penalty_adjustments || {}) as Record<string, AppliedInfraction[]>;
    const contestantInfractions = Array.isArray(currentAdj[selectedContestant]) ? [...currentAdj[selectedContestant]] : [];

    // Prevent duplicates
    if (contestantInfractions.some(ci => ci.infraction_id === inf.id)) return;

    contestantInfractions.push({
      infraction_id: inf.id,
      title: inf.title,
      penalty_points: inf.penalty_points,
      category: inf.category,
    });

    const newAdj = { ...currentAdj, [selectedContestant]: contestantInfractions };

    await upsertCert.mutateAsync({
      id: certification?.id,
      sub_event_id: subEventId,
      chief_judge_id: user.id,
      penalty_adjustments: newAdj,
    } as any);

    setSelectedInfraction("");
  };

  const handleRemove = async (contestantId: string, infractionId: string) => {
    if (!user || !certification) return;
    const currentAdj = (certification.penalty_adjustments || {}) as Record<string, AppliedInfraction[]>;
    const updated = (currentAdj[contestantId] || []).filter(i => i.infraction_id !== infractionId);
    const newAdj = { ...currentAdj, [contestantId]: updated };
    if (updated.length === 0) delete newAdj[contestantId];

    await upsertCert.mutateAsync({
      id: certification.id,
      sub_event_id: subEventId,
      chief_judge_id: user.id,
      penalty_adjustments: newAdj,
    } as any);
  };

  if (!infractions?.length) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">No infraction rules defined for this competition.</p>
        </CardContent>
      </Card>
    );
  }

  const penalties = infractions.filter(i => i.category === "penalty");
  const disqualifications = infractions.filter(i => i.category === "disqualification");

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Infractions & Disqualifications</CardTitle>
        <CardDescription>Apply general penalties or disqualifications to contestants</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Applied infractions list */}
        {appliedInfractions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Applied</h4>
            {appliedInfractions.map(({ contestantId, infraction }) => (
              <div key={`${contestantId}-${infraction.infraction_id}`} className="flex items-center justify-between bg-destructive/5 border border-destructive/15 rounded-md px-3 py-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {infraction.category === "disqualification" ? (
                    <Ban className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-secondary shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{contestantName(contestantId)}</span>
                  <span className="text-xs text-muted-foreground">—</span>
                  <span className="text-xs text-muted-foreground truncate">{infraction.title}</span>
                  {infraction.penalty_points > 0 && (
                    <Badge variant="destructive" className="font-mono text-[10px] shrink-0">−{infraction.penalty_points}pts</Badge>
                  )}
                  {infraction.category === "disqualification" && (
                    <Badge variant="destructive" className="text-[10px] shrink-0">DQ</Badge>
                  )}
                </div>
                {!isCertified && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => handleRemove(contestantId, infraction.infraction_id)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Apply form */}
        {!isCertified && (
          <div className="space-y-3 border-t border-border/50 pt-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Apply Infraction</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Contestant</label>
                <Select value={selectedContestant} onValueChange={setSelectedContestant}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select contestant" /></SelectTrigger>
                  <SelectContent>
                    {contestantIds.map(id => (
                      <SelectItem key={id} value={id}>{contestantName(id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Infraction</label>
                <Select value={selectedInfraction} onValueChange={setSelectedInfraction}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select infraction" /></SelectTrigger>
                  <SelectContent>
                    {penalties.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-mono uppercase text-muted-foreground">Penalties</div>
                        {penalties.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.title} (−{p.penalty_points}pts)
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {disqualifications.length > 0 && (
                      <>
                        <div className="px-2 py-1 text-[10px] font-mono uppercase text-muted-foreground">Disqualifications</div>
                        {disqualifications.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.title} (DQ)
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleApply}
              disabled={!selectedContestant || !selectedInfraction || upsertCert.isPending}
              className="w-full"
            >
              <Plus className="h-3 w-3 mr-1" /> Apply Infraction
            </Button>
          </div>
        )}

        {appliedInfractions.length === 0 && isCertified && (
          <p className="text-xs text-muted-foreground italic text-center">No infractions were applied.</p>
        )}
      </CardContent>
    </Card>
  );
}
