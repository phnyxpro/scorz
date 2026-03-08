import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, Activity, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ActivityFeed, type ActivityFeedFilters } from "@/components/shared/ActivityFeed";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EVENT_TYPES = [
  { value: "", label: "All event types" },
  { value: "scores_certified", label: "Scores Certified" },
  { value: "chief_certified", label: "Chief Judge Certified" },
  { value: "tabulator_certified", label: "Tabulator Certified" },
  { value: "witness_certified", label: "Witness Certified" },
  { value: "notification_sent", label: "Notification Sent" },
  { value: "registration_created", label: "Registration Created" },
  { value: "registration_approved", label: "Registration Approved" },
  { value: "registration_rejected", label: "Registration Rejected" },
  { value: "staff_login", label: "Staff Login" },
  { value: "competition_created", label: "Competition Created" },
  { value: "scoring_started", label: "Scoring Started" },
];

const PAGE_SIZE = 50;

export default function AdminLogs() {
  const { hasRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [eventType, setEventType] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);

  const { data: competitions } = useQuery({
    queryKey: ["admin-log-competitions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("competitions")
        .select("id, name")
        .order("name");
      return data || [];
    },
  });

  if (!hasRole("admin") && !hasRole("organizer")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-12 w-12" />
        <p className="font-mono text-sm">Access denied. Admin or Organiser role required.</p>
      </div>
    );
  }

  const filters: ActivityFeedFilters = {
    ...(eventType ? { eventType } : {}),
    ...(searchQuery ? { searchQuery } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Audit Logs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Realtime activity trail for the entire platform</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select value={eventType} onValueChange={(v) => { setEventType(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="All event types" />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((et) => (
              <SelectItem key={et.value} value={et.value || "all"} className="text-sm">
                {et.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={competitionId} onValueChange={(v) => { setCompetitionId(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="All competitions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-sm">All competitions</SelectItem>
            {(competitions || []).map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("h-9 text-sm justify-start", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "PP") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(1); }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("h-9 text-sm justify-start", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "PP") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(1); }} className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
      </div>

      {(searchQuery || eventType || dateFrom || dateTo) && (
        <div className="mb-3">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setSearchQuery(""); setEventType(""); setDateFrom(undefined); setDateTo(undefined); setPage(1); }}>
            Clear all filters
          </Button>
        </div>
      )}

      <ActivityFeed
        competitionId={competitionId || undefined}
        limit={PAGE_SIZE}
        page={page}
        filters={filters}
      />

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <span className="text-sm text-muted-foreground font-mono">Page {page}</span>
        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
