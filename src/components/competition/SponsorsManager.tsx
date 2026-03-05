import { useState } from "react";
import { useCompetitionSponsors, useCreateSponsor, useDeleteSponsor } from "@/hooks/useCompetitionSponsors";
import { BannerUpload } from "@/components/shared/BannerUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, ExternalLink } from "lucide-react";

export function SponsorsManager({ competitionId }: { competitionId: string }) {
  const { data: sponsors, isLoading } = useCompetitionSponsors(competitionId);
  const create = useCreateSponsor();
  const remove = useDeleteSponsor();

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const handleAdd = () => {
    if (!name.trim() || !logoUrl) return;
    create.mutate({
      competition_id: competitionId,
      name: name.trim(),
      logo_url: logoUrl,
      website_url: websiteUrl.trim() || undefined,
      sort_order: (sponsors?.length || 0),
    });
    setName("");
    setLogoUrl("");
    setWebsiteUrl("");
  };

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader><CardTitle className="text-base">Sponsors</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Existing sponsors */}
        {isLoading && <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>}
        {sponsors?.map(s => (
          <div key={s.id} className="flex items-center gap-3 border border-border/50 rounded-md p-3">
            <img src={s.logo_url} alt={s.name} className="h-10 w-10 object-contain rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              {s.website_url && (
                <a href={s.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Website
                </a>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove.mutate({ id: s.id, competition_id: competitionId })}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        {/* Add new */}
        <div className="border border-dashed border-border rounded-md p-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Add Sponsor</p>
          <Input placeholder="Sponsor name" value={name} onChange={e => setName(e.target.value)} />
          <BannerUpload
            currentUrl={logoUrl || null}
            folder={`sponsors/${competitionId}`}
            aspectLabel="Sponsor Logo"
            onUploaded={setLogoUrl}
            onRemoved={() => setLogoUrl("")}
          />
          <Input placeholder="Website URL (optional)" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} />
          <Button onClick={handleAdd} disabled={!name.trim() || !logoUrl || create.isPending} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Sponsor
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
