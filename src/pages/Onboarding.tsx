import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import BillingPanel from "@/components/admin/BillingPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// competition configuration helpers we reuse later
import { LevelsManager } from "@/components/competition/LevelsManager";
import { SlotsManager } from "@/components/competition/SlotsManager";
import { RubricBuilder } from "@/components/competition/RubricBuilder";
import { PenaltyConfig } from "@/components/competition/PenaltyConfig";
import { ScoringSettingsManager } from "@/components/competition/ScoringSettingsManager";
import { SubEventAssignments } from "@/components/competition/SubEventAssignments";
import { SponsorsManager } from "@/components/competition/SponsorsManager";
import { BrandingManager } from "@/components/competition/BrandingManager";

interface CompetitionFormValues {
  name: string;
  slug: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

const competitionSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

enum Step {
  Subscription = 0,
  CreateCompetition = 1,
  LevelsSchedule = 2,
  RulesRubric = 3,
  Scoring = 4,
  Staff = 5,
  Sponsors = 6,
  Branding = 7,
  Done = 8,
}

export default function Onboarding() {
  const { user, hasRole, subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(Step.Subscription);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  // load competition details after creation
  const { data: competition, refetch: refetchComp } = useQuery(
    ["competition", competitionId],
    async () => {
      if (!competitionId) return null;
      const { data } = await supabase.from("competitions").select("*").eq("id", competitionId).single();
      return data;
    },
    { enabled: !!competitionId }
  );

  // safety: if user signs in and is not organiser, show message
  if (user && !hasRole("organizer")) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Organizer Access Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>You must sign up as an <strong>organiser</strong> to use the onboarding flow.</p>
            <Button asChild>
              <Link to="/auth?view=signup&role=organizer&redirect=/onboarding">Create organiser account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // if not logged in, redirect to auth with params
  useEffect(() => {
    if (!user) {
      navigate("/auth?view=signup&role=organizer&redirect=/onboarding");
    }
  }, [user, navigate]);

  const subscriptionStep = (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Choose a plan and purchase a competition credit to unlock the wizard below. You can return later to buy more credits.
      </p>
      <BillingPanel subscription={subscription ? { subscribed: subscription.subscribed, product_id: subscription.productId, credits_total: subscription.creditsTotal, credits_used: subscription.creditsUsed, credits_available: subscription.creditsAvailable } : undefined} onRefresh={refreshSubscription} />
      <div className="flex justify-end">
        <Button
          onClick={() => {
            refreshSubscription().then(() => {
              if (subscription.creditsAvailable && subscription.creditsAvailable > 0) {
                setStep(Step.CreateCompetition);
              } else {
                toast.error("You must purchase a credit before continuing");
              }
            });
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );

  const createForm = useForm<CompetitionFormValues>({
    resolver: zodResolver(competitionSchema),
    defaultValues: { name: "", slug: "", description: "", startDate: "", endDate: "" },
  });

  const handleCompetitionCreate = createForm.handleSubmit(async (data) => {
    try {
      const { data: result, error } = await supabase.from("competitions").insert({
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
        start_date: data.startDate || undefined,
        end_date: data.endDate || undefined,
      }).select("id").single();
      if (error || !result) throw error || new Error("no response");
      setCompetitionId(result.id);
      setCreated(true);
      setStep(Step.LevelsSchedule);
    } catch (e: any) {
      toast.error(e.message || "Failed to create competition");
    }
  });

  const competitionStep = (
    <Form {...createForm}>
      <form onSubmit={handleCompetitionCreate} className="space-y-4">
        <FormField
          control={createForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Competition Name</FormLabel>
              <FormControl>
                <Input placeholder="My Talent Show 2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* slug, description, dates similar to Competitions page */}
        <FormField
          control={createForm.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL Slug (optional)</FormLabel>
              <FormControl>
                <Input {...field} onChange={(e) => field.onChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={createForm.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={createForm.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={createForm.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit">Create Competition</Button>
        </div>
      </form>
    </Form>
  );

  const stepComponents: Record<Step, JSX.Element> = {
    [Step.Subscription]: subscriptionStep,
    [Step.CreateCompetition]: competitionStep,
    [Step.LevelsSchedule]: competitionId ? <LevelsManager competitionId={competitionId} /> : <></>,
    [Step.RulesRubric]: competitionId ? (
      <>
        <RubricBuilder competitionId={competitionId} />
        <PenaltyConfig competitionId={competitionId} />
      </>
    ) : <></>,
    [Step.Scoring]: competitionId ? <ScoringSettingsManager competitionId={competitionId} /> : <></>,
    [Step.Staff]: competitionId ? <SubEventAssignments competitionId={competitionId} /> : <></>,
    [Step.Sponsors]: competitionId ? <SponsorsManager competitionId={competitionId} /> : <></>,
    [Step.Branding]: competitionId ? <BrandingManager competitionId={competitionId} competition={competition} /> : <></>,
    [Step.Done]: <p>Onboarding complete! Navigate to your <Link to="/competitions">competitions</Link> to continue.</p>,
  };

  const stepTitles: Record<Step, string> = {
    [Step.Subscription]: "Subscription & Payment",
    [Step.CreateCompetition]: "Competition Details",
    [Step.LevelsSchedule]: "Levels & Schedule",
    [Step.RulesRubric]: "Rules & Rubric",
    [Step.Scoring]: "Scoring Settings",
    [Step.Staff]: "Staff Assignments",
    [Step.Sponsors]: "Sponsors",
    [Step.Branding]: "Branding",
    [Step.Done]: "Finished",
  };

  const nextStep = () => setStep((s) => (s < Step.Done ? (s + 1) as Step : s));
  const prevStep = () => setStep((s) => (s > 0 ? (s - 1) as Step : s));

  return (
    <div className="min-h-screen p-6">
      <h1 className="text-2xl font-bold mb-4">Organizer Onboarding</h1>
      <h2 className="text-lg font-semibold mb-2">{stepTitles[step]}</h2>
      <div className="space-y-6">
        {stepComponents[step]}
      </div>
      {step !== Step.Subscription && step !== Step.Done && (
        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={prevStep}>Back</Button>
          <Button onClick={nextStep} disabled={step === Step.CreateCompetition && !competitionId}>Next</Button>
        </div>
      )}
    </div>
  );
}
