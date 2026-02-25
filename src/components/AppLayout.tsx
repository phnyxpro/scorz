import { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuditoriumControls } from "@/components/AuditoriumControls";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, User } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="auditorium-filter min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-mono text-sm font-bold tracking-tight text-foreground">SCORE</span>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">PHNYX.DEV</span>
          </Link>

          <div className="flex items-center gap-2">
            {roles.length > 0 && (
              <div className="hidden sm:flex gap-1">
                {roles.map((r) => (
                  <span key={r} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {r.replace("_", " ")}
                  </span>
                ))}
              </div>
            )}
            <AuditoriumControls />
            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}
