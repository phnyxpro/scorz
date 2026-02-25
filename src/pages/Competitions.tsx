import { useState } from "react";
import { useCompetitions, useCreateCompetition, useDeleteCompetition } from "@/hooks/useCompetitions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Settings, Trophy, ClipboardList, Shield, Calculator, Eye, BarChart3, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/20 text-primary",
  completed: "bg-secondary/20 text-secondary",
  archived: "bg-muted text-muted-foreground",
};

export default function Competitions() {
  const { data: competitions, isLoading } = useCompetitions();
  const create = useCreateCompetition();
  const remove = useDeleteCompetition();
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("organizer");
  const isJudge = hasRole("judge") || hasRole("chief_judge");
  const isChiefJudge = hasRole("chief_judge");
  const isTabulator = hasRole("tabulator");
  const isWitness = hasRole("witness");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    create.mutate(
      { name, description: description || undefined, start_date: startDate || undefined, end_date: endDate || undefined },
      { onSuccess: () => { setOpen(false); setName(""); setDescription(""); setStartDate(""); setEndDate(""); } }
    );
  };

  if (isLoading) return <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Competitions</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage events, stages & configuration</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Competition</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Competition</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <Input placeholder="Competition name" value={name} onChange={(e) => setName(e.target.value)} />
                <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
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
                <Button onClick={handleCreate} disabled={create.isPending || !name.trim()} className="w-full">
                  {create.isPending ? "Creating…" : "Create Competition"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!competitions?.length ? (
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-sm">No competitions yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {competitions.map((c) => (
            <motion.div key={c.id} variants={item}>
              <Card className="border-border/50 bg-card/80 hover:bg-card transition-colors group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={statusColors[c.status]}>{c.status}</Badge>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive" onClick={() => remove.mutate(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-base mt-2">{c.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {c.description && <CardDescription className="mb-3 line-clamp-2">{c.description}</CardDescription>}
                  {(c.start_date || c.end_date) && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {c.start_date} {c.end_date ? `→ ${c.end_date}` : ""}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    {isAdmin && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}`}><Settings className="h-3 w-3 mr-1" /> Configure</Link>
                      </Button>
                    )}
                    {c.status === "active" && (
                      <Button asChild variant="default" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}/register`}>Register</Link>
                      </Button>
                    )}
                    {c.status === "active" && isJudge && (
                      <Button asChild variant="secondary" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}/score`}><ClipboardList className="h-3 w-3 mr-1" /> Score</Link>
                      </Button>
                    )}
                    {c.status === "active" && isChiefJudge && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}/chief-judge`}><Shield className="h-3 w-3 mr-1" /> Panel</Link>
                      </Button>
                    )}
                    {c.status === "active" && isTabulator && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}/tabulator`}><Calculator className="h-3 w-3 mr-1" /> Tabulate</Link>
                      </Button>
                    )}
                    {c.status === "active" && isWitness && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}/witness`}><Eye className="h-3 w-3 mr-1" /> Witness</Link>
                      </Button>
                    )}
                    {(c.status === "active" || c.status === "completed") && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}/results`}><BarChart3 className="h-3 w-3 mr-1" /> Results</Link>
                      </Button>
                    )}
                    {c.status === "active" && (
                      <Button asChild variant="outline" size="sm" className="flex-1">
                        <Link to={`/competitions/${c.id}/vote`}><Heart className="h-3 w-3 mr-1" /> Vote</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
