import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Scale, Calculator, CheckCircle } from "lucide-react";
import scorzLogo from "@/assets/scorz-logo.svg";

export default function MagicLinkLanding() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  const isJudge = roles.includes("judge") || roles.includes("chief_judge");
  const isTabulator = roles.includes("tabulator");
  const roleName = isJudge ? "Judge" : isTabulator ? "Tabulator" : "Team Member";
  const RoleIcon = isJudge ? Scale : Calculator;
  const destination = isJudge ? "/judge-dashboard" : isTabulator ? "/tabulator" : "/dashboard";
  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(destination, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [user, destination, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground font-mono text-sm">Authenticating…</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
          <img src={scorzLogo} alt="Scorz" className="h-8 mb-2" />

          <div className="p-4 rounded-full bg-primary/10">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Welcome, {userName}!</h1>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <RoleIcon className="h-4 w-4" />
              <span className="text-sm">Signed in as <strong className="text-foreground">{roleName}</strong></span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground max-w-xs">
            {isJudge
              ? "You're all set to score performances. Head to your judging dashboard to get started."
              : isTabulator
                ? "You're ready to tabulate results. Your dashboard has everything you need."
                : "You're signed in and ready to go."}
          </p>

          <Button onClick={() => navigate(destination, { replace: true })} className="w-full">
            Go to Dashboard
          </Button>

          <p className="text-xs text-muted-foreground">
            Redirecting in {countdown}s…
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
