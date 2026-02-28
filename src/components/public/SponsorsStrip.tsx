import type { CompetitionSponsor } from "@/hooks/useCompetitionSponsors";
import { ExternalLink } from "lucide-react";

export function SponsorsStrip({ sponsors }: { sponsors: CompetitionSponsor[] }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-foreground mb-4 font-mono">Sponsors</h2>
      <div className="flex flex-wrap gap-6 items-center">
        {sponsors.map(s => (
          <a
            key={s.id}
            href={s.website_url || "#"}
            target={s.website_url ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="group flex flex-col items-center gap-1"
          >
            <img src={s.logo_url} alt={s.name} className="h-16 w-auto object-contain rounded opacity-80 group-hover:opacity-100 transition-opacity" />
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">{s.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
