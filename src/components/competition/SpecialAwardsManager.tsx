import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Award, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface SpecialAward {
  id: string;
  competition_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export function useSpecialAwards(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["special_awards", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_awards")
        .select("*")
        .eq("competition_id", competitionId!)
        .order("sort_order");
      if (error) throw error;
      return data as SpecialAward[];
    },
  });
}

export function useCreateSpecialAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { competition_id: string; name: string; description?: string; sort_order: number }) => {
      const { data, error } = await supabase.from("special_awards").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["special_awards", v.competition_id] });
      toast({ title: "Special award added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteSpecialAward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, competition_id }: { id: string; competition_id: string }) => {
      const { error } = await supabase.from("special_awards").delete().eq("id", id);
      if (error) throw error;
      return competition_id;
    },
    onSuccess: (cid) => {
      qc.invalidateQueries({ queryKey: ["special_awards", cid] });
      toast({ title: "Special award deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

const PRESET_AWARDS = [
  "Best Performing School",
  "Best Student Choreographer",
  "Most Disciplined School",
  "Best Costumed Group",
  "Best Overall Folk Dance",
  "Most Outstanding Dancer (Male)",
  "Most Outstanding Dancer (Female)",
  "Best Classical Dance",
  "Best Limbo Dance",
];

export function SpecialAwardsManager({ competitionId }: { competitionId: string }) {
  const { data: awards } = useSpecialAwards(competitionId);
  const create = useCreateSpecialAward();
  const remove = useDeleteSpecialAward();
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    create.mutate({
      competition_id: competitionId,
      name: newName.trim(),
      description: newDesc.trim() || undefined,
      sort_order: awards?.length || 0,
    }, { onSuccess: () => { setNewName(""); setNewDesc(""); } });
  };

  const handlePreset = (preset: string) => {
    const exists = awards?.some(a => a.name === preset);
    if (exists) return;
    create.mutate({
      competition_id: competitionId,
      name: preset,
      sort_order: awards?.length || 0,
    });
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">Special Awards</CardTitle>
        </div>
        <CardDescription>
          Define challenge trophies and special prizes for final rounds. Judges vote for these separately from rubric scoring.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Quick add presets:</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_AWARDS.map((preset) => {
              const exists = awards?.some(a => a.name === preset);
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={exists}
                  onClick={() => handlePreset(preset)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    exists
                      ? "bg-muted/30 text-muted-foreground/50 border-border/30 cursor-not-allowed"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer"
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Award name (e.g. Best Costume)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button size="sm" onClick={handleAdd} disabled={create.isPending || !newName.trim()} className="h-8">
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          <Input
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {awards?.length ? (
          <div className="space-y-1.5">
            {awards.map((a, i) => (
              <div key={a.id} className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5">{i + 1}</Badge>
                  <div>
                    <span className="text-sm font-medium">{a.name}</span>
                    {a.description && <p className="text-xs text-muted-foreground">{a.description}</p>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => remove.mutate({ id: a.id, competition_id: competitionId })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No special awards defined. Use presets or add custom awards above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
