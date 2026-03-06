import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { InstallPWA } from "@/components/shared/InstallPWA";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import scorzLogo from "@/assets/scorz-logo.svg";
import { format } from "date-fns";

function usePublicCompetitions() {
  return useQuery({
    queryKey: ["public-competitions"],
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
}

export default function PublicEvents() {
  const { data: competitions, isLoading } = usePublicCompetitions();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={scorzLogo} alt="Scorz" className="h-7 w-7" />
            <span className="font-bold tracking-tighter text-foreground text-lg font-mono">SCOR<span className="text-accent">Z</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <InstallPWA />
            <Button asChild size="sm" variant="ghost">
              <Link to="/about">About</Link>
            </Button>
            {user ? (
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <img src={scorzLogo} alt="Scorz" className="h-12 w-12 sm:h-14 sm:w-14" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-foreground font-mono">SCOR<span className="text-accent">Z</span></h1>
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Live competition management, real-time scoring, and audience engagement — all in one platform.
          </p>
        </motion.div>
      </section>

      {/* Events */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-xl font-bold text-foreground mb-6 font-mono">Upcoming & Current Events</h2>

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
                transition={{ delay: i * 0.1 }}
              >
                <Link to={`/events/${(comp as any).slug || comp.id}`}>
                  <Card className="group border-border/50 bg-card/80 hover:border-accent/50 transition-all overflow-hidden h-full">
                    {/* Banner */}
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
                      <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-accent transition-colors">
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
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          @ 2026 SCORZ <span className="mx-2 opacity-30">|</span> Powered by phnyx.dev
        </p>
      </footer>
    </div>
  );
}
