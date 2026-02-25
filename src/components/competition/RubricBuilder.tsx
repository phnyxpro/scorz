import { useState } from "react";
import { useRubricCriteria, useCreateRubricCriterion, useUpdateRubricCriterion, useDeleteRubricCriterion, RubricCriterion } from "@/hooks/useCompetitions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, Wand2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const DEFAULT_CRITERIA = [
  { name: "Voice & Articulation", description_1: "Inaudible or unintelligible", description_2: "Occasionally unclear", description_3: "Generally clear", description_4: "Clear and expressive", description_5: "Exceptional vocal command" },
  { name: "Stage Presence", description_1: "No engagement", description_2: "Minimal engagement", description_3: "Adequate presence", description_4: "Commanding presence", description_5: "Captivating throughout" },
  { name: "Dramatic Appropriateness", description_1: "Inappropriate tone", description_2: "Inconsistent tone", description_3: "Appropriate tone", description_4: "Strong dramatic choices", description_5: "Masterful interpretation" },
  { name: "Literary Devices", description_1: "No literary devices", description_2: "Basic device usage", description_3: "Adequate device usage", description_4: "Effective device usage", description_5: "Exceptional craft" },
  { name: "Use of Language", description_1: "Poor word choice", description_2: "Basic vocabulary", description_3: "Competent language", description_4: "Rich language", description_5: "Extraordinary language" },
  { name: "Continuity", description_1: "No coherent flow", description_2: "Occasional flow", description_3: "Generally cohesive", description_4: "Strong narrative arc", description_5: "Seamless and powerful" },
];

function CriterionRow({ criterion, competitionId }: { criterion: RubricCriterion; competitionId: string }) {
  const update = useUpdateRubricCriterion();
  const remove = useDeleteRubricCriterion();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(criterion);

  const handleSave = () => {
    update.mutate({ id: criterion.id, ...values }, { onSuccess: () => setEditing(false) });
  };

  return (
    <Collapsible>
      <div className="flex items-center justify-between bg-muted/30 rounded-md px-3 py-2">
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          <span className="font-mono text-xs text-muted-foreground mr-1">#{criterion.sort_order + 1}</span>
          {criterion.name}
        </CollapsibleTrigger>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate({ id: criterion.id, competition_id: competitionId })}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <CollapsibleContent>
        <div className="pl-4 border-l border-border/50 mt-2 space-y-2">
          <Input value={values.name} onChange={(e) => setValues({ ...values, name: e.target.value })} className="h-8 text-sm" placeholder="Criterion name" />
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-6">{n}</span>
              <Input
                value={(values as any)[`description_${n}`]}
                onChange={(e) => setValues({ ...values, [`description_${n}`]: e.target.value })}
                className="h-8 text-sm"
                placeholder={`Score ${n} description`}
              />
            </div>
          ))}
          <Button size="sm" onClick={handleSave} disabled={update.isPending} className="w-full h-8 text-xs">
            {update.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function RubricBuilder({ competitionId }: { competitionId: string }) {
  const { data: criteria } = useRubricCriteria(competitionId);
  const create = useCreateRubricCriterion();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    if (!newName.trim()) return;
    create.mutate(
      { competition_id: competitionId, name: newName, sort_order: criteria?.length || 0, description_1: "Very Weak", description_2: "Weak", description_3: "Average", description_4: "Strong", description_5: "Excellent" },
      { onSuccess: () => setNewName("") }
    );
  };

  const handleLoadDefaults = () => {
    DEFAULT_CRITERIA.forEach((c, i) => {
      create.mutate({ competition_id: competitionId, name: c.name, sort_order: (criteria?.length || 0) + i, description_1: c.description_1, description_2: c.description_2, description_3: c.description_3, description_4: c.description_4, description_5: c.description_5 });
    });
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Scoring Rubric</CardTitle>
          {!criteria?.length && (
            <Button variant="outline" size="sm" onClick={handleLoadDefaults}>
              <Wand2 className="h-3 w-3 mr-1" /> Load Default Template
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {criteria?.map((c) => (
          <CriterionRow key={c.id} criterion={c} competitionId={competitionId} />
        ))}
        <div className="flex gap-2">
          <Input placeholder="New criterion name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" />
          <Button size="sm" onClick={handleAdd} disabled={create.isPending || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
