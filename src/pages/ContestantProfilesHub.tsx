import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useRegistrations } from "@/hooks/useRegistrations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ContestantProfilesHub() {
  const navigate = useNavigate();
  const { data: competitions, isLoading: loadingComps } = useCompetitions();
  const [selectedId, setSelectedId] = useState("");
  const { data: registrations, isLoading: loadingRegs } = useRegistrations(selectedId || undefined);

  const approved = registrations?.filter((r) => r.status === "approved") ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Contestant Profiles
          </h1>
          <p className="text-muted-foreground text-xs">View approved contestants by competition</p>
        </div>
      </div>

      <Card className="border-border/50 bg-card/80">
        <CardContent className="pt-4">
          <label className="text-xs text-muted-foreground mb-1 block">Select Competition</label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder={loadingComps ? "Loading…" : "Choose a competition"} />
            </SelectTrigger>
            <SelectContent>
              {competitions?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedId && loadingRegs && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      )}

      {selectedId && !loadingRegs && approved.length === 0 && (
        <p className="text-sm text-muted-foreground italic text-center py-12">No approved contestants yet.</p>
      )}

      {selectedId && !loadingRegs && approved.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {approved.map((r) => (
            <motion.div key={r.id} variants={item}>
              <Link to={`/profile/${r.user_id}`}>
                <Card className="border-border/50 bg-card/80 hover:bg-card transition-colors cursor-pointer group">
                  <CardContent className="pt-4 flex gap-3">
                    <Avatar className="h-14 w-14 shrink-0">
                      <AvatarImage src={r.profile_photo_url || ""} alt={r.full_name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {r.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate group-hover:text-secondary transition-colors">
                        {r.full_name}
                      </p>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{r.age_category}</Badge>
                      {r.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {r.location}
                        </p>
                      )}
                      {r.bio && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.bio}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
