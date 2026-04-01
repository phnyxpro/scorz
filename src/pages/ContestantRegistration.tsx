import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCompetition } from "@/hooks/useCompetitions";
import { useMyRegistration, useCreateRegistration } from "@/hooks/useRegistrations";
import { useRegistrationFormConfig, createDefaultFormSchema } from "@/hooks/useRegistrationForm";
import { DynamicRegistrationForm } from "@/components/registration/DynamicRegistrationForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

export default function ContestantRegistration() {
  const { id: competitionId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isOnBehalf = searchParams.get("behalf") === "true";
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const { data: existing, isLoading: regLoading } = useMyRegistration(competitionId);
  const { data: formConfig, isLoading: configLoading } = useRegistrationFormConfig(competitionId);
  const createReg = useCreateRegistration();
  const { toast } = useToast();
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  const [authLoading, setAuthLoading] = useState(false);
  const [authData, setAuthData] = useState({ email: "", password: "", fullName: "" });

  const formSchema = useMemo(() => {
    if (formConfig?.form_schema) return formConfig.form_schema;
    return createDefaultFormSchema();
  }, [formConfig]);

  const handleSignUp = async () => {
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
  };

  const handleDynamicSubmit = async (builtinData: Record<string, any>, customData: Record<string, any>) => {
    if (!user || !competitionId) return;

    // When form uses custom field IDs, values may be in customData
    const allValues = { ...customData, ...builtinData };
    const findVal = (builtinKeys: string[], hints: string[]) => {
      for (const k of builtinKeys) if (builtinData[k]) return builtinData[k];
      for (const hint of hints) {
        for (const [k, v] of Object.entries(allValues)) {
          if (v && k.toLowerCase().includes(hint)) return v;
        }
      }
      return undefined;
    };

    // Resolve sub_event_id: direct selector first, then from deepest category
    let resolvedSubEvent = builtinData.__subevent_selector || builtinData.selectedSubEventId || allValues.__subevent_selector || allValues.selectedSubEventId;
    if (!resolvedSubEvent) {
      const deepestCatId = allValues.__deepest_category_id || allValues.__subcategory_selector || allValues.selectedSubCategoryId || allValues.__category_selector || allValues.selectedCategoryId;
      if (deepestCatId) {
        const { data: cat } = await supabase
          .from("competition_categories")
          .select("sub_event_id")
          .eq("id", deepestCatId)
          .maybeSingle();
        if (cat?.sub_event_id) resolvedSubEvent = cat.sub_event_id;
      }
    }

    createReg.mutate({
      user_id: user.id,
      competition_id: competitionId,
      full_name: findVal(["full_name", "fullName"], ["name", "applicant"]) || user.user_metadata?.full_name || "",
      email: findVal(["email"], ["email"]) || user.email || "",
      phone: findVal(["phone"], ["phone"]),
      location: findVal(["location"], ["location", "city"]),
      age_category: findVal(["age_category"], ["age"]) || "adult",
      bio: findVal(["bio"], ["bio"]),
      performance_video_url: findVal(["performance_video_url", "videoUrl"], ["video"]),
      guardian_name: findVal(["guardian_name"], ["guardian_name"]),
      guardian_email: findVal(["guardian_email"], ["guardian_email"]),
      guardian_phone: findVal(["guardian_phone"], ["guardian_phone"]),
      sub_event_id: resolvedSubEvent || null,
      rules_acknowledged: !!(findVal(["__rules_acknowledgment", "rules_acknowledged"], ["rules", "consent"])),
      rules_acknowledged_at: findVal(["__rules_acknowledgment"], ["rules", "consent"]) ? new Date().toISOString() : undefined,
      contestant_signature: findVal(["__contestant_signature", "contestant_signature"], ["signature"]),
      contestant_signed_at: findVal(["__contestant_signature", "contestant_signature"], ["signature"]) ? new Date().toISOString() : undefined,
      guardian_signature: builtinData.__guardian_signature,
      guardian_signed_at: builtinData.__guardian_signature ? new Date().toISOString() : undefined,
      custom_field_values: allValues,
    } as any, {
      onSuccess: async (createdReg: any) => {
        // Book time slot if selected
        const slotId = builtinData.__time_slot_selector || builtinData.selectedSlotId;
        if (slotId && createdReg?.id) {
          await supabase
            .from("performance_slots")
            .update({ is_booked: true, contestant_registration_id: createdReg.id } as any)
            .eq("id", slotId);
        }
        toast({ title: "Registration submitted!", description: "Awaiting organiser review." });
        navigate("/dashboard");
      },
      onError: (e: any) => {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      }
    });
  };

  if (compLoading || regLoading || configLoading) return <LoadingSpinner />;

  if (existing) {
    return <AlreadyRegisteredView status={existing.status} onBack={() => navigate("/competitions")} />;
  }

  return (
    <div className="max-w-3xl mx-auto pb-12 px-4 sm:px-0">
      <header className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate("/competitions")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">{comp?.name || "Competition"}</h1>
        <p className="text-sm text-muted-foreground">Complete each step to register.</p>
      </header>

      {
    !user ? (
      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          <Card className="border-border/50 bg-card/80 backdrop-blur max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Create Account</CardTitle>
              <CardDescription>Join Scorz to track your performance and scores.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  placeholder="John Doe"
                  value={authData.fullName}
                  onChange={e => setAuthData({ ...authData, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={authData.email}
                  onChange={e => setAuthData({ ...authData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <PasswordInput
                  placeholder="••••••••"
                  value={authData.password}
                  onChange={e => setAuthData({ ...authData, password: e.target.value })}
                />
              </div>
              <Button className="w-full" onClick={handleSignUp} disabled={authLoading}>
                {authLoading ? "Creating Account..." : "Create Account & Continue"}
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Already have an account? <a href="/login" className="text-primary hover:underline">Log in</a>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    ) : (
    <DynamicRegistrationForm
      formSchema={formSchema}
      competitionId={competitionId!}
      mode="registration"
      onSubmit={handleDynamicSubmit}
      isSubmitting={createReg.isPending}
      initialValues={{
        full_name: user.user_metadata?.full_name || "",
        email: user.email || "",
      }}
    />
  )
  }
    </div >
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
