import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Search, Trophy, Calendar, Users, Calculator, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const { roles, hasRole } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const { data: results, isLoading } = useQuery({
        queryKey: ["global-search", search],
        enabled: search.length > 2,
        queryFn: async () => {
            const term = `%${search}%`;

            const [comps, subEvents, contestants] = await Promise.all([
                // Competitions
                supabase
                    .from("competitions")
                    .select("id, name")
                    .ilike("name", term)
                    .limit(5),

                // Sub-events (if staff/org)
                (hasRole("admin") || hasRole("organizer") || hasRole("judge"))
                    ? supabase
                        .from("sub_events")
                        .select("id, name, competition_id")
                        .ilike("name", term)
                        .limit(5)
                    : Promise.resolve({ data: [] }),

                // Contestants (if staff/org/admin)
                (hasRole("admin") || hasRole("organizer"))
                    ? supabase
                        .from("contestant_registrations")
                        .select("id, full_name, competition_id")
                        .ilike("full_name", term)
                        .limit(5)
                    : Promise.resolve({ data: [] }),
            ]);

            return {
                competitions: comps.data || [],
                subEvents: subEvents.data || [],
                contestants: contestants.data || [],
            };
        },
    });

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border/50 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors w-full max-w-[200px]"
            >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Type to search competitions, contestants..."
                    value={search}
                    onValueChange={setSearch}
                />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {results?.competitions && results.competitions.length > 0 && (
                        <CommandGroup heading="Competitions">
                            {results.competitions.map((c) => (
                                <CommandItem
                                    key={c.id}
                                    onSelect={() => runCommand(() => navigate(`/competitions/${c.id}`))}
                                    className="gap-2"
                                >
                                    <Trophy className="h-4 w-4 text-primary" />
                                    <span>{c.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {results?.subEvents && results.subEvents.length > 0 && (
                        <CommandGroup heading="Sessions / Sub-events">
                            {results.subEvents.map((se) => (
                                <CommandItem
                                    key={se.id}
                                    onSelect={() => runCommand(() => navigate(`/competitions/${se.competition_id}`))}
                                    className="gap-2"
                                >
                                    <Calendar className="h-4 w-4 text-accent" />
                                    <span>{se.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {results?.contestants && results.contestants.length > 0 && (
                        <CommandGroup heading="Contestants">
                            {results.contestants.map((con) => (
                                <CommandItem
                                    key={con.id}
                                    onSelect={() => runCommand(() => navigate(`/admin`))}
                                    className="gap-2"
                                >
                                    <Users className="h-4 w-4 text-secondary" />
                                    <span>{con.full_name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />

                    <CommandGroup heading="Quick Nav">
                        <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
                            <Calculator className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        {hasRole("admin") && (
                            <CommandItem onSelect={() => runCommand(() => navigate("/admin"))}>
                                <Shield className="mr-2 h-4 w-4" />
                                <span>Admin Panel</span>
                            </CommandItem>
                        )}
                        <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}

import { Shield } from "lucide-react";
