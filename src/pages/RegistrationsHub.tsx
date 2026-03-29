import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompetitions } from "@/hooks/useCompetitions";
import { RegistrationsManager } from "@/components/competition/RegistrationsManager";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ClipboardList } from "lucide-react";

export default function RegistrationsHub() {
  const navigate = useNavigate();
  const { data: competitions, isLoading } = useCompetitions();
  const [selectedId, setSelectedId] = useState("");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Registrations
          </h1>
          <p className="text-muted-foreground text-xs">Manage contestant registrations by competition</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-4">
          <label className="text-xs text-muted-foreground mb-1 block">Select Competition</label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading…" : "Choose a competition"} />
            </SelectTrigger>
            <SelectContent>
              {competitions?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedId && <RegistrationsManager competitionId={selectedId} />}
    </div>
  );
}
