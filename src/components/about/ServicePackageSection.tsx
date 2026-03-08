import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Check, Sparkles, Gavel, Settings, CalendarCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const EVENT_TYPES = ["Pageant", "Talent Show", "Dance Competition", "Speech/Debate", "Other"] as const;

const CONTESTANT_RANGES = ["1–20", "21–50", "51–100", "101–200", "200+"] as const;

const schema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  organisation: z.string().trim().min(2, "Organisation is required").max(150),
  event_type: z.enum(EVENT_TYPES, { required_error: "Select an event type" }),
  expected_contestants: z.enum(CONTESTANT_RANGES, { required_error: "Select a range" }),
  preferred_date: z.string().trim().max(100).optional().or(z.literal("")),
  location: z.string().trim().min(2, "Location is required").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const ADJUDICATION = [
  "Judge recruitment & training",
  "Custom rubric design consultation",
  "Chief Judge coordination",
  "Real-time scoring oversight",
  "Results certification & reporting",
];

const PRODUCTION = [
  "Full event setup on Scorz platform",
  "Contestant registration management",
  "Scheduling & slot coordination",
  "Branding & sponsor configuration",
  "On-the-day technical support",
  "Post-event reporting & analytics",
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function ServicePackageSection() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      organisation: "",
      preferred_date: "",
      location: "",
      description: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    const { error } = await supabase.from("service_requests" as any).insert([
      {
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || null,
        organisation: data.organisation,
        event_type: data.event_type,
        expected_contestants: data.expected_contestants,
        preferred_date: data.preferred_date || null,
        location: data.location,
        description: data.description || null,
      },
    ] as any);

    if (error) {
      toast({ title: "Something went wrong", description: "Please try again or email dev@phnyx.pro directly.", variant: "destructive" });
      return;
    }

    setSubmitted(true);
    toast({ title: "Request submitted!", description: "We'll be in touch within 48 hours to schedule your discovery meeting." });
  };

  return (
    <section id="service-package" className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div {...fadeUp} className="text-center mb-12">
          <Badge className="mb-4 text-xs font-mono bg-accent/10 text-accent border-accent/30">
            <Sparkles className="h-3 w-3 mr-1" /> Full-Service Package
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-3">
            Let us run the entire show
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            Don't just use the platform — let our team handle adjudication, production, and every technical detail so you can focus on your event.
          </p>
        </motion.div>

        {/* Feature columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-md bg-secondary/10 flex items-center justify-center">
                  <Gavel className="h-4 w-4 text-secondary" />
                </div>
                <h3 className="text-sm font-mono font-bold text-foreground">Adjudication Management</h3>
              </div>
              <ul className="space-y-2">
                {ADJUDICATION.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-md bg-accent/10 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-accent" />
                </div>
                <h3 className="text-sm font-mono font-bold text-foreground">Production Management</h3>
              </div>
              <ul className="space-y-2">
                {PRODUCTION.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-8">
          <span className="text-3xl font-bold text-foreground">Custom Quote</span>
          <p className="text-xs text-muted-foreground mt-1">Tailored to your event's size and requirements</p>
        </div>

        <Separator className="mb-10" />

        {/* Discovery form */}
        <motion.div {...fadeUp}>
          <Card className="border-accent/20 bg-card/90 max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <CalendarCheck className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold text-foreground">Request a Discovery Meeting</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Tell us about your event and we'll schedule a free consultation to scope out exactly what you need.
              </p>

              {submitted ? (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-secondary" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground mb-1">We've got your request!</h4>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Our team will reach out within 48 hours to schedule your discovery meeting. Check your inbox.
                  </p>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="full_name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl><Input type="email" placeholder="jane@org.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input placeholder="+1 555 123 4567" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="organisation" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organisation / Event Name *</FormLabel>
                          <FormControl><Input placeholder="Miss Universe SA" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="event_type" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EVENT_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="expected_contestants" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Contestants *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTESTANT_RANGES.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="preferred_date" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Event Date(s)</FormLabel>
                          <FormControl><Input placeholder="e.g. June 2026 or 15–17 Aug" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Location *</FormLabel>
                          <FormControl><Input placeholder="Johannesburg, South Africa" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brief Description / Special Requirements</FormLabel>
                        <FormControl><Textarea placeholder="Tell us about your event, any special requirements, or questions you have..." rows={4} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                      ) : (
                        <>Request Discovery Meeting</>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
