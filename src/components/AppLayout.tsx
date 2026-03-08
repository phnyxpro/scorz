import { ReactNode, useMemo } from "react";
import { formatRoleName } from "@/lib/utils";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { PageBreadcrumbs } from "@/components/PageBreadcrumbs";
import { Button } from "@/components/ui/button";
import { LogOut, User, Shield, Eye, X, BookOpen } from "lucide-react";
import scorzLogo from "@/assets/scorz-logo.svg";
import { mainNavItems } from "@/lib/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { AuditoriumControls } from "@/components/AuditoriumControls";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, signOut, roles, hasRole, masquerade, stopMasquerade, isMasquerading } = useAuth();
  const { brightness, contrast } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveUserId = isMasquerading ? masquerade?.userId : user?.id;
  const effectiveEmail = isMasquerading ? masquerade?.email : user?.email;
  const needsFilter = brightness !== 100 || contrast !== 100;

  // Check if user has chief judge designation via assignments or pending invitations
  const { data: isChiefJudge } = useQuery({
    queryKey: ["chief-judge-badge", effectiveUserId, effectiveEmail],
    enabled: !!effectiveUserId,
    queryFn: async () => {
      // Check sub_event_assignments
      const { data: assignments } = await supabase
        .from("sub_event_assignments")
        .select("id")
        .eq("user_id", effectiveUserId!)
        .eq("is_chief", true)
        .limit(1);
      if (assignments && assignments.length > 0) return true;

      // Check pending staff_invitations by email
      if (effectiveEmail) {
        const { data: invites } = await supabase
          .from("staff_invitations")
          .select("id")
          .ilike("email", effectiveEmail)
          .eq("is_chief", true)
          .is("accepted_at", null)
          .limit(1);
        if (invites && invites.length > 0) return true;
      }
      return false;
    },
  });

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
    <div className={`${needsFilter ? "auditorium-filter" : ""} min-h-screen bg-background`}>
      {/* Masquerade banner */}
      {isMasquerading && masquerade && (
        <div className="sticky top-0 z-[60] bg-destructive/90 text-destructive-foreground px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="font-mono text-xs">
              Viewing as <strong>{masquerade.fullName || masquerade.email}</strong>
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-destructive-foreground hover:bg-destructive-foreground/20" onClick={() => {
            const compId = masquerade?.competitionId;
            stopMasquerade();
            if (compId) {
              navigate(`/competitions/${compId}?tab=assignments`);
            }
          }}>
            <X className="h-3 w-3 mr-1" /> Exit
          </Button>
        </div>
      )}
      <header role="banner" className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center px-3 sm:px-6">
          {/* Left: Logo + Brand */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={scorzLogo} alt="Scorz" className="h-6 w-6" />
              <span className="font-mono text-sm font-bold tracking-tighter text-foreground">SCOR<span className="text-accent">Z</span></span>
            </Link>
          </div>

          {/* Center: Search */}
          <div className="flex-1 flex justify-center px-4">
            <div className="w-full max-w-sm">
              <GlobalSearch />
            </div>
          </div>
          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {(roles.length > 0 || isChiefJudge) && (
              <div className="hidden sm:flex gap-1">
                {roles.map((r) => (
                  <span key={r} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {formatRoleName(r)}
                  </span>
                ))}
                {isChiefJudge && !roles.includes("chief_judge") && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    Chief Judge
                  </span>
                )}
              </div>
            )}
            <AuditoriumControls />
            <NotificationCenter />
            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => navigate("/help")} title="Knowledge Base" aria-label="Knowledge Base">
              <BookOpen className="h-4 w-4" />
            </Button>
            {hasRole("admin") && (
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => navigate("/admin")} title="Admin Panel" aria-label="Admin Panel">
                <Shield className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-muted-foreground hidden sm:inline-flex" onClick={() => navigate("/settings")} title="Settings" aria-label="Settings">
              <User className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSignOut} title="Sign Out" aria-label="Sign Out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-4 sm:py-6 px-3 sm:px-6 pb-20 sm:pb-6">
        <PageBreadcrumbs />
        {children}
      </main>

      <footer className="container py-6 px-3 sm:px-6 border-t border-border/10">
        <p className="text-center text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          @ 2026 SCORZ <span className="mx-2 opacity-30">|</span> Powered by phnyx.dev
        </p>
      </footer>

      {/* Mobile bottom nav */}
      <nav role="navigation" aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:hidden">
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
