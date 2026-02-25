import { useParams } from "react-router-dom";
import { useCompetition, useUpdateCompetition } from "@/hooks/useCompetitions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LevelsManager } from "@/components/competition/LevelsManager";
import { RubricBuilder } from "@/components/competition/RubricBuilder";
import { PenaltyConfig } from "@/components/competition/PenaltyConfig";
import { SubEventAssignments } from "@/components/competition/SubEventAssignments";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function CompetitionDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: comp, isLoading } = useCompetition(id);
  const update = useUpdateCompetition();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (comp) {
      setName(comp.name);
      setDescription(comp.description || "");
      setStartDate(comp.start_date || "");
      setEndDate(comp.end_date || "");
      setStatus(comp.status);
    }
  }, [comp]);

  const handleSave = () => {
    if (!id) return;
    update.mutate({ id, name, description, start_date: startDate || undefined, end_date: endDate || undefined, status });
  };

  if (isLoading) return <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>;
  if (!comp) return <div className="text-muted-foreground">Competition not found</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link to="/competitions"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{comp.name}</h1>
          <p className="text-muted-foreground text-sm">Configure competition settings</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="w-full flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="general" className="flex-shrink-0">General</TabsTrigger>
          <TabsTrigger value="levels" className="flex-shrink-0">Levels & Events</TabsTrigger>
          <TabsTrigger value="rubric" className="flex-shrink-0">Rubric</TabsTrigger>
          <TabsTrigger value="penalties" className="flex-shrink-0">Penalties</TabsTrigger>
          <TabsTrigger value="assignments" className="flex-shrink-0">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="border-border/50 bg-card/80">
            <CardHeader><CardTitle className="text-base">Competition Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
              <Textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Start Date</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="levels">
          <LevelsManager competitionId={id!} />
        </TabsContent>

        <TabsContent value="rubric">
          <RubricBuilder competitionId={id!} />
        </TabsContent>

        <TabsContent value="penalties">
          <PenaltyConfig competitionId={id!} />
        </TabsContent>

        <TabsContent value="assignments">
          <SubEventAssignments competitionId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
