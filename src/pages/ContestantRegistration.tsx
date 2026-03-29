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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle, User, UserPlus, FileText, PenTool, Calendar, Info, Link as LinkIcon, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, FormProvider, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { FormFieldConfig, FormBuilderConfig, migrateFormConfig, getCustomRegistrationFields, getConfigSections } from "@/lib/form-builder-types";

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

// Hook to fetch the full form builder config
function useFormConfig(competitionId: string | undefined) {
  return useQuery({
    queryKey: ["competition_form_config", competitionId],
    enabled: !!competitionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("registration_form_config")
        .eq("id", competitionId!)
        .single();
      if (error) throw error;
      const raw = data?.registration_form_config;
      return migrateFormConfig(raw);
    },
  });
}

/** Check if a built-in field key is enabled in the config */
function isFieldEnabled(config: FormBuilderConfig | undefined, key: string): boolean {
  if (!config) return true; // no config = show all
  const field = config.fields.find(f => f.key === key);
  if (!field) return true; // not in config = show
  return field.enabled;
}

/** Check if a built-in field key is required in the config */
function isFieldRequired(config: FormBuilderConfig | undefined, key: string): boolean {
  if (!config) return false;
  const field = config.fields.find(f => f.key === key);
  return field?.required ?? false;
}

/** Get the configured label for a built-in field (uses config label if available) */
function getFieldLabel(config: FormBuilderConfig | undefined, key: string, fallback: string): string {
  if (!config) return fallback;
  const field = config.fields.find(f => f.key === key);
  return field?.label || fallback;
}

/** Get custom fields for a specific section */
function getCustomFieldsForSection(config: FormBuilderConfig | undefined, section: string): FormFieldConfig[] {
  if (!config) return [];
  return config.fields.filter(f => !f.is_builtin && f.enabled && f.section === section)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Get custom fields not assigned to a specific built-in section */
function getCustomFieldsWithoutSection(config: FormBuilderConfig | undefined): FormFieldConfig[] {
  if (!config) return [];
  const builtinSections = new Set(["personal", "bio", "event", "legal"]);
  return config.fields.filter(f => !f.is_builtin && f.enabled && (!f.section || !builtinSections.has(f.section)))
    .sort((a, b) => a.sort_order - b.sort_order);
}

// ─── On-Behalf Registration Form ───────────────────────────────────

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
  const { data: formConfig } = useFormConfig(competitionId);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

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
      special_entry_type: data.specialEntryType || null,
      status: "approved",
      custom_field_values: customFieldValues,
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
              {availableSteps[currentStep].id === "personal" && <PersonalStep formConfig={formConfig} customFieldValues={customFieldValues} setCustomFieldValues={setCustomFieldValues} />}
              {availableSteps[currentStep].id === "bio" && <BioStep formConfig={formConfig} customFieldValues={customFieldValues} setCustomFieldValues={setCustomFieldValues} />}
              {availableSteps[currentStep].id === "event" && <EventStep competitionId={competitionId} />}
              {availableSteps[currentStep].id === "schedule" && <ScheduleStep />}
              {availableSteps[currentStep].id === "legal" && <LegalStep competitionId={competitionId} formConfig={formConfig} customFieldValues={customFieldValues} setCustomFieldValues={setCustomFieldValues} />}
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
  const { data: formConfig } = useFormConfig(competitionId);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

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

  const handleNext = async () => {
    const stepId = availableSteps[currentStep].id;
    let fieldsToValidate: (keyof RegistrationFormData)[] = [];

    if (stepId === "account") {
      if (!user) {
        if (!authData.email || !authData.password || !authData.fullName) {
          toast({ title: "Please fill in all account fields", variant: "destructive" });
          return;
        }
        setAuthLoading(true);
        try {
          await signUp(authData.email, authData.password, authData.fullName);
          toast({ title: "Account created!", description: "Please check your email to verify, then you can continue." });
          methods.setValue("email", authData.email);
          const parts = authData.fullName.split(" ");
          methods.setValue("firstName", parts[0] || "");
          methods.setValue("lastName", parts.slice(1).join(" ") || "");
        } catch (err: any) {
          toast({ title: "Sign up failed", description: err.message, variant: "destructive" });
        }
        setAuthLoading(false);
        return;
      }
    }

    if (stepId === "personal") fieldsToValidate = ["firstName", "lastName", "email"];
    if (stepId === "bio") fieldsToValidate = ["videoUrl"];
    if (stepId === "event") fieldsToValidate = ["selectedSubEventId"];
    if (stepId === "legal") fieldsToValidate = ["rulesAcknowledged", "contestantSig", "guardianSig"];

    const isValid = await methods.trigger(fieldsToValidate);
    if (isValid) setCurrentStep(s => s + 1);
  };

  const onSubmit = async (data: RegistrationFormData) => {
    if (!user || !competitionId) return;

    createReg.mutate({
      user_id: user.id,
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
      special_entry_type: data.specialEntryType || null,
      status: "pending",
      custom_field_values: customFieldValues,
    } as any, {
      onSuccess: async (createdReg: any) => {
        if (data.selectedSlotId && createdReg?.id) {
          await supabase
            .from("performance_slots")
            .update({ is_booked: true, contestant_registration_id: createdReg.id } as any)
            .eq("id", data.selectedSlotId);
        }
        toast({ title: "Registration submitted!", description: "Awaiting organiser review." });
        navigate("/dashboard");
      },
    });
  };

  if (compLoading || regLoading) return <LoadingSpinner />;
  if (existing) return <AlreadyRegisteredView status={existing.status} onBack={() => navigate(-1)} />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-12 space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="mr-1 h-3 w-3" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{comp?.name || "Competition"}</h1>
        <p className="text-sm text-muted-foreground">Complete each step to register.</p>
      </div>

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
              {availableSteps[currentStep].id === "personal" && <PersonalStep formConfig={formConfig} customFieldValues={customFieldValues} setCustomFieldValues={setCustomFieldValues} />}
              {availableSteps[currentStep].id === "bio" && <BioStep formConfig={formConfig} customFieldValues={customFieldValues} setCustomFieldValues={setCustomFieldValues} />}
              {availableSteps[currentStep].id === "event" && <EventStep competitionId={competitionId!} />}
              {availableSteps[currentStep].id === "schedule" && <ScheduleStep />}
              {availableSteps[currentStep].id === "legal" && <LegalStep competitionId={competitionId!} formConfig={formConfig} customFieldValues={customFieldValues} setCustomFieldValues={setCustomFieldValues} />}
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

// ─── Shared custom fields rendering ────────────────────────────────

interface CustomFieldsSectionProps {
  fields: FormFieldConfig[];
  customFieldValues: Record<string, string>;
  setCustomFieldValues?: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  title?: string;
  description?: string;
}

function CustomFieldsSection({ fields, customFieldValues, setCustomFieldValues, title, description }: CustomFieldsSectionProps) {
  const shouldShow = (field: FormFieldConfig) => {
    if (!field.logic?.show_when) return true;
    const { field_id, operator, value } = field.logic.show_when;
    const actual = customFieldValues[field_id] || "";
    switch (operator) {
      case "equals": return actual === value;
      case "not_equals": return actual !== value;
      case "contains": return actual.toLowerCase().includes(value.toLowerCase());
      case "not_empty": return actual.trim().length > 0;
      default: return true;
    }
  };

  const visibleFields = fields.filter(shouldShow);
  if (visibleFields.length === 0) return null;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle>{title || "Additional Information"}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {visibleFields.map((cf) => (
            <div key={cf.id} className={cf.width === "half" ? "sm:col-span-1" : "col-span-full"} style={{ gridColumn: cf.width === "half" ? undefined : "1 / -1" }}>
              {cf.field_type === "section_header" ? (
                <h3 className="text-sm font-semibold text-foreground pt-2 border-t border-border/30">{cf.label}</h3>
              ) : (
                <div className="space-y-1.5">
                  <Label>
                    {cf.label} {cf.required && <span className="text-destructive">*</span>}
                  </Label>
                  {cf.help_text && <p className="text-[10px] text-muted-foreground">{cf.help_text}</p>}
                  <CustomFieldInput
                    field={cf}
                    value={customFieldValues[cf.id] || ""}
                    onChange={(v) => setCustomFieldValues?.((prev) => ({ ...prev, [cf.id]: v }))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PersonalStep (config-driven) ──────────────────────────────────

function PersonalStep({
  formConfig,
  customFieldValues = {},
  setCustomFieldValues,
}: {
  formConfig?: FormBuilderConfig;
  customFieldValues?: Record<string, string>;
  setCustomFieldValues?: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  const { register, watch, formState: { errors } } = useFormContext<RegistrationFormData>();
  const isMinor = watch("ageCategory") === "minor";

  const showPhone = isFieldEnabled(formConfig, "phone");
  const showLocation = isFieldEnabled(formConfig, "location");
  const showAgeCategory = isFieldEnabled(formConfig, "ageCategory");
  const showGuardianName = isFieldEnabled(formConfig, "guardianName");
  const showGuardianEmail = isFieldEnabled(formConfig, "guardianEmail");

  const customFields = getCustomFieldsForSection(formConfig, "personal");

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>About You</CardTitle>
          <CardDescription>Basic details for the competition organisers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{getFieldLabel(formConfig, "firstName", "First Name")} *</Label>
              <Input {...register("firstName")} placeholder="First Name" />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{getFieldLabel(formConfig, "lastName", "Last Name")} *</Label>
              <Input {...register("lastName")} placeholder="Last Name" />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{getFieldLabel(formConfig, "email", "Email")} *</Label>
              <Input {...register("email")} type="email" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            {showPhone && (
              <div className="space-y-2">
                <Label>
                  {getFieldLabel(formConfig, "phone", "Phone")}
                  {isFieldRequired(formConfig, "phone") && <span className="text-destructive"> *</span>}
                </Label>
                <Input {...register("phone")} placeholder="+1..." />
              </div>
            )}
            {showLocation && (
              <div className="space-y-2">
                <Label>
                  {getFieldLabel(formConfig, "location", "Location")}
                  {isFieldRequired(formConfig, "location") && <span className="text-destructive"> *</span>}
                </Label>
                <Input {...register("location")} placeholder="City, State" />
              </div>
            )}
            {showAgeCategory && (
              <div className="space-y-2">
                <Label>
                  {getFieldLabel(formConfig, "ageCategory", "Age Category")}
                  {isFieldRequired(formConfig, "ageCategory") && <span className="text-destructive"> *</span>}
                </Label>
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
            )}
          </div>

          {isMinor && (showGuardianName || showGuardianEmail) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="p-4 border border-secondary/20 rounded-lg bg-secondary/5 space-y-4 mt-6"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-secondary" /> Parent / Guardian Info
              </h3>
              {showGuardianName && (
                <div className="space-y-2">
                  <Label>{getFieldLabel(formConfig, "guardianName", "Guardian Name")}</Label>
                  <Input {...register("guardianName")} placeholder="Full Name" />
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {showGuardianEmail && (
                  <div className="space-y-2">
                    <Label>{getFieldLabel(formConfig, "guardianEmail", "Guardian Email")}</Label>
                    <Input {...register("guardianEmail")} type="email" />
                  </div>
                )}
                {isFieldEnabled(formConfig, "guardianPhone") && (
                  <div className="space-y-2">
                    <Label>Guardian Phone</Label>
                    <Input {...register("guardianPhone")} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {customFields.length > 0 && (
        <CustomFieldsSection
          fields={customFields}
          customFieldValues={customFieldValues}
          setCustomFieldValues={setCustomFieldValues}
        />
      )}
    </div>
  );
}

// ─── BioStep (config-driven) ───────────────────────────────────────

function BioStep({
  formConfig,
  customFieldValues = {},
  setCustomFieldValues,
}: {
  formConfig?: FormBuilderConfig;
  customFieldValues?: Record<string, string>;
  setCustomFieldValues?: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  const { register, formState: { errors } } = useFormContext<RegistrationFormData>();

  const showBio = isFieldEnabled(formConfig, "bio");
  const showVideoUrl = isFieldEnabled(formConfig, "videoUrl");

  const bioCustomFields = getCustomFieldsForSection(formConfig, "bio");
  const unassignedCustomFields = getCustomFieldsWithoutSection(formConfig);
  const allCustomFields = [...bioCustomFields, ...unassignedCustomFields];

  const hasBioContent = showBio || showVideoUrl;

  return (
    <div className="space-y-6">
      {hasBioContent && (
        <Card className="border-border/50 bg-card/80">
          <CardHeader>
            <CardTitle>Bio & Media</CardTitle>
            <CardDescription>Tell the audience and judges about your performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showBio && (
              <div className="space-y-2">
                <Label>
                  {getFieldLabel(formConfig, "bio", "Biography")}
                  {isFieldRequired(formConfig, "bio") && <span className="text-destructive"> *</span>}
                </Label>
                <Textarea
                  {...register("bio")}
                  placeholder="Share your story or performance background..."
                  className="min-h-[120px] resize-none"
                />
              </div>
            )}
            {showVideoUrl && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" /> {getFieldLabel(formConfig, "videoUrl", "Performance Video URL")}
                  {isFieldRequired(formConfig, "videoUrl") && <span className="text-destructive"> *</span>}
                </Label>
                <Input {...register("videoUrl")} placeholder="https://youtube.com/..." />
                {errors.videoUrl && <p className="text-xs text-destructive">{errors.videoUrl.message}</p>}
                <p className="text-[10px] text-muted-foreground italic">
                  Link to a previous performance or audition tape (YouTube, Vimeo, etc.).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {allCustomFields.length > 0 && (
        <CustomFieldsSection
          fields={allCustomFields}
          customFieldValues={customFieldValues}
          setCustomFieldValues={setCustomFieldValues}
          title="Additional Information"
          description="Please fill in the following details."
        />
      )}
    </div>
  );
}

// ─── CustomFieldInput ──────────────────────────────────────────────

function CustomFieldInput({ field, value, onChange }: { field: FormFieldConfig; value: string; onChange: (v: string) => void }) {
  switch (field.field_type) {
    case "short_text":
    case "email":
    case "phone":
    case "url":
      return (
        <Input
          type={field.field_type === "email" ? "email" : field.field_type === "phone" ? "tel" : field.field_type === "url" ? "url" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || field.label}
          minLength={field.validation?.min_length}
          maxLength={field.validation?.max_length}
        />
      );
    case "long_text":
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || field.label}
          className="min-h-[80px] resize-none"
          minLength={field.validation?.min_length}
          maxLength={field.validation?.max_length}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || field.label}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "dropdown":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "radio":
      return (
        <RadioGroup value={value} onValueChange={onChange} className="space-y-1">
          {(field.options || []).map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.value} id={`${field.id}_${opt.value}`} />
              <Label htmlFor={`${field.id}_${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );
    case "checkbox":
      return (
        <div className="space-y-1">
          {(field.options || []).map((opt) => {
            const selected = value ? value.split(",") : [];
            const isChecked = selected.includes(opt.value);
            return (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${field.id}_${opt.value}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const next = checked
                      ? [...selected, opt.value]
                      : selected.filter(v => v !== opt.value);
                    onChange(next.join(","));
                  }}
                />
                <Label htmlFor={`${field.id}_${opt.value}`} className="text-sm font-normal">{opt.label}</Label>
              </div>
            );
          })}
        </div>
      );
    case "consent":
      return (
        <div className="flex items-start gap-2">
          <Checkbox
            checked={value === "true"}
            onCheckedChange={(v) => onChange(v ? "true" : "")}
          />
          <span className="text-sm">{field.placeholder || field.label}</span>
        </div>
      );
    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || field.label}
        />
      );
  }
}

// ─── EventStep ─────────────────────────────────────────────────────

function EventStep({ competitionId }: { competitionId: string }) {
  const { setValue, watch } = useFormContext<RegistrationFormData>();
  const { data: levels } = useLevels(competitionId);
  const selectedLevelId = watch("selectedLevelId");
  const selectedSubEventId = watch("selectedSubEventId");
  const specialEntryType = watch("specialEntryType");

  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);

  const selectedLevel = levels?.find(l => l.id === selectedLevelId);
  const specialEntries: { type: string; label: string }[] = (selectedLevel as any)?.special_entries || [];
  const isCategories = (selectedLevel as any)?.structure_type === "categories";

  const { data: allCategories } = useQuery({
    queryKey: ["categories-for-registration", selectedLevelId],
    enabled: !!selectedLevelId && isCategories,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competition_categories")
        .select("*")
        .eq("level_id", selectedLevelId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string>("");

  const topCategories = useMemo(
    () => allCategories?.filter(c => !c.parent_id) || [],
    [allCategories]
  );
  const childCategories = useMemo(
    () => allCategories?.filter(c => c.parent_id === selectedCategoryId) || [],
    [allCategories, selectedCategoryId]
  );
  const grandchildCategories = useMemo(
    () => allCategories?.filter(c => c.parent_id === selectedSubCategoryId) || [],
    [allCategories, selectedSubCategoryId]
  );

  const selectLeafCategory = (cat: any) => {
    if (cat.sub_event_id) {
      setValue("selectedSubEventId", cat.sub_event_id);
      setValue("selectedSlotId", "");
    }
  };

  useEffect(() => {
    if (levels?.length && !selectedLevelId) {
      setValue("selectedLevelId", levels[0].id);
    }
  }, [levels, selectedLevelId, setValue]);

  useEffect(() => {
    setSelectedCategoryId("");
    setSelectedSubCategoryId("");
  }, [selectedLevelId]);

  useEffect(() => {
    if (specialEntryType && !specialEntries.some(e => e.type === specialEntryType)) {
      setValue("specialEntryType", "");
    }
  }, [selectedLevelId, specialEntries, specialEntryType, setValue]);

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader>
        <CardTitle>Select Your Category</CardTitle>
        <CardDescription>Choose the level and category you wish to compete in.</CardDescription>
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
                    setValue("specialEntryType", "");
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

        {specialEntries.length > 0 && (
          <div className="space-y-2">
            <Label>Special Entry Type <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <p className="text-xs text-muted-foreground">Tag this contestant if they qualify via a special entry path.</p>
            <div className="flex flex-wrap gap-2">
              {specialEntries.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => setValue("specialEntryType", specialEntryType === entry.type ? "" : entry.type)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    specialEntryType === entry.type
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCategories && topCategories.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {topCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      setSelectedSubCategoryId("");
                      setValue("selectedSubEventId", "");
                      setValue("selectedSlotId", "");
                      const hasChildren = allCategories?.some(c => c.parent_id === cat.id);
                      if (!hasChildren) selectLeafCategory(cat);
                    }}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      selectedCategoryId === cat.id
                        ? "bg-primary/10 border-primary text-primary ring-1 ring-primary"
                        : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedCategoryId && childCategories.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-2"
              >
                <Label>Sub-Category</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {childCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubCategoryId(cat.id);
                        setValue("selectedSubEventId", "");
                        setValue("selectedSlotId", "");
                        const hasChildren = allCategories?.some(c => c.parent_id === cat.id);
                        if (!hasChildren) selectLeafCategory(cat);
                      }}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        selectedSubCategoryId === cat.id
                          ? "bg-primary/10 border-primary text-primary ring-1 ring-primary"
                          : "bg-muted/50 border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {selectedSubCategoryId && grandchildCategories.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="space-y-2"
              >
                <Label>Selection</Label>
                <div className="grid gap-2">
                  {grandchildCategories.map(cat => {
                    const isSelected = cat.sub_event_id === selectedSubEventId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => selectLeafCategory(cat)}
                        className={`w-full text-left p-3 rounded-lg border text-sm transition-all flex justify-between items-center ${
                          isSelected
                            ? "bg-primary/5 border-primary ring-1 ring-primary"
                            : "bg-card border-border/50 hover:border-border"
                        }`}
                      >
                        <span className="font-medium">{cat.name}</span>
                        {isSelected && (
                          <Badge variant="default" className="rounded-full h-5 w-5 p-0 flex items-center justify-center">
                            <CheckCircle className="h-3 w-3" />
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {selectedSubEventId && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  {[
                    topCategories.find(c => c.id === selectedCategoryId)?.name,
                    childCategories.find(c => c.id === selectedSubCategoryId)?.name,
                    grandchildCategories.find(c => c.sub_event_id === selectedSubEventId)?.name,
                  ].filter(Boolean).join(" › ")}
                </span>
              </div>
            )}
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

// ─── ScheduleStep ──────────────────────────────────────────────────

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

// ─── LegalStep (config-driven) ─────────────────────────────────────

function LegalStep({
  competitionId,
  formConfig,
  customFieldValues = {},
  setCustomFieldValues,
}: {
  competitionId: string;
  formConfig?: FormBuilderConfig;
  customFieldValues?: Record<string, string>;
  setCustomFieldValues?: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
}) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<RegistrationFormData>();
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);
  const isMinor = watch("ageCategory") === "minor";

  const showRulesAcknowledged = isFieldEnabled(formConfig, "rulesAcknowledged");
  const showContestantSig = isFieldEnabled(formConfig, "contestantSignature");
  const showGuardianSig = isFieldEnabled(formConfig, "guardianSignature");

  const customFields = getCustomFieldsForSection(formConfig, "legal");

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

          {showRulesAcknowledged && (
            <>
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
            </>
          )}
        </CardContent>
      </Card>

      {showContestantSig && (
        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Final Certification</CardTitle>
            <CardDescription>Draw your signature below to complete the registration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <SignaturePad label={`${getFieldLabel(formConfig, "contestantSignature", "Contestant Signature")} *`} onSignature={v => setValue("contestantSig", v)} signerRole="Contestant" />
              {errors.contestantSig && <p className="text-xs text-destructive">{errors.contestantSig.message}</p>}
            </div>

            {isMinor && showGuardianSig && (
              <div className="space-y-2">
                <SignaturePad label={`${getFieldLabel(formConfig, "guardianSignature", "Guardian Signature")} *`} onSignature={v => setValue("guardianSig", v)} signerRole="Guardian" />
                {errors.guardianSig && <p className="text-xs text-destructive">{errors.guardianSig.message}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {customFields.length > 0 && (
        <CustomFieldsSection
          fields={customFields}
          customFieldValues={customFieldValues}
          setCustomFieldValues={setCustomFieldValues}
        />
      )}
    </div>
  );
}

// ─── Shared components ─────────────────────────────────────────────

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
