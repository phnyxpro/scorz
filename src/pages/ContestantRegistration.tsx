import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, ArrowRight, CheckCircle, User, UserPlus, FileText, PenTool, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const BASE_STEPS = [
  { id: "info", label: "Personal Info", icon: User },
  { id: "rules", label: "Rules & Rubric", icon: FileText },
  { id: "signature", label: "Sign & Certify", icon: PenTool },
  { id: "schedule", label: "Schedule", icon: Calendar },
];

export default function ContestantRegistration() {
  const { id: competitionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signUp } = useAuth();
  const { data: comp, isLoading: compLoading } = useCompetition(competitionId);
  const { data: rubric } = useRubricCriteria(competitionId);
  const { data: penalties } = usePenaltyRules(competitionId);
  const { data: levels } = useLevels(competitionId);
  const { data: existing, isLoading: regLoading } = useMyRegistration(competitionId);
  const createReg = useCreateRegistration();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const steps = user
    ? BASE_STEPS
    : [{ id: "account", label: "Account Setup", icon: UserPlus }, ...BASE_STEPS];

  // Auth state
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [ageCategory, setAgeCategory] = useState("adult");
  const [bio, setBio] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  // Rules
  const [rulesChecked, setRulesChecked] = useState<Record<string, boolean>>({});
  const ruleItems = [
    "I have read and understand the competition rules",
    "I agree to the scoring rubric and criteria",
    "I understand the time limits and penalty structure",
    "I consent to have my performance recorded and scored",
  ];
  const allRulesChecked = ruleItems.every((_, i) => rulesChecked[`rule_${i}`]);

  // Signature
  const [contestantSig, setContestantSig] = useState("");
  const [guardianSig, setGuardianSig] = useState("");

  // Schedule
  const [selectedSubEvent, setSelectedSubEvent] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setFullName(user.user_metadata?.full_name || "");
    }
  }, [user]);

  useEffect(() => {
    if (levels?.length && !selectedLevelId) {
      setSelectedLevelId(levels[0].id);
    }
  }, [levels, selectedLevelId]);

  const isMinor = ageCategory === "minor";

  const canProceed = () => {
    const currentStepId = steps[step].id;
    switch (currentStepId) {
      case "account": return authEmail.trim() && authPassword.length >= 6 && authName.trim();
      case "info": return fullName.trim() && email.trim() && (!isMinor || guardianName.trim());
      case "rules": return allRulesChecked;
      case "signature": return !!contestantSig && (!isMinor || !!guardianSig);
      case "schedule": return true;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (steps[step].id === "account") {
      setAuthLoading(true);
      const { error } = await signUp(authEmail, authPassword, authName);
      setAuthLoading(false);
      if (error) {
        toast({ title: "Account setup failed", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Account created", description: "Please check your email to verify. You can continue with the details now." });
      // We don't advance yet because user is still 'null' until session refresh? 
      // Actually AuthContext might update 'user' if session is instant?
      // In Lovable/Supabase, it usually doesn't update until verification unless auto-confirm is on.
      // But we can let them fill the rest and use the email.
    }
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    if (!user || !competitionId) return;

    // Ensure user has contestant role
    await supabase.from("user_roles").insert({ user_id: user.id, role: "contestant" as any });

    createReg.mutate({
      user_id: user.id,
      competition_id: competitionId,
      full_name: fullName,
      email,
      phone: phone || undefined,
      location: location || undefined,
      age_category: ageCategory,
      bio: bio || undefined,
      performance_video_url: videoUrl || undefined,
      guardian_name: isMinor ? guardianName : undefined,
      guardian_email: isMinor ? guardianEmail : undefined,
      guardian_phone: isMinor ? guardianPhone : undefined,
      rules_acknowledged: true,
      rules_acknowledged_at: new Date().toISOString(),
      contestant_signature: contestantSig,
      contestant_signed_at: new Date().toISOString(),
      guardian_signature: isMinor ? guardianSig : undefined,
      guardian_signed_at: isMinor ? new Date().toISOString() : undefined,
      sub_event_id: selectedSubEvent || undefined,
    } as any, {
      onSuccess: async (data: any) => {
        // Book the selected time slot if one was chosen
        if (selectedSlotId && data?.id) {
          await supabase
            .from("performance_slots")
            .update({ is_booked: true, contestant_registration_id: data.id } as any)
            .eq("id", selectedSlotId);
        }
        toast({ title: "Registration complete", description: "Your details have been submitted successfully." });
        navigate(`/competitions`);
      },
    });
  };

  if (compLoading || regLoading) {
    return <div className="text-muted-foreground font-mono text-sm animate-pulse">Loading…</div>;
  }

  if (existing) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="border-border/50 bg-card/80">
          <CardContent className="flex flex-col items-center py-12">
            <CheckCircle className="h-12 w-12 text-secondary mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-2">Already Registered</h2>
            <p className="text-muted-foreground text-sm text-center">
              You've already registered for this competition. Status: <Badge variant="outline">{existing.status}</Badge>
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/competitions")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Competitions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/competitions")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Register for {comp?.name}</h1>
          <p className="text-muted-foreground text-xs">Complete all steps to submit your registration</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-6">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => i < step && setStep(i)}
            className={`flex-1 flex items-center gap-1.5 px-2 py-2 rounded text-[10px] sm:text-xs font-medium transition-colors ${i === step ? "bg-primary text-primary-foreground" :
              i < step ? "bg-secondary/20 text-secondary cursor-pointer" :
                "bg-muted text-muted-foreground"
              }`}
          >
            <s.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={steps[step].id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {steps[step].id === "account" && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base text-primary">Setup Your Account</CardTitle>
                <CardDescription>Create a secure account to manage your profile and view scores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name" className="text-xs">Full Name</Label>
                  <Input id="reg-name" placeholder="John Doe" value={authName} onChange={e => {
                    setAuthName(e.target.value);
                    setFullName(e.target.value);
                  }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email" className="text-xs">Email Address</Label>
                  <Input id="reg-email" type="email" placeholder="john@example.com" value={authEmail} onChange={e => {
                    setAuthEmail(e.target.value);
                    setEmail(e.target.value);
                  }} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-pass" className="text-xs">Password</Label>
                  <Input id="reg-pass" type="password" placeholder="••••••••" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * By creating an account, you will be assigned the contestant role upon completion.
                </p>
              </CardContent>
            </Card>
          )}

          {steps[step].id === "info" && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Tell us about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Full Name *</label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Email *</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Phone</label>
                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1..." />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Location</label>
                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Age Category *</label>
                    <Select value={ageCategory} onValueChange={setAgeCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adult">Adult (18+)</SelectItem>
                        <SelectItem value="minor">Minor (Under 18)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {isMinor && (
                  <div className="border border-border/50 rounded-md p-3 space-y-2 bg-muted/30">
                    <p className="text-xs font-medium text-foreground">Parent / Guardian Information</p>
                    <Input value={guardianName} onChange={e => setGuardianName(e.target.value)} placeholder="Guardian full name *" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} placeholder="Guardian email" />
                      <Input value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} placeholder="Guardian phone" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground">Bio</label>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Brief bio or performance background" rows={3} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Performance Video URL</label>
                  <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personal Info Step handled above */}

          {steps[step].id === "rules" && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Rules & Rubric Acknowledgment</CardTitle>
                <CardDescription>Read and acknowledge each section</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rubric summary */}
                {rubric && rubric.length > 0 && (
                  <div className="border border-border/50 rounded-md p-3 bg-muted/20">
                    <p className="text-xs font-medium text-foreground mb-2">Scoring Criteria</p>
                    <div className="space-y-1">
                      {rubric.map(c => (
                        <div key={c.id} className="text-xs text-muted-foreground flex justify-between">
                          <span>{c.name}</span>
                          <span className="font-mono">1-5 pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Penalty summary */}
                {penalties && penalties.length > 0 && (
                  <div className="border border-border/50 rounded-md p-3 bg-muted/20">
                    <p className="text-xs font-medium text-foreground mb-2">Time Penalties</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      Time limit: {Math.floor(penalties[0].time_limit_seconds / 60)}:{String(penalties[0].time_limit_seconds % 60).padStart(2, "0")}
                      {" "}| Grace: {penalties[0].grace_period_seconds}s
                    </p>
                    {penalties.map(p => (
                      <div key={p.id} className="text-xs text-muted-foreground flex justify-between">
                        <span>{p.from_seconds}s – {p.to_seconds ? `${p.to_seconds}s` : "beyond"}</span>
                        <span className="text-destructive font-mono">-{p.penalty_points} pts</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rule checkboxes */}
                <div className="space-y-3 pt-2">
                  {ruleItems.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Checkbox
                        id={`rule_${i}`}
                        checked={!!rulesChecked[`rule_${i}`]}
                        onCheckedChange={(v) => setRulesChecked(prev => ({ ...prev, [`rule_${i}`]: !!v }))}
                      />
                      <label htmlFor={`rule_${i}`} className="text-sm text-foreground cursor-pointer leading-tight">
                        {rule}
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {steps[step].id === "signature" && (
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-base">Digital Signature</CardTitle>
                <CardDescription>
                  Draw your signature to certify that all information is accurate and you accept the competition rules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SignaturePad label="Contestant Signature *" onSignature={setContestantSig} />
                {isMinor && (
                  <SignaturePad label="Parent / Guardian Signature *" onSignature={setGuardianSig} />
                )}
              </CardContent>
            </Card>
          )}

          {steps[step].id === "schedule" && (
            <ScheduleStep
              levels={levels || []}
              selectedLevelId={selectedLevelId}
              setSelectedLevelId={setSelectedLevelId}
              selectedSubEvent={selectedSubEvent}
              setSelectedSubEvent={(id) => { setSelectedSubEvent(id); setSelectedSlotId(""); }}
              selectedSlotId={selectedSlotId}
              setSelectedSlotId={setSelectedSlotId}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between mt-4">
        <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < steps.length - 1 ? (
          <Button disabled={!canProceed() || authLoading} onClick={handleNext}>
            {authLoading ? "Initializing…" : "Next"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button disabled={!canProceed() || createReg.isPending} onClick={handleSubmit}>
            {createReg.isPending ? "Submitting…" : "Submit Registration"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ScheduleStep({
  levels,
  selectedLevelId,
  setSelectedLevelId,
  selectedSubEvent,
  setSelectedSubEvent,
  selectedSlotId,
  setSelectedSlotId,
}: {
  levels: { id: string; name: string }[];
  selectedLevelId: string;
  setSelectedLevelId: (id: string) => void;
  selectedSubEvent: string;
  setSelectedSubEvent: (id: string) => void;
  selectedSlotId: string;
  setSelectedSlotId: (id: string) => void;
}) {
  const { data: subEvents } = useSubEvents(selectedLevelId || undefined);

  // Fetch available slots for selected sub-event
  const { data: slots } = useQuery({
    queryKey: ["performance-slots", selectedSubEvent],
    enabled: !!selectedSubEvent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("performance_slots")
        .select("*")
        .eq("sub_event_id", selectedSubEvent)
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
        <CardDescription>Choose your sub-event and performance time (optional)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {levels.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground">Level / Stage</label>
            <Select value={selectedLevelId} onValueChange={setSelectedLevelId}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {levels.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {subEvents && subEvents.length > 0 ? (
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Sub-Event</label>
            {subEvents.map(se => (
              <button
                key={se.id}
                onClick={() => setSelectedSubEvent(se.id === selectedSubEvent ? "" : se.id)}
                className={`w-full text-left border rounded-md p-3 transition-colors ${se.id === selectedSubEvent
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-muted/20 hover:bg-muted/40"
                  }`}
              >
                <div className="font-medium text-sm text-foreground">{se.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {se.event_date && <span>{se.event_date}</span>}
                  {se.start_time && <span> · {se.start_time}{se.end_time ? ` – ${se.end_time}` : ""}</span>}
                  {se.location && <span> · {se.location}</span>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {levels.length === 0
              ? "No levels configured yet. You can skip scheduling."
              : "No sub-events available for this level."}
          </p>
        )}

        {/* Time slot picker */}
        {selectedSubEvent && slots && slots.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/30">
            <label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Available Performance Slots
            </label>
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlotId(slot.id === selectedSlotId ? "" : slot.id)}
                    className={`text-center border rounded-md p-2 transition-colors text-sm font-mono ${slot.id === selectedSlotId
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border/50 bg-muted/20 hover:bg-muted/40 text-foreground"
                      }`}
                  >
                    {formatTime((slot as any).start_time)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">All slots are booked.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
