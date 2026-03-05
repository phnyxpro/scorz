import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import scorzLogo from "@/assets/scorz-logo.svg";
import { format } from "date-fns";

export default function AudienceEvents() {
  const { data: competitions, isLoading } = useQuery({
    queryKey: ["audience-competitions"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("*")
        .in("status", ["active", "completed"])
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">Events</h1>
        <p className="text-muted-foreground text-sm">Browse upcoming and current competitions</p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : competitions && competitions.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitions.map((comp, i) => (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/events/${comp.slug || comp.id}`}>
                <Card className="group border-border/50 bg-card/80 hover:border-primary/50 transition-all overflow-hidden h-full">
                  <div className="h-40 bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
                    {comp.banner_url ? (
                      <img
                        src={comp.banner_url}
                        alt={comp.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <img src={scorzLogo} alt="" className="h-12 w-12 opacity-20" />
                      </div>
                    )}
                    <Badge
                      className="absolute top-3 right-3"
                      variant={comp.status === "active" ? "default" : "secondary"}
                    >
                      {comp.status === "active" ? "Live" : "Completed"}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                      {comp.name}
                    </h3>
                    {comp.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2">{comp.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                      {comp.start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(comp.start_date), "MMM d, yyyy")}
                          {comp.end_date && ` – ${format(new Date(comp.end_date), "MMM d, yyyy")}`}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <span className="text-xs text-primary font-medium flex items-center gap-1 group-hover:underline">
                        View Details <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <img src={scorzLogo} alt="" className="h-10 w-10 opacity-20 mx-auto mb-3" />
          <p className="text-muted-foreground">No events available at the moment.</p>
          <p className="text-muted-foreground text-sm">Check back soon!</p>
        </div>
      )}
    </div>
  );
}
