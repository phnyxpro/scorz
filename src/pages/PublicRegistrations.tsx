import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Search, ClipboardList } from "lucide-react";
import scorzLogo from "@/assets/scorz-logo.svg";
import { useState, useMemo } from "react";
import { DetailPageSkeleton } from "@/components/shared/PageSkeletons";

export default function PublicRegistrations() {
  const { id: slug } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");

  const { data: competition, isLoading: compLoading } = useQuery({
    queryKey: ["public-competition", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase.from("competitions").select("*") as any)
        .eq("slug", slug!)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Not found");
      return data as any;
    },
  });

  const compId = competition?.id as string | undefined;

  // Fetch levels and categories for resolving IDs to names
  const { data: levels } = useQuery({
    queryKey: ["public-reg-levels", compId],
    enabled: !!compId,
    queryFn: async () => {
      const { data } = await supabase.from("competition_levels").select("id, name").eq("competition_id", compId!).order("sort_order");
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["public-reg-categories", compId],
    enabled: !!compId,
    queryFn: async () => {
      const levelIds = (levels || []).map(l => l.id);
      if (!levelIds.length) return [];
      const { data } = await supabase.from("competition_categories").select("id, name").in("level_id", levelIds);
      return data || [];
    },
  });

  const { data: contestants, isLoading: contestantsLoading } = useQuery({
    queryKey: ["public-registrations", compId],
    enabled: !!compId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("public_contestants" as any)
        .select("id, full_name, profile_photo_url, sub_event_id, sort_order, age_category, location, status, competition_id")
        .eq("competition_id", compId!)
        .eq("status", "approved")
        .order("sort_order", { ascending: true }) as any);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch custom_field_values for approved registrations to show category/division
  const { data: registrationDetails } = useQuery({
    queryKey: ["public-reg-details", compId],
    enabled: !!compId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("public_contestants" as any)
        .select("id")
        .eq("competition_id", compId!)
        .eq("status", "approved") as any);
      if (error) throw error;
      const ids = (data || []).map((d: any) => d.id);
      if (!ids.length) return [];
      // We can't get custom fields from the public view; fetch from contestant_registrations if anon has access
      // Since public_contestants is a view, we'll show what's available
      return [];
    },
  });

  // Build resolver for form config options and category IDs
  const formConfig = competition?.registration_form_config as any;
  const valueResolver = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories || []) map.set(cat.id, cat.name);
    for (const lv of levels || []) map.set(lv.id, lv.name);
    if (formConfig?.fields) {
      for (const field of formConfig.fields) {
        if (field.options) {
          for (const opt of field.options) {
            if (opt.value && opt.label) map.set(opt.value, opt.label);
          }
        }
      }
    }
    return map;
  }, [categories, levels, formConfig]);

  // Fetch sub_events to show event names
  const { data: subEvents } = useQuery({
    queryKey: ["public-reg-subevents", compId],
    enabled: !!compId,
    queryFn: async () => {
      const lvIds = (levels || []).map(l => l.id);
      if (!lvIds.length) return [];
      const { data } = await supabase.from("sub_events").select("id, name, level_id").in("level_id", lvIds);
      return data || [];
    },
  });

  const subEventMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const se of subEvents || []) m.set(se.id, se.name);
    return m;
  }, [subEvents]);

  const filtered = useMemo(() => {
    if (!contestants) return [];
    if (!search.trim()) return contestants;
    const q = search.toLowerCase();
    return contestants.filter((c: any) =>
      c.full_name?.toLowerCase().includes(q) || c.location?.toLowerCase().includes(q)
    );
  }, [contestants, search]);

  if (compLoading) return <DetailPageSkeleton />;
  if (!competition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground">Event Not Found</h2>
            <p className="text-sm text-muted-foreground">The event you're looking for doesn't exist or is no longer available.</p>
            <Link to="/public-events">
              <Button variant="outline" size="sm" className="mt-2"><ArrowLeft className="h-3 w-3 mr-1" /> Browse Events</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = contestants?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`Registrations – ${competition.name}`} description={`View registered contestants for ${competition.name}`} />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={`/events/${slug}`}>
            <Button variant="ghost" size="icon" className="shrink-0"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{competition.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ClipboardList className="h-3 w-3" /> Registered Contestants
            </p>
          </div>
          {competition.branding_logo_url ? (
            <img src={competition.branding_logo_url} alt="" className="h-8 w-8 rounded object-contain" />
          ) : (
            <img src={scorzLogo} alt="Scorz" className="h-6 opacity-60" />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Stats & search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Badge variant="secondary" className="w-fit text-xs gap-1">
            <Users className="h-3 w-3" /> {total} registered
          </Badge>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search contestants…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        {contestantsLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm animate-pulse">Loading contestants…</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "No contestants match your search." : "No approved contestants yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>Contestant</TableHead>
                    <TableHead className="hidden sm:table-cell">Location</TableHead>
                    <TableHead className="hidden sm:table-cell">Event</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c: any, i: number) => (
                    <TableRow key={c.id} className="hover:bg-muted/20">
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={c.profile_photo_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {(c.full_name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm text-foreground">{c.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{c.location || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {c.sub_event_id ? (subEventMap.get(c.sub_event_id) || "—") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-12 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by <Link to="/" className="text-primary hover:underline">Scorz</Link>
        </p>
      </footer>
    </div>
  );
}
