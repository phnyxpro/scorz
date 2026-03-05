import { LayoutDashboard, Trophy, ClipboardList, User, Shield, Mic, Users } from "lucide-react";
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
    { path: "/profile", label: "Profile", icon: User },
];

export const adminNavItems: NavItem[] = [
    { path: "/admin", label: "Admin Panel", icon: Shield, roles: ["admin"] },
];

export const dashboardCards: { title: string; desc: string; icon: LucideIcon; color: string; to: string; roles?: AppRole[] }[] = [
    { title: "Competitions", desc: "Manage events & stages", icon: Trophy, color: "text-primary", to: "/competitions" },
    { title: "My Assignments", desc: "View and score your sessions", icon: ClipboardList, color: "text-secondary", to: "/judge-dashboard", roles: ["judge", "chief_judge"] },
    { title: "Judging Hub", desc: "Monitor all scoring", icon: ClipboardList, color: "text-secondary", to: "/judging" },
    { title: "Contestants", desc: "Registrations & profiles", icon: Users, color: "text-primary", to: "/profile" },
    { title: "People's Choice", desc: "Audience voting", icon: Mic, color: "text-secondary", to: "/competitions" },
];
