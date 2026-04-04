import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Import, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCompetitions } from "@/hooks/useCompetitions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCompetitionId: string;
  title?: string;
  description?: string;
  onSelect: (competitionId: string, competitionName: string) => void;
  loading?: boolean;
}

export function ImportFromEventDialog({
  open,
  onOpenChange,
  currentCompetitionId,
  title = "Import from Another Event",
  description = "Select an event to import its setup.",
  onSelect,
  loading = false,
}: Props) {
  const { data: competitions } = useCompetitions();
  const [search, setSearch] = useState("");

  const filtered = (competitions || [])
    .filter((c) => c.id !== currentCompetitionId)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Import className="h-4 w-4" /> {title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No other events found.</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={loading}
                onClick={() => onSelect(c.id, c.name)}
                className="w-full text-left rounded-md border border-border/50 px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.status}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {c.status}
                </Badge>
              </button>
            ))}
          </div>
        </ScrollArea>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Importing…
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
