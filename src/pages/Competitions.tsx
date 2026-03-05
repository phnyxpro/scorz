import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCompetitions, useCreateCompetition, useDeleteCompetition } from "@/hooks/useCompetitions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Settings, Trophy, ClipboardList, Shield, Calculator, Eye, BarChart3, Heart, Lock, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-primary/20 text-primary",
  completed: "bg-secondary/20 text-secondary",
  archived: "bg-muted text-muted-foreground",
};

const competitionSchema = z.object({
  name: z.string().min(3, "Competition name must be at least 3 characters.").max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens.")
    .max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
type CompetitionFormValues = z.infer<typeof competitionSchema>;

export default function Competitions() {
  const { data: competitions, isLoading } = useCompetitions();
  const create = useCreateCompetition();
  const remove = useDeleteCompetition();
  const { hasRole, subscription } = useAuth();
  const isAdmin = hasRole("admin");
  const isOrganizer = hasRole("organizer");
  const canManage = isAdmin || isOrganizer;
  const isJudge = hasRole("judge") || hasRole("chief_judge");
  const isChiefJudge = hasRole("chief_judge");
  const isTabulator = hasRole("tabulator");
  

  const [open, setOpen] = useState(false);

  const form = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionSchema),
    defaultValues: { name: "", slug: "", description: "", startDate: "", endDate: "" },
  });

  // Subscription enforcement for organizers (admins bypass)
  const { user } = useAuth();
  const myCompetitions = isAdmin ? competitions : competitions?.filter(c => c.created_by === user?.id);
  const competitionCount = myCompetitions?.length ?? 0;
  const limit = isAdmin ? -1 : subscription.competitionLimit; // admins have no limit
  const isAtLimit = limit !== -1 && competitionCount >= limit;
  const needsSubscription = !isAdmin && !subscription.subscribed;

  const onSubmit = (data: CompetitionFormValues) => {
    if (needsSubscription) {
      toast.error("You need an active subscription to create competitions. Visit the billing page to subscribe.");
      return;
    }

    if (isAtLimit) {
      toast.error(`You've reached your plan limit of ${limit} competitions. Upgrade your plan to create more.`);
      return;
    }

    create.mutate(
      {
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
        start_date: data.startDate || undefined,
        end_date: data.endDate || undefined
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        }
      }
    );
  };

  if (isLoading) return <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Competitions</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage events, stages & configuration</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={needsSubscription || isAtLimit}>
                {needsSubscription || isAtLimit ? <Lock className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                New Competition
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Competition</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Competition name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">URL Slug</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={form.watch("name") ? form.watch("name").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : "e.g. my-competition-2026"}
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          />
                        </FormControl>
                        <p className="text-[10px] text-muted-foreground mt-1">Public URL: /events/{field.value || form.watch("name").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || '...'}</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea placeholder="Description (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" disabled={create.isPending} className="w-full mt-4">
                    {create.isPending ? "Creating…" : "Create Competition"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Subscription warnings for organizers */}
      {canManage && !isAdmin && needsSubscription && (
        <Alert className="mb-4 border-accent/30 bg-accent/5">
          <Lock className="h-4 w-4 text-accent" />
          <AlertDescription className="text-sm">
            You need an active subscription to create competitions.{" "}
            <Link to="/admin" className="text-accent underline font-medium">Subscribe now</Link>
          </AlertDescription>
        </Alert>
      )}

      {canManage && !isAdmin && subscription.subscribed && isAtLimit && (
        <Alert className="mb-4 border-secondary/30 bg-secondary/5">
          <AlertDescription className="text-sm">
            You've used {competitionCount}/{limit} competitions on your <strong>{subscription.tier?.name}</strong> plan.{" "}
            <Link to="/admin" className="text-secondary underline font-medium">Upgrade</Link> for more.
          </AlertDescription>
        </Alert>
      )}

      {canManage && !isAdmin && subscription.subscribed && !isAtLimit && limit !== -1 && (
        <p className="text-xs text-muted-foreground mb-4 font-mono">
          {competitionCount}/{limit} competitions used • {subscription.tier?.name}
        </p>
      )}

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
                    {canManage && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{c.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the competition and all associated data (levels, sub-events, registrations, scores). This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
                  <div className="flex flex-wrap gap-2 mt-3">
                    {canManage && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/competitions/${c.id}`}><Settings className="h-3 w-3 mr-1" /> Configure</Link>
                      </Button>
                    )}
                    {c.status === "active" && !canManage && !isJudge && !isTabulator && (
                      <Button asChild variant="default" size="sm">
                        <Link to={`/competitions/${c.id}/register`}>Register</Link>
                      </Button>
                    )}
                    {c.status === "active" && isJudge && (
                      <Button asChild variant="secondary" size="sm">
                        <Link to={`/competitions/${c.id}/score`}><ClipboardList className="h-3 w-3 mr-1" /> Score</Link>
                      </Button>
                    )}
                    {c.status === "active" && isChiefJudge && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/competitions/${c.id}/chief-judge`}><Shield className="h-3 w-3 mr-1" /> Panel</Link>
                      </Button>
                    )}
                    {c.status === "active" && isTabulator && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/competitions/${c.id}/tabulator`}><Calculator className="h-3 w-3 mr-1" /> Tabulate</Link>
                      </Button>
                    )}
                    {(c.status === "active" || c.status === "completed") && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/competitions/${c.id}/results`}><BarChart3 className="h-3 w-3 mr-1" /> Results</Link>
                      </Button>
                    )}
                    {c.status === "active" && !canManage && !isJudge && !isTabulator && !isWitness && (
                      <Button asChild variant="outline" size="sm">
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
