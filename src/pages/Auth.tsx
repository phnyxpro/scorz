import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Zap, ArrowLeft, Mail, Copy, Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

import scorzLogo from "@/assets/scorz-logo.svg";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

const DEMO_ACCOUNTS = [
  { role: "Organizer", email: "organizer@demo.scorz.app", password: "demo1234", color: "bg-primary/10 text-primary" },
  { role: "Chief Judge", email: "chief_judge@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Judge", email: "judge@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Tabulator", email: "tabulator@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Witness", email: "witness@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Contestant", email: "contestant@demo.scorz.app", password: "demo1234", color: "bg-muted text-muted-foreground" },
  { role: "Audience", email: "audience@demo.scorz.app", password: "demo1234", color: "bg-muted text-muted-foreground" },
];

export default function Auth() {
  const { signIn, signUp, resetPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a verification link." });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email to reset password.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(loginEmail);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reset link sent", description: "Check your email for the password reset link." });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setLoading(false);
      toast({ title: "Google Login failed", description: error.message, variant: "destructive" });
    }
  };

  const fillDemoCredentials = (email: string, password: string) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 1500);
  };

  return (
    <div className="auditorium-filter min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link to="/pricing">Pricing</Link>
        </Button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <img src={scorzLogo} alt="Scorz" className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tighter text-foreground font-mono">SCOR<span className="text-accent">Z</span></h1>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-card-foreground">Access Port</CardTitle>
            <CardDescription>Sign in to manage your events or create an organiser account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Organiser Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in…" : "Sign In"}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-border/50 hover:bg-muted"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg
                    className="h-4 w-4"
                    aria-hidden="true"
                    focusable="false"
                    data-prefix="fab"
                    data-icon="google"
                    role="img"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 488 512"
                  >
                    <path
                      fill="currentColor"
                      d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                    ></path>
                  </svg>
                  Google
                </Button>

                {/* Demo Accounts Accordion */}
                <Accordion type="single" collapsible className="mt-6">
                  <AccordionItem value="demo-accounts" className="border-border/30">
                    <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-3">
                      <span className="flex items-center gap-2">
                        <Zap className="h-3 w-3" />
                        Demo Accounts — Try every role
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {DEMO_ACCOUNTS.map((acc) => (
                          <button
                            key={acc.email}
                            type="button"
                            onClick={() => fillDemoCredentials(acc.email, acc.password)}
                            className="w-full flex items-center justify-between gap-2 rounded-md border border-border/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="secondary" className={`text-[10px] shrink-0 ${acc.color}`}>
                                {acc.role}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate font-mono">{acc.email}</span>
                            </div>
                            {copiedEmail === acc.email ? (
                              <Check className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            )}
                          </button>
                        ))}
                        <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
                          Password for all: <code className="font-mono bg-muted px-1 rounded">demo1234</code>
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Creating account…" : "Create Organiser Account"}
                  </Button>
                </form>
                <p className="text-[10px] text-muted-foreground mt-4 text-center leading-relaxed">
                  By creating an organiser account, you can create, manage, and promote your own competitions.
                  Judges and staff will be invited directly to the platform.
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <footer className="absolute bottom-6 w-full text-center px-4 pointer-events-none">
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest pointer-events-auto">
          @ 2026 SCORZ <span className="mx-2 opacity-30">|</span> Powered by phnyx.dev
        </p>
      </footer>
    </div>
  );
}
