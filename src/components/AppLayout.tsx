import { ReactNode, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuditoriumControls } from "@/components/AuditoriumControls";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield } from "lucide-react";
import scorzLogo from "@/assets/scorz-logo.svg";
import { mainNavItems } from "@/lib/navigation";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, roles, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const visibleNavItems = useMemo(() => {
    return mainNavItems.filter(item => {
      if (!item.roles) return true;
      return item.roles.some(role => roles.includes(role));
    });
  }, [roles]);

  return (
    <div className="auditorium-filter min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center justify-between px-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={scorzLogo} alt="Scorz" className="h-6 w-6" />
            <span className="font-mono text-sm font-bold tracking-tighter text-foreground">SCOR<span className="text-accent">Z</span></span>
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
            {hasRole("admin") && (
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => navigate("/admin")} title="Admin Panel">
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:inline-flex" onClick={() => navigate("/profile")} title="My Profile">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSignOut} title="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-4 sm:py-6 px-3 sm:px-6 pb-20 sm:pb-6">
        {children}
      </main>

      <footer className="container py-6 px-3 sm:px-6 border-t border-border/10">
        <p className="text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          @ 2026 SCORZ <span className="mx-2 opacity-30">|</span> Powered by phnyx.dev
        </p>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:hidden">
        <div className="flex items-stretch h-14">
          {visibleNavItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${isActive
                  ? "text-primary"
                  : "text-muted-foreground"
                  }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
