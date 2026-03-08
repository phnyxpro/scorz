import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition, useRubricCriteria, usePenaltyRules, useLevels, useSubEvents } from "@/hooks/useCompetitions";
import { useQuery } from "@tanstack/react-query";
import { useMyRegistration, useCreateRegistration } from "@/hooks/useRegistrations";
import { SignaturePad } from "@/components/registration/SignaturePad";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle, User, UserPlus, FileText, PenTool, Calendar, Info, Link as LinkIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  ageCategory: z.enum(["adult", "adult_18_24", "adult_25_34", "adult_35_44", "adult_45_54", "adult_55_plus", "minor"]).optional().default("adult"),
  bio: z.string().optional(),
  videoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  guardianName: z.string().optional(),
  guardianEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  guardianPhone: z.string().optional(),
  rulesAcknowledged: z.boolean().refine(v => v === true, "You must acknowledge the rules"),
  contestantSig: z.string().min(1, "Signature is required"),
  guardianSig: z.string().optional(),
  selectedLevelId: z.string().optional(),
  selectedSubEventId: z.string().optional(),
  selectedSlotId: z.string().optional(),
  specialEntryType: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

const STEPS = [
  { id: "account", label: "Account", icon: UserPlus, roles: ["guest"] },
  { id: "personal", label: "Personal Info", icon: User },
  { id: "bio", label: "Bio & Media", icon: Info },
  { id: "event", label: "Event Details", icon: Calendar },
  { id: "schedule", label: "Schedule", icon: Clock },
  { id: "legal", label: "Legal", icon: PenTool },
];

// Reusable on-behalf registration form (used in modal from RegistrationsManager)
export function OnBehalfRegistrationForm({
  competitionId,
  onComplete,
}: {
  competitionId: string;
  onComplete: () => void;
}) {
  const { user } = useAuth();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const createReg = useCreateRegistration();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);

  const availableSteps = useMemo(() => {
    return STEPS.filter(s => s.id !== "account");
  }, []);

  const methods = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      ageCategory: "adult",
      rulesAcknowledged: false,
      contestantSig: "",
    },
  });

  const handleNext = async () => {
    const stepId = availableSteps[currentStep].id;
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    if (stepId === "personal") fieldsToValidate = ["firstName", "lastName", "email"];
    if (stepId === "bio") fieldsToValidate = ["videoUrl"];
    if (stepId === "event") fieldsToValidate = ["selectedSubEventId"];
    if (stepId === "legal") fieldsToValidate = ["rulesAcknowledged", "contestantSig", "guardianSig"];

    const isValid = await methods.trigger(fieldsToValidate);
    if (isValid) setCurrentStep(s => s + 1);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (!user || !competitionId) return;

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", data.email)
      .maybeSingle();
    const registrationUserId = existingProfile?.user_id || user.id;

    createReg.mutate({
      user_id: registrationUserId,
      competition_id: competitionId,
      full_name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      phone: data.phone,
      location: data.location,
      age_category: data.ageCategory,
      bio: data.bio,
      performance_video_url: data.videoUrl,
      guardian_name: data.guardianName,
      guardian_email: data.guardianEmail,
      guardian_phone: data.guardianPhone,
      rules_acknowledged: data.rulesAcknowledged,
      rules_acknowledged_at: new Date().toISOString(),
      contestant_signature: data.contestantSig,
      contestant_signed_at: new Date().toISOString(),
      guardian_signature: data.guardianSig,
      guardian_signed_at: data.guardianSig ? new Date().toISOString() : undefined,
      sub_event_id: data.selectedSubEventId,
      status: "approved",
    } as any, {
      onSuccess: async (createdReg: any) => {
        if (data.selectedSlotId && createdReg?.id) {
          await supabase
            .from("performance_slots")
            .update({ is_booked: true, contestant_registration_id: createdReg.id } as any)
            .eq("id", data.selectedSlotId);
        }
        toast({ title: "Contestant added", description: "Registration has been created and auto-approved." });
        onComplete();
      },
    });
  };

  if (compLoading) return <LoadingSpinner />;

  return (
    <div className="pb-4">
      <StepIndicator steps={availableSteps} currentStep={currentStep} />

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={availableSteps[currentStep].id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {availableSteps[currentStep].id === "personal" && <PersonalStep />}
              {availableSteps[currentStep].id === "bio" && <BioStep />}
              {availableSteps[currentStep].id === "event" && <EventStep competitionId={competitionId} />}
              {availableSteps[currentStep].id === "schedule" && <ScheduleStep />}
              {availableSteps[currentStep].id === "legal" && <LegalStep competitionId={competitionId} />}
            </motion.div>
          </AnimatePresence>

          <footer className="flex justify-between pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(s => s - 1)}
            >
              Back
            </Button>
            {currentStep < availableSteps.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={createReg.isPending}>
                {createReg.isPending ? "Adding…" : "Add & Approve"}
              </Button>
            )}
          </footer>
        </form>
      </FormProvider>
    </div>
  );
}

export default function ContestantRegistration() {
  const { id: competitionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isOnBehalf = searchParams.get("behalf") === "true";
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const { data: existing, isLoading: regLoading } = useMyRegistration(isOnBehalf ? undefined : competitionId);
  const createReg = useCreateRegistration();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [authLoading, setAuthLoading] = useState(false);
  const [authData, setAuthData] = useState({ email: "", password: "", fullName: "" });

  const availableSteps = useMemo(() => {
    if (isOnBehalf) return STEPS.filter(s => s.id !== "account");
    if (user) return STEPS.filter(s => s.id !== "account");
    return STEPS;
  }, [user, isOnBehalf]);

  const methods = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: isOnBehalf ? "" : (user?.user_metadata?.full_name?.split(" ")[0] || ""),
      lastName: isOnBehalf ? "" : (user?.user_metadata?.full_name?.split(" ").slice(1).join(" ") || ""),
      email: isOnBehalf ? "" : (user?.email || ""),
      ageCategory: "adult",
      rulesAcknowledged: false,
      contestantSig: "",
    },
  });

  useEffect(() => {
    if (user && !isOnBehalf) {
      methods.setValue("email", user.email || "");
      const fullName = user.user_metadata?.full_name || "";
      methods.setValue("firstName", fullName.split(" ")[0] || "");
      methods.setValue("lastName", fullName.split(" ").slice(1).join(" ") || "");
    }
  }, [user, methods, isOnBehalf]);

  const handleNext = async () => {
    const stepId = availableSteps[currentStep].id;

    if (stepId === "account" && !user) {
      if (!authData.email || authData.password.length < 6 || !authData.fullName) {
        toast({ title: "Validation Error", description: "Please fill in all account fields", variant: "destructive" });
        return;
      }
      setAuthLoading(true);
      const { error } = await signUp(authData.email, authData.password, authData.fullName);
      setAuthLoading(false);
      if (error) {
        toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Account Created", description: "Verification email sent. You can now complete your registration." });
    }

    let fieldsToValidate: (keyof RegistrationFormData)[] = [];
    if (stepId === "personal") fieldsToValidate = ["firstName", "lastName", "email"];
    if (stepId === "bio") fieldsToValidate = ["videoUrl"];
    if (stepId === "event") fieldsToValidate = ["selectedSubEventId"];
    if (stepId === "legal") fieldsToValidate = ["rulesAcknowledged", "contestantSig", "guardianSig"];

    const isValid = await methods.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(s => s + 1);
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (!user || !competitionId) return;

    let registrationUserId = user.id;
    if (isOnBehalf) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", data.email)
        .maybeSingle();
      registrationUserId = existingProfile?.user_id || user.id;
    } else {
      await supabase.from("user_roles").upsert({ user_id: user.id, role: "contestant" as any }, { onConflict: "user_id,role" });
    }

    createReg.mutate({
      user_id: registrationUserId,
      competition_id: competitionId,
      full_name: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      phone: data.phone,
      location: data.location,
      age_category: data.ageCategory,
      bio: data.bio,
      performance_video_url: data.videoUrl,
      guardian_name: data.guardianName,
      guardian_email: data.guardianEmail,
      guardian_phone: data.guardianPhone,
      rules_acknowledged: data.rulesAcknowledged,
      rules_acknowledged_at: new Date().toISOString(),
      contestant_signature: data.contestantSig,
      contestant_signed_at: new Date().toISOString(),
      guardian_signature: data.guardianSig,
      guardian_signed_at: data.guardianSig ? new Date().toISOString() : undefined,
      sub_event_id: data.selectedSubEventId,
      status: isOnBehalf ? "approved" : "pending",
    } as any, {
      onSuccess: async (createdReg: any) => {
        if (data.selectedSlotId && createdReg?.id) {
          await supabase
            .from("performance_slots")
            .update({ is_booked: true, contestant_registration_id: createdReg.id } as any)
            .eq("id", data.selectedSlotId);
        }
        const successMsg = isOnBehalf
          ? "Contestant has been added and auto-approved."
          : "Your details have been submitted successfully.";
        toast({ title: "Registration complete", description: successMsg });
        navigate(isOnBehalf ? `/competitions/${competitionId}` : `/competitions`);
      },
    });
  };

  if (compLoading || regLoading) return <LoadingSpinner />;

  // Guard: registration closed
  const regOpen =
    !isOnBehalf &&
    comp &&
    ((comp as any).registration_enabled === false ||
      ((comp as any).registration_start_at && new Date() < new Date((comp as any).registration_start_at)) ||
      ((comp as any).registration_end_at && new Date() > new Date((comp as any).registration_end_at)));

  if (regOpen) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">Registration Closed</h1>
        <p className="text-muted-foreground">Registration for this competition is currently closed.</p>
        <Button variant="outline" onClick={() => navigate("/competitions")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Competitions
        </Button>
      </div>
    );
  }

  if (existing) {
    return <AlreadyRegisteredView status={existing.status} onBack={() => navigate("/competitions")} />;
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <header className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(isOnBehalf ? `/competitions/${competitionId}` : "/competitions")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isOnBehalf ? "Add Contestant" : "Registration"}
          </h1>
          <p className="text-muted-foreground">
            {isOnBehalf ? `Registering on behalf · ${comp?.name}` : comp?.name}
          </p>
        </div>
      </header>

      <StepIndicator steps={availableSteps} currentStep={currentStep} />

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={availableSteps[currentStep].id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {availableSteps[currentStep].id === "account" && (
                <AccountStep data={authData} setData={setAuthData} loading={authLoading} />
              )}
              {availableSteps[currentStep].id === "personal" && <PersonalStep />}
              {availableSteps[currentStep].id === "bio" && <BioStep />}
              {availableSteps[currentStep].id === "event" && <EventStep competitionId={competitionId!} />}
              {availableSteps[currentStep].id === "schedule" && <ScheduleStep />}
              {availableSteps[currentStep].id === "legal" && <LegalStep competitionId={competitionId!} />}
            </motion.div>
          </AnimatePresence>

          <footer className="flex justify-between pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              disabled={currentStep === 0}
              onClick={() => setCurrentStep(s => s - 1)}
            >
              Back
            </Button>
            {currentStep < availableSteps.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={createReg.isPending}>
                {createReg.isPending ? "Submitting..." : "Complete Registration"}
              </Button>
            )}
          </footer>
        </form>
      </FormProvider>
    </div>
  );
}

function StepIndicator({ steps, currentStep }: { steps: typeof STEPS; currentStep: number }) {
  return (
    <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all shrink-0 ${i === currentStep
            ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
            : i < currentStep
              ? "bg-secondary/20 border-secondary/50 text-secondary"
              : "bg-muted/50 border-border text-muted-foreground"
            }`}
        >
          <step.icon className="h-4 w-4" />
          <span className="text-xs font-medium">{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function AccountStep({ data, setData, loading }: { data: any, setData: any, loading: boolean }) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Join Scorz to track your performance and scores.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input
            placeholder="John Doe"
            value={data.fullName}
            onChange={e => setData({ ...data, fullName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={data.email}
            onChange={e => setData({ ...data, email: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            placeholder="••••••••"
            value={data.password}
            onChange={e => setData({ ...data, password: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PersonalStep() {
  const { register, watch, formState: { errors } } = useFormContext<RegistrationFormData>();
  const isMinor = watch("ageCategory") === "minor";

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle>About You</CardTitle>
        <CardDescription>Basic details for the competition organisers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input {...register("firstName")} placeholder="First Name" />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input {...register("lastName")} placeholder="Last Name" />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input {...register("email")} type="email" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...register("phone")} placeholder="+1..." />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input {...register("location")} placeholder="City, State" />
          </div>
          <div className="space-y-2">
            <Label>Age Category</Label>
            <select
              {...register("ageCategory")}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="adult">Adult</option>
              <option value="adult_18_24">Adult | 18-24</option>
              <option value="adult_25_34">Adult | 25-34</option>
              <option value="adult_35_44">Adult | 35-44</option>
              <option value="adult_45_54">Adult | 45-54</option>
              <option value="adult_55_plus">Adult | 55+</option>
              <option value="minor">Minor (Under 18)</option>
            </select>
          </div>
        </div>

        {isMinor && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="p-4 border border-secondary/20 rounded-lg bg-secondary/5 space-y-4 mt-6"
          >
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-secondary" /> Parent / Guardian Info
            </h3>
            <div className="space-y-2">
              <Label>Guardian Name</Label>
              <Input {...register("guardianName")} placeholder="Full Name" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Guardian Email</Label>
                <Input {...register("guardianEmail")} type="email" />
              </div>
              <div className="space-y-2">
                <Label>Guardian Phone</Label>
                <Input {...register("guardianPhone")} />
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

function BioStep() {
  const { register, formState: { errors } } = useFormContext<RegistrationFormData>();

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle>Bio & Media</CardTitle>
        <CardDescription>Tell the audience and judges about your performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Biography</Label>
          <Textarea
            {...register("bio")}
            placeholder="Share your story or performance background..."
            className="min-h-[120px] resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Performance Video URL
          </Label>
          <Input {...register("videoUrl")} placeholder="https://youtube.com/..." />
          {errors.videoUrl && <p className="text-xs text-destructive">{errors.videoUrl.message}</p>}
          <p className="text-[10px] text-muted-foreground italic">
            Link to a previous performance or audition tape (YouTube, Vimeo, etc.).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EventStep({ competitionId }: { competitionId: string }) {
  const { setValue, watch } = useFormContext<RegistrationFormData>();
  const { data: levels } = useLevels(competitionId);
  const selectedLevelId = watch("selectedLevelId");
  const selectedSubEventId = watch("selectedSubEventId");

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);

  useEffect(() => {
    if (levels?.length && !selectedLevelId) {
      setValue("selectedLevelId", levels[0].id);
    }
  }, [levels, selectedLevelId, setValue]);

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle>Select Your Category</CardTitle>
        <CardDescription>Choose the level and sub-event you wish to compete in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {levels && levels.length > 0 && (
          <div className="space-y-2">
            <Label>Competition Level / Stage</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {levels.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setValue("selectedLevelId", l.id);
                    setValue("selectedSubEventId", "");
                    setValue("selectedSlotId", "");
                  }}
                  className={`px-3 py-2 rounded-md border text-sm transition-all ${selectedLevelId === l.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
                    }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Label>Available Sessions</Label>
          {subEvents && subEvents.length > 0 ? (
            <div className="grid gap-3">
              {subEvents.map(se => (
                <button
                  key={se.id}
                  type="button"
                  onClick={() => {
                    setValue("selectedSubEventId", se.id);
                    setValue("selectedSlotId", "");
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedSubEventId === se.id
                    ? "bg-primary/5 border-primary ring-1 ring-primary"
                    : "bg-card border-border/50 hover:border-border"
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-tight">{se.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <Calendar className="h-3 w-3" /> {se.event_date || "TBA"} • {se.start_time || "TBA"}
                      </p>
                    </div>
                    {selectedSubEventId === se.id && (
                      <Badge variant="default" className="rounded-full h-5 w-5 p-0 flex items-center justify-center">
                        <CheckCircle className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
              <p className="text-xs text-muted-foreground">No sessions available for this level yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleStep() {
  const { setValue, watch } = useFormContext<RegistrationFormData>();
  const selectedSubEventId = watch("selectedSubEventId");
  const selectedSlotId = watch("selectedSlotId");

  const { data: slots } = useQuery({
    queryKey: ["performance-slots", selectedSubEventId],
    enabled: !!selectedSubEventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_slots")
        .select("*")
        .eq("sub_event_id", selectedSubEventId)
        .order("slot_index", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const formatTime = (t: string) => {
    const [h, m] = t.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  const availableSlots = slots?.filter(s => !s.is_booked) || [];

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle className="text-base">Select Time Slot</CardTitle>
        <CardDescription>Choose your performance time (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedSubEventId ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Please select a session in the previous step first.
          </p>
        ) : slots && slots.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableSlots.map(slot => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setValue("selectedSlotId", slot.id === selectedSlotId ? "" : slot.id)}
                  className={`text-center border rounded-md p-2 transition-colors text-sm font-mono ${slot.id === selectedSlotId
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border/50 bg-muted/20 hover:bg-muted/40 text-foreground"
                    }`}
                >
                  {formatTime(slot.start_time)}
                </button>
              ))}
            </div>
            {availableSlots.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">All slots are booked.</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No specific time slots available for this session. You can continue to the next step.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LegalStep({ competitionId }: { competitionId: string }) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<RegistrationFormData>();
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);
  const isMinor = watch("ageCategory") === "minor";

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle>Guidelines & Penalties</CardTitle>
          <CardDescription>Please review the scoring criteria and rules.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Scoring Rubric</h4>
              <ul className="space-y-1">
                {rubric?.map(r => (
                  <li key={r.id} className="text-xs flex justify-between">
                    <span>{r.name}</span>
                    <span className="opacity-50 font-mono">1-5pts</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/10">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-destructive mb-2">Penalties</h4>
              <ul className="space-y-1">
                {penalties?.map(p => (
                  <li key={p.id} className="text-xs flex justify-between">
                    <span>{p.from_seconds}s - {p.to_seconds || "∞"}s</span>
                    <span className="text-destructive font-mono">-{p.penalty_points}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
            <Checkbox
              id="rules"
              onCheckedChange={v => setValue("rulesAcknowledged", !!v)}
              checked={watch("rulesAcknowledged")}
            />
            <label htmlFor="rules" className="text-sm leading-tight cursor-pointer">
              I acknowledge that I have read the competition rules and agree to the scoring system and penalties.
            </label>
          </div>
          {errors.rulesAcknowledged && <p className="text-xs text-destructive">{errors.rulesAcknowledged.message}</p>}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Final Certification</CardTitle>
          <CardDescription>Draw your signature below to complete the registration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <SignaturePad label="Contestant Signature *" onSignature={v => setValue("contestantSig", v)} signerRole="Contestant" />
            {errors.contestantSig && <p className="text-xs text-destructive">{errors.contestantSig.message}</p>}
          </div>

          {isMinor && (
            <div className="space-y-2">
              <SignaturePad label="Guardian Signature *" onSignature={v => setValue("guardianSig", v)} signerRole="Guardian" />
              {errors.guardianSig && <p className="text-xs text-destructive">{errors.guardianSig.message}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="font-mono text-xs text-muted-foreground animate-pulse">PREPARING REGISTRATION WIZARD...</p>
    </div>
  );
}

function AlreadyRegisteredView({ status, onBack }: { status: string, onBack: () => void }) {
  return (
    <div className="max-w-md mx-auto py-12">
      <Card className="border-border/50 bg-card/80 text-center">
        <CardContent className="py-12 flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <CheckCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold">Already Registered</h2>
          <p className="text-muted-foreground">
            You've already submitted your registration for this competition.
          </p>
          <Badge variant="secondary" className="text-sm py-1 px-3">Status: {status}</Badge>
          <Button onClick={onBack} variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


