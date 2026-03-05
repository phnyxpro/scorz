import {
    LayoutDashboard, Trophy, ClipboardList, User, Shield, Mic, Users,
    BarChart3, Eye, CreditCard, BookOpen, ShieldCheck, Calendar,
    DollarSign, FileText, ListChecks, Settings
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export type AppRole = "admin" | "organizer" | "chief_judge" | "judge" | "tabulator" | "witness" | "contestant" | "audience";

export interface NavItem {
    path: string;
    label: string;
    icon: LucideIcon;
    roles?: AppRole[];
    exact?: boolean;
}

export const mainNavItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/judge-dashboard", label: "Judging", icon: ClipboardList, roles: ["judge", "chief_judge"] },
    { path: "/competitions", label: "Events", icon: Trophy },
    { path: "/settings", label: "Settings", icon: Settings },
];

export const dashboardCards: { title: string; desc: string; icon: LucideIcon; color: string; to: string; roles?: AppRole[] }[] = [
    // Admin
    { title: "Admin Panel", desc: "Manage users, settings & billing", icon: Shield, color: "text-primary", to: "/admin", roles: ["admin"] },
    { title: "Platform Analytics", desc: "View metrics across all events", icon: BarChart3, color: "text-secondary", to: "/admin?tab=analytics", roles: ["admin"] },
    { title: "Support Mode", desc: "Masquerade as an organiser", icon: Eye, color: "text-secondary", to: "/admin?tab=support", roles: ["admin"] },

    // Organizer
    { title: "My Competitions", desc: "Manage your events & stages", icon: Trophy, color: "text-primary", to: "/competitions", roles: ["organizer"] },
    { title: "Judging Hub", desc: "Monitor all scoring", icon: ClipboardList, color: "text-secondary", to: "/judging", roles: ["organizer", "tabulator", "witness"] },
    { title: "Contestants", desc: "Registrations & profiles", icon: Users, color: "text-primary", to: "/profile", roles: ["organizer", "contestant"] },
    { title: "Payments", desc: "View ticket sales & revenue", icon: CreditCard, color: "text-secondary", to: "/finance", roles: ["organizer", "admin"] },
    { title: "People's Choice", desc: "Audience voting", icon: Mic, color: "text-primary", to: "/competitions?tab=voting", roles: ["organizer", "audience"] },

    // Tabulator / Witness
    { title: "Tabulator Dashboard", desc: "Verify scores & witness results", icon: BarChart3, color: "text-primary", to: "/tabulator", roles: ["tabulator", "witness"] },

    // Contestant / Audience Fallbacks
    { title: "Public Events", desc: "Browse competitions", icon: Calendar, color: "text-primary", to: "/public-events", roles: ["contestant", "audience"] },
    { title: "Pricing", desc: "View plans & get started", icon: DollarSign, color: "text-secondary", to: "/pricing" },
];
