import {
    LayoutDashboard, Trophy, ClipboardList, User, Shield, Mic, Users,
    BarChart3, Eye, CreditCard, BookOpen, ShieldCheck, Calendar,
    DollarSign, FileText, ListChecks, Settings, TicketCheck
} from "lucide-react";
import { LucideIcon } from "lucide-react";

/**
 * Defines the comprehensive set of roles a user can hold within the Scorz platform context.
 * 
 * - `admin`: Platform-wide administrative privileges. Can view/edit all data globally.
 * - `organizer`: The creator/owner of a competition. Manages event settings, registration, and staffing.
 * - `chief_judge`: Oversees a judging panel. Can score, monitor other judges, and certify final event results.
 * - `judge`: Assigned to sub-events to provide scores to contestants based on defined rubrics.
 * - `tabulator`: Reviews certified scores, calculates aggregate results, and manages publication.
 * - `witness`: An independent observer assigned to monitor the integrity of the event. Read-only access.
 * - `contestant`: A participant registered for one or more events.
 * - `audience`: A general user who can view public events and participate in voting.
 */
export type AppRole = "admin" | "organizer" | "judge" | "tabulator" | "contestant" | "audience";

/**
 * Interface defining a navigation item for the sidebar and mobile menus.
 */
export interface NavItem {
    /** The URL path the item links to. */
    path: string;
    /** The text label displayed in the UI. */
    label: string;
    /** The Lucide icon component to display alongside the label. */
    icon: LucideIcon;
    /** An optional array of roles allowed to view this item. If omitted, the item is visible to all authenticated users. */
    roles?: AppRole[];
    /** Whether the route matching should be exact (used for active state highlighting). */
    exact?: boolean;
}

export const mainNavItems: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/judge-dashboard", label: "Judging", icon: ClipboardList, roles: ["judge"] },
    { path: "/competitions", label: "Events", icon: Trophy },
    { path: "/settings", label: "Settings", icon: Settings },
];

export const dashboardCards: { title: string; desc: string; icon: LucideIcon; color: string; to: string; roles?: AppRole[] }[] = [
    // Admin
    { title: "User Management", desc: "Manage users & assign roles", icon: Users, color: "text-primary", to: "/admin/users", roles: ["admin"] },
    { title: "Global Settings", desc: "Branding, flags & defaults", icon: Shield, color: "text-secondary", to: "/admin/settings", roles: ["admin"] },
    { title: "Billing", desc: "Subscriptions & payment tiers", icon: CreditCard, color: "text-secondary", to: "/admin/billing", roles: ["admin"] },

    // Organizer
    { title: "My Competitions", desc: "Manage your events & stages", icon: Trophy, color: "text-primary", to: "/competitions", roles: ["organizer"] },
    { title: "Judging Hub", desc: "Monitor all scoring", icon: ClipboardList, color: "text-secondary", to: "/judging", roles: ["organizer", "tabulator"] },
    { title: "Registrations", desc: "Manage contestant registrations", icon: ListChecks, color: "text-primary", to: "/registrations", roles: ["organizer"] },
    { title: "Contestant Profiles", desc: "View approved contestant profiles", icon: User, color: "text-primary", to: "/contestant-profiles", roles: ["organizer"] },
    { title: "Results", desc: "View certified competition results", icon: BarChart3, color: "text-secondary", to: "/results-hub", roles: ["organizer", "admin"] },
    { title: "My Profile", desc: "View your contestant profile", icon: Users, color: "text-primary", to: "/profile", roles: ["contestant"] },
    { title: "Payments", desc: "View ticket sales & revenue", icon: CreditCard, color: "text-secondary", to: "/finance", roles: ["organizer", "admin"] },
    { title: "People's Choice", desc: "Manage audience voting", icon: Mic, color: "text-primary", to: "/peoples-choice", roles: ["organizer", "admin"] },
    { title: "People's Choice", desc: "Vote for your favorites", icon: Mic, color: "text-primary", to: "/competitions", roles: ["audience"] },
    { title: "Tickets", desc: "View all ticket sales & details", icon: TicketCheck, color: "text-secondary", to: "/tickets-hub", roles: ["organizer", "admin"] },
    { title: "Ticket Check-In", desc: "Check in patrons at events", icon: TicketCheck, color: "text-primary", to: "/check-in", roles: ["organizer", "admin"] },

    // Tabulator / Witness
    { title: "Tabulator Dashboard", desc: "Verify scores & certify results", icon: BarChart3, color: "text-primary", to: "/tabulator", roles: ["tabulator"] },

    // Contestant / Audience Fallbacks
    { title: "Events", desc: "Browse competitions", icon: Calendar, color: "text-primary", to: "/audience-events", roles: ["contestant", "audience"] },
    { title: "My Tickets", desc: "View tickets & invoices", icon: CreditCard, color: "text-secondary", to: "/my-tickets", roles: ["audience", "contestant"] },
];
