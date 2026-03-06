import { TIERS, USD_DISCLAIMER, getLocalCurrencyApprox } from "@/lib/stripe-tiers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Shield, Users, Trophy, ClipboardCheck, Mic, Heart, HelpCircle, Mail } from "lucide-react";
import { InstallPWA } from "@/components/shared/InstallPWA";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import scorzLogo from "@/assets/scorz-logo.svg";

const ROLES = [
  {
    icon: Users,
    title: "Organiser",
    description: "Full control over your competition from creation to results.",
    features: [
      "Create & manage competitions, levels, and sub-events",
      "Build custom rubrics and penalty rules",
      "Manage contestant registrations and approvals",
      "Assign staff to roles per sub-event",
      "Upload banners, sponsors, and publish updates",
      "Configure ticketing and audience voting",
    ],
  },
  {
    icon: Shield,
    title: "Chief Judge",
    description: "Oversee scoring integrity and resolve disputes in real time.",
    features: [
      "Monitor all judge panels and live scores",
      "Review and apply penalty adjustments",
      "Break ties with criterion-level analysis",
      "Certify final results with digital signature",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Judge",
    description: "Score performances with guided rubrics and real-time feedback.",
    features: [
      "Criterion-by-criterion slider scoring",
      "Built-in performance timer with auto-penalties",
      "Add private comments per performance",
      "Digitally sign and certify scoresheets",
    ],
  },
  {
    icon: Trophy,
    title: "Tabulator",
    description: "Aggregate scores, time performances, audit votes, and verify process integrity.",
    features: [
      "Time each performance and flag overruns",
      "View side-by-side score comparisons",
      "Audit individual judge votes for discrepancies",
      "Observe and verify scoring integrity",
      "Generate master score sheets per level",
      "Log observations and flag concerns",
      "Certify digital-vs-physical score match",
    ],
  },
  {
    icon: Mic,
    title: "Contestant",
    description: "Register, schedule your performance, and track your results.",
    features: [
      "Self-service registration with profile & bio",
      "Choose performance slot from available times",
      "Guardian consent with digital signature",
      "View published results and rankings",
    ],
  },
  {
    icon: Heart,
    title: "Audience",
    description: "Engage with the competition through voting and ticketing.",
    features: [
      "Cast votes for favourite performers",
      "Purchase event tickets online",
      "Follow live competition updates and news",
    ],
  },
];

const FAQ = [
  {
    q: "What types of competitions can I run on Scorz?",
    a: "Scorz supports any scored competition—talent shows, pageants, debate tournaments, dance battles, speech contests, hackathons, and more. If it has judges and scores, Scorz handles it.",
  },
  {
    q: "How does digital scoring work?",
    a: "Judges score each contestant using a customisable rubric you build. Scores are submitted in real time via any device. The system automatically calculates totals, applies time penalties, and generates rankings instantly.",
  },
  {
    q: "Can I assign different staff to different events?",
    a: "Absolutely. You can assign judges, chief judges, and tabulators per sub-event. Each person only sees the events they're assigned to, keeping things organised and secure.",
  },
  {
    q: "Is my scoring data secure?",
    a: "Yes. All data is protected with row-level security policies. Judges can only access their own scores, organizers only see their own competitions, and all certifications are digitally signed and timestamped.",
  },
  {
    q: "Do contestants need an account to register?",
    a: "Yes, contestants create a free account and complete a self-service registration form that includes profile details, guardian consent (for minors), rules acknowledgement, and optional performance slot selection.",
  },
  {
    q: "Can the audience participate?",
    a: "When enabled, audience members can vote for their favorite contestants and purchase event tickets—all through the public event page. No account required for voting.",
  },
  {
    q: "What happens if there's a tie?",
    a: "The Chief Judge can break ties using criterion-level analysis—comparing specific rubric scores to determine the winner. All tie-break decisions are logged with notes for full transparency.",
  },
  {
    q: "Can I buy multiple competition credits?",
    a: "Yes. Each purchase unlocks one competition at the selected tier. You can buy as many credits as you need, and they never expire.",
  },
  {
    q: "What if I need a custom solution?",
    a: "Contact us at dev@phnyx.pro and we'll build a custom plan tailored to your organization's needs, including white-label options, API access, and dedicated support.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={scorzLogo} alt="Scorz" className="h-7 w-7" />
            <span className="font-bold tracking-tighter text-foreground text-lg font-mono">SCOR<span className="text-accent">Z</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <InstallPWA />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">Home</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── WHY ── Golden Circle Hero */}
      <section className="py-20 sm:py-28 text-center px-4">
        <motion.div {...fadeUp} className="max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-5 text-xs font-mono border-secondary/30 text-secondary">
            Why Scorz?
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-5 leading-tight">
            Every score should be <span className="text-secondary">transparent</span>, <span className="text-accent">fair</span>, and <span className="text-primary">instant</span>.
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8">
            Paper scoresheets get lost. Manual tallying introduces errors. Contestants wait hours for results they deserve in minutes. Scorz exists to eliminate these problems—replacing clipboards and spreadsheets with a real-time, role-based digital scoring platform that every stakeholder can trust.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth?view=signup">Start Now <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#roles">Explore Roles</a>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── HOW ── USP Strip */}
      <section className="border-y border-border/40 bg-card/40 py-12 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          {[
            { title: "Real-Time Scoring", desc: "Judges score on any device. Results update instantly—no waiting, no manual tallying." },
            { title: "Role-Based Access", desc: "Every participant—organizer, judge, tabulator—gets exactly the tools they need and nothing more." },
            { title: "End-to-End Integrity", desc: "Digital signatures, audit trails, and tie-break protocols ensure every result is defensible." },
          ].map((item, i) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.12 }}>
              <h3 className="text-sm font-bold text-foreground font-mono mb-1.5">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── WHAT ── Roles Section */}
      <section id="roles" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-14">
            <Badge variant="outline" className="mb-4 text-xs font-mono border-secondary/30 text-secondary">
              Built for every role
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-3">
              One platform, six roles, zero confusion
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              From the organizer setting up the event to the audience casting their vote, every participant gets a tailored experience.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ROLES.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.06 }}
              >
                <Card className="h-full border-border/50 bg-card/80">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-secondary/10 flex items-center justify-center">
                        <role.icon className="h-4 w-4 text-secondary" />
                      </div>
                      <CardTitle className="text-sm font-mono">{role.title}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{role.description}</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {role.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs">
                          <Check className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ── Pricing Cards ── */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-xs font-mono border-secondary/30 text-secondary">
              Simple, transparent pricing
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-3">
              Plans for every organizer
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
              Whether you're running a local talent show or a national championship, Scorz scales with you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card
                  className={`relative h-full flex flex-col border-border/50 bg-card/80 ${tier.highlight ? "ring-2 ring-secondary shadow-lg shadow-secondary/10" : ""
                    }`}
                >
                  {tier.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-secondary text-secondary-foreground text-[10px] font-mono">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-mono">{tier.name}</CardTitle>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-4xl font-bold text-foreground">${tier.price}</span>
                      <span className="text-sm text-muted-foreground">/competition</span>
                    </div>
                    {(() => {
                      const localApprox = getLocalCurrencyApprox(tier.price);
                      return localApprox ? (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{localApprox} approx.</p>
                      ) : null;
                    })()}
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{tier.description}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                          <span className={`text-muted-foreground ${f.includes("coming soon") ? "italic" : ""}`}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant={tier.highlight ? "default" : "outline"} asChild>
                      <Link to="/auth">
                        Get Started <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-[10px] text-muted-foreground font-mono mt-6">
            {USD_DISCLAIMER}
          </p>
        </div>
      </section>

      <Separator className="max-w-5xl mx-auto" />

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="h-5 w-5 text-secondary" />
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Everything you need to know before getting started.
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/40">
                <AccordionTrigger className="text-sm text-left font-medium text-foreground hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="border-t border-border/40 py-16 text-center px-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-secondary" />
          <h2 className="text-xl font-bold text-foreground">Need a custom plan or have questions?</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
          Running a large-scale or multi-city competition series? Reach out and we'll tailor a solution for you.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:dev@phnyx.pro">Contact Us</a>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-4">
        <p className="text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          @ 2026 SCORZ <span className="mx-2 opacity-30">|</span> Powered by phnyx.dev
        </p>
      </footer>
    </div>
  );
}
