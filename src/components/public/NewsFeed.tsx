import type { CompetitionUpdate } from "@/hooks/useCompetitionUpdates";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper } from "lucide-react";
import { format } from "date-fns";

export function NewsFeed({ updates }: { updates: CompetitionUpdate[] }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4 font-mono flex items-center gap-2">
        <Newspaper className="h-5 w-5" /> News & Updates
      </h2>
      <div className="space-y-3">
        {updates.map(u => (
          <Card key={u.id} className="border-border/50 bg-card/80">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{u.title}</p>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(new Date(u.published_at), "MMM d, yyyy")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{u.content}</p>
              {u.image_url && (
                <img src={u.image_url} alt={u.title} className="rounded-md mt-2 max-h-48 object-cover" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
