import { ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AuditoriumControls } from "@/components/AuditoriumControls";
import { Button } from "@/components/ui/button";
import { Zap, LogOut, User, Shield, LayoutDashboard, Trophy, ClipboardList } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const bottomNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(roles.includes("judge") || roles.includes("chief_judge") ? [{ path: "/judge-dashboard", label: "Judging", icon: ClipboardList }] : []),
    { path: "/competitions", label: "Events", icon: Trophy },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="auditorium-filter min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center justify-between px-3 sm:px-6">
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
            {roles.includes("admin") && (
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:hidden">
        <div className="flex items-stretch h-14">
          {bottomNavItems.map((item) => {
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
