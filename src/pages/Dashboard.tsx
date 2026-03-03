import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trophy, Users, ClipboardList, Mic, Shield, BarChart3, Eye,
  CreditCard, BookOpen, ShieldCheck, User, Calendar, DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { LucideIcon } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface CardConfig {
  title: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  to: string;
}

const ROLE_CARDS: Record<string, CardConfig[]> = {
  admin: [
    { title: "Admin Panel", desc: "Manage users, settings & billing", icon: Shield, color: "text-primary", to: "/admin" },
    { title: "Platform Analytics", desc: "View metrics across all events", icon: BarChart3, color: "text-secondary", to: "/admin?tab=analytics" },
    { title: "All Competitions", desc: "Browse all hosted competitions", icon: Trophy, color: "text-primary", to: "/competitions" },
    { title: "Support Mode", desc: "Masquerade as an organiser", icon: Eye, color: "text-secondary", to: "/admin?tab=support" },
  ],
  organizer: [
    { title: "My Competitions", desc: "Manage your events & stages", icon: Trophy, color: "text-primary", to: "/competitions" },
    { title: "Judging Hub", desc: "Monitor all scoring", icon: ClipboardList, color: "text-secondary", to: "/judging" },
    { title: "Contestants", desc: "Registrations & profiles", icon: Users, color: "text-primary", to: "/profile" },
    { title: "Payments", desc: "View ticket sales & revenue", icon: CreditCard, color: "text-secondary", to: "/competitions?tab=payments" },
    { title: "People's Choice", desc: "Audience voting", icon: Mic, color: "text-primary", to: "/competitions?tab=voting" },
  ],
  chief_judge: [
    { title: "My Assignments", desc: "View and score your sessions", icon: ClipboardList, color: "text-primary", to: "/judge-dashboard" },
    { title: "Judging Hub", desc: "Monitor scoring progress", icon: BarChart3, color: "text-secondary", to: "/judging" },
    { title: "Certify Results", desc: "Review and certify results", icon: ShieldCheck, color: "text-primary", to: "/chief-judge" },
    { title: "Rules & Rubric", desc: "Competition rules and criteria", icon: BookOpen, color: "text-secondary", to: "/competitions?tab=rubric" },
  ],
  judge: [
    { title: "My Assignments", desc: "View and score your sessions", icon: ClipboardList, color: "text-primary", to: "/judge-dashboard" },
    { title: "Judging Hub", desc: "Monitor scoring progress", icon: BarChart3, color: "text-secondary", to: "/judging" },
    { title: "Rules & Rubric", desc: "Competition rules and criteria", icon: BookOpen, color: "text-primary", to: "/competitions?tab=rubric" },
  ],
  tabulator: [
    { title: "Tabulator Dashboard", desc: "Verify scores & witness results", icon: BarChart3, color: "text-primary", to: "/tabulator" },
    { title: "Judging Hub", desc: "Monitor scoring progress", icon: ClipboardList, color: "text-secondary", to: "/judging" },
  ],
  witness: [
    { title: "Tabulator Dashboard", desc: "Verify scores & witness results", icon: BarChart3, color: "text-primary", to: "/tabulator" },
    { title: "Judging Hub", desc: "Monitor scoring progress", icon: ClipboardList, color: "text-secondary", to: "/judging" },
  ],
  contestant: [
    { title: "My Profile", desc: "View registration & profile", icon: User, color: "text-primary", to: "/profile" },
    { title: "Public Events", desc: "Browse competitions", icon: Calendar, color: "text-secondary", to: "/public-events" },
  ],
  audience: [
    { title: "Public Events", desc: "Browse competitions", icon: Calendar, color: "text-primary", to: "/public-events" },
    { title: "People's Choice", desc: "Cast your votes", icon: Mic, color: "text-secondary", to: "/competitions?tab=voting" },
  ],
};

const FALLBACK_CARDS: CardConfig[] = [
  { title: "Public Events", desc: "Browse competitions", icon: Calendar, color: "text-primary", to: "/public-events" },
  { title: "Pricing", desc: "View plans & get started", icon: DollarSign, color: "text-secondary", to: "/pricing" },
];

function buildCards(roles: string[]): CardConfig[] {
  if (roles.length === 0) return FALLBACK_CARDS;
  const seen = new Set<string>();
  const result: CardConfig[] = [];
  for (const role of roles) {
    for (const card of ROLE_CARDS[role] ?? []) {
      if (!seen.has(card.to)) {
        seen.add(card.to);
        result.push(card);
      }
    }
  }
  return result.length ? result : FALLBACK_CARDS;
}

export default function Dashboard() {
  const { user, roles } = useAuth();
  const cards = buildCards(roles);
  const { stats, loading: statsLoading } = useDashboardStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : user?.email ? `, ${user.email}` : ""}
        </p>
      </div>

      {/* Quick stats */}
      {stats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6"
        >
          {statsLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border/40 bg-card/60 p-3">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-6 w-10" />
                </div>
              ))
            : stats.map((s) => (
                <Link key={s.label} to={s.to} className="rounded-lg border border-border/40 bg-card/60 p-3 hover:bg-card/90 hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{s.value ?? "—"}</p>
                </Link>
              ))}
        </motion.div>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cards.map((c) => (
          <motion.div key={c.to} variants={item}>
            <Link to={c.to}>
              <Card className="border-border/50 bg-card/80 hover:bg-card transition-colors cursor-pointer group">
                <CardHeader className="pb-2">
                  <c.icon className={`h-8 w-8 ${c.color} mb-2 group-hover:scale-110 transition-transform`} />
                  <CardTitle className="text-base">{c.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{c.desc}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
