import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Award, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { SpecialAward } from "./SpecialAwardsManager";

interface Registration {
  id: string;
  full_name: string;
}

function useSpecialAwardVotes(competitionId: string | undefined, judgeId: string | undefined) {
  return useQuery({
    queryKey: ["special_award_votes", competitionId, judgeId],
    enabled: !!competitionId && !!judgeId,
    queryFn: async () => {
      // Get all awards for this competition
      const { data: awards } = await supabase
        .from("special_awards")
        .select("id")
        .eq("competition_id", competitionId!);
      if (!awards?.length) return [];
      
      const awardIds = awards.map(a => a.id);
      const { data, error } = await supabase
        .from("special_award_votes")
        .select("*")
        .in("special_award_id", awardIds)
        .eq("judge_id", judgeId!);
      if (error) throw error;
      return data || [];
    },
  });
}

function useUpsertVote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      special_award_id: string;
      judge_id: string;
      contestant_registration_id: string;
      sub_event_id: string;
      competition_id: string;
    }) => {
      const { competition_id, ...insertValues } = values;
      // Upsert (unique on special_award_id + judge_id)
      const { error } = await supabase
        .from("special_award_votes")
        .upsert(insertValues, { onConflict: "special_award_id,judge_id" });
      if (error) throw error;
      return values;
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["special_award_votes", v.competition_id] });
      toast({ title: "Vote saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function SpecialAwardsVoting({
  awards,
  competitionId,
  subEventId,
  contestants,
  disabled,
}: {
  awards: SpecialAward[];
  competitionId: string;
  subEventId: string;
  contestants: Registration[];
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const { data: votes } = useSpecialAwardVotes(competitionId, user?.id);
  const upsert = useUpsertVote();

  // Build lookup: award_id -> contestant_registration_id
  const voteMap = new Map<string, string>();
  for (const v of votes || []) {
    voteMap.set(v.special_award_id, v.contestant_registration_id);
  }

  const handleVote = (awardId: string, contestantId: string) => {
    if (!user || disabled) return;
    upsert.mutate({
      special_award_id: awardId,
      judge_id: user.id,
      contestant_registration_id: contestantId,
      sub_event_id: subEventId,
      competition_id: competitionId,
    });
  };

  if (!awards.length) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-50/5 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          Special Awards Voting
          <Badge variant="outline" className="text-[10px] px-1.5">Final Round</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {awards.map((award) => {
          const currentVote = voteMap.get(award.id);
          return (
            <div key={award.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{award.name}</p>
                {award.description && (
                  <p className="text-[10px] text-muted-foreground truncate">{award.description}</p>
                )}
              </div>
              <Select
                value={currentVote || ""}
                onValueChange={(val) => handleVote(award.id, val)}
                disabled={disabled}
              >
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Select contestant" />
                </SelectTrigger>
                <SelectContent>
                  {contestants.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentVote && (
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
            </div>
          );
        })}
        {disabled && (
          <p className="text-[10px] text-muted-foreground">Voting is locked after certification.</p>
        )}
      </CardContent>
    </Card>
  );
}

// For results display
export function useAllSpecialAwardVotes(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["all_special_award_votes", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data: awards } = await supabase
        .from("special_awards")
        .select("id")
        .eq("competition_id", competitionId!);
      if (!awards?.length) return [];
      
      const awardIds = awards.map(a => a.id);
      const { data, error } = await supabase
        .from("special_award_votes")
        .select("*")
        .in("special_award_id", awardIds);
      if (error) throw error;
      return data || [];
    },
  });
}
