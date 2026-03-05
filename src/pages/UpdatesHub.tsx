import { useState } from "react";
import { useCompetitions } from "@/hooks/useCompetitions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpdatesManager } from "@/components/competition/UpdatesManager";
import { Newspaper } from "lucide-react";

export default function UpdatesHub() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const { data: competitions } = useCompetitions();

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Newspaper className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">News & Updates</h1>
          <p className="text-sm text-muted-foreground">Post updates for your events</p>
        </div>
      </div>

      <Select value={selectedCompetitionId} onValueChange={setSelectedCompetitionId}>
        <SelectTrigger className="w-full sm:w-72">
          <SelectValue placeholder="Select a competition" />
        </SelectTrigger>
        <SelectContent>
          {competitions?.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedCompetitionId ? (
        <UpdatesManager competitionId={selectedCompetitionId} />
      ) : (
        <p className="text-sm text-muted-foreground">Select a competition to manage updates.</p>
      )}
    </div>
  );
}
