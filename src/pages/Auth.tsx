import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Zap, ArrowLeft, Copy, Check, Briefcase, Star, Users, Scale, Calculator, Mail, ChevronLeft, Home, Info } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import scorzLogo from "@/assets/scorz-logo.svg";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";

type SignupRole = "organizer" | "contestant" | "audience";
type SigninRole = "organizer" | "contestant" | "audience" | "judge" | "tabulator";

const SIGNUP_ROLES: { role: SignupRole; label: string; desc: string; icon: typeof Briefcase }[] = [
  { role: "organizer", label: "Event Organiser", desc: "Create & manage competitions", icon: Briefcase },
  { role: "contestant", label: "Contestant", desc: "Register & compete in events", icon: Star },
  { role: "audience", label: "Audience Member", desc: "Vote & attend events", icon: Users },
];

const SIGNIN_ROLES: { role: SigninRole; label: string; desc: string; icon: typeof Briefcase; magicLink: boolean }[] = [
  { role: "organizer", label: "Organiser", desc: "Password or magic link", icon: Briefcase, magicLink: true },
  { role: "contestant", label: "Contestant", desc: "Access your profile", icon: Star, magicLink: false },
  { role: "audience", label: "Audience", desc: "View & vote", icon: Users, magicLink: false },
  { role: "judge", label: "Judge", desc: "Password or magic link", icon: Scale, magicLink: true },
  { role: "tabulator", label: "Tabulator", desc: "Password or magic link", icon: Calculator, magicLink: true },
];

const DEMO_ACCOUNTS = [
  { role: "Organiser", email: "organizer@demo.scorz.app", password: "demo1234", color: "bg-primary/10 text-primary" },
  { role: "Chief Judge", email: "chief_judge@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Judge", email: "judge@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Tabulator", email: "tabulator@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Witness", email: "witness@demo.scorz.app", password: "demo1234", color: "bg-accent/10 text-accent" },
  { role: "Contestant", email: "contestant@demo.scorz.app", password: "demo1234", color: "bg-muted text-muted-foreground" },
  { role: "Audience", email: "audience@demo.scorz.app", password: "demo1234", color: "bg-muted text-muted-foreground" },
];

export default function Auth() {
  const { signIn, signUp, resetPassword, signInWithGoogle, signInWithMagicLink } = useAuth();
  const { brightness, contrast } = useTheme();
  const needsFilter = brightness !== 100 || contrast !== 100;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // parse query params for onboarding/defaults
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const initialView = search.get("view") === "signup" ? "signup" : "login";
  const initialRoleParam = search.get("role");
  const redirectTo = search.get("redirect") || undefined;

  // Sign Up state
  const [signupRole, setSignupRole] = useState<SignupRole | null>(
    (initialRoleParam as SignupRole) || null
  );
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");

  // Sign In state
  const [signinRole, setSigninRole] = useState<SigninRole | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [signinMethod, setSigninMethod] = useState<"password" | "magic" | null>(null);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate(redirectTo || "/dashboard");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupRole) return;
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupRole);
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a verification link." });
      // redirect after signup only if no email confirmation required?
      if (!redirectTo) {
        navigate(redirectTo || "/dashboard");
      }
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithMagicLink(magicLinkEmail);
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setMagicLinkSent(true);
    }
  };

  const handleResetPassword = async () => {
    if (!loginEmail) {
      toast({ title: "Email required", description: "Please enter your email to reset password.", variant: "destructive" });
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
    setSigninRole("organizer"); // show password form
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 1500);
  };

  const isMagicLinkRole = signinRole === "judge" || signinRole === "tabulator" || signinRole === "organizer";

  return (
    <div className={`${needsFilter ? "auditorium-filter" : ""} min-h-screen flex items-center justify-center bg-background p-4 relative`}>
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 px-2 sm:px-3 text-muted-foreground hover:text-foreground" onClick={() => navigate("/")}>
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Home</span>
        </Button>
        <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3 text-muted-foreground hover:text-foreground">
          <Link to="/about">
            <Info className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">About</span>
          </Link>
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <img src={scorzLogo} alt="Scorz" className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tighter text-foreground font-mono">SCOR<span className="text-accent">Z</span></h1>
          </div>
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-card-foreground">Access Port</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* ─── SIGN IN ─── */}
              <TabsContent value="login">
                <AnimatePresence mode="wait">
                  {!signinRole ? (
                    <motion.div key="role-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <p className="text-xs text-muted-foreground mb-3">Select your role to sign in:</p>
                      <div className="space-y-2">
                        {SIGNIN_ROLES.map((r) => (
                          <button
                            key={r.role}
                            type="button"
                            onClick={() => { setSigninRole(r.role); setSigninMethod(null); }}
                            className="w-full flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 text-left hover:bg-muted/50 hover:border-accent/40 transition-all group"
                          >
                            <r.icon className="h-5 w-5 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{r.label}</p>
                              <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                            </div>
                            {r.magicLink && (
                              <Badge variant="outline" className="text-[9px] shrink-0 border-accent/40 text-accent">
                                <Mail className="h-2.5 w-2.5 mr-1" />Magic Link
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ) : isMagicLinkRole && !signinMethod ? (
                    /* Method picker for judge/tabulator */
                    <motion.div key="method-pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button type="button" onClick={() => setSigninRole(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ChevronLeft className="h-3 w-3" /> Back to role selection
                      </button>
                      <p className="text-xs text-muted-foreground mb-3">How would you like to sign in?</p>
                      <div className="space-y-2">
                        <button type="button" onClick={() => setSigninMethod("password")} className="w-full flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 text-left hover:bg-muted/50 hover:border-accent/40 transition-all">
                          <Zap className="h-5 w-5 text-primary shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Email &amp; Password</p>
                            <p className="text-[11px] text-muted-foreground">Sign in with your credentials</p>
                          </div>
                        </button>
                        <button type="button" onClick={() => setSigninMethod("magic")} className="w-full flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 text-left hover:bg-muted/50 hover:border-accent/40 transition-all">
                          <Mail className="h-5 w-5 text-primary shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-foreground">Magic Link</p>
                            <p className="text-[11px] text-muted-foreground">Receive a sign-in link via email</p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  ) : isMagicLinkRole && signinMethod === "magic" ? (
                    <motion.div key="magic-link" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button type="button" onClick={() => { setSigninMethod(null); setMagicLinkSent(false); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ChevronLeft className="h-3 w-3" /> Back
                      </button>
                      {magicLinkSent ? (
                        <div className="text-center py-6">
                          <Mail className="h-10 w-10 text-primary mx-auto mb-3" />
                          <h3 className="text-base font-semibold text-foreground mb-1">Check your email</h3>
                          <p className="text-sm text-muted-foreground">We sent a sign-in link to <span className="font-mono text-foreground">{magicLinkEmail}</span></p>
                          <Button variant="ghost" size="sm" className="mt-4" onClick={() => setMagicLinkSent(false)}>Send again</Button>
                        </div>
                      ) : (
                        <form onSubmit={handleMagicLink} className="space-y-4">
                          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                            Enter your email to receive a sign-in link.
                          </p>
                          <div className="space-y-2">
                            <Label htmlFor="magic-email">Email</Label>
                            <Input id="magic-email" type="email" value={magicLinkEmail} onChange={(e) => setMagicLinkEmail(e.target.value)} required placeholder="you@example.com" />
                          </div>
                          <Button type="submit" className="w-full gap-2" disabled={loading}>
                            <Mail className="h-4 w-4" />
                            {loading ? "Sending…" : "Send Magic Link"}
                          </Button>
                        </form>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="password-login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button type="button" onClick={() => isMagicLinkRole ? setSigninMethod(null) : setSigninRole(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ChevronLeft className="h-3 w-3" /> Back
                      </button>
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input id="login-email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required placeholder="you@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <PasswordInput id="login-password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required placeholder="••••••••" />
                        </div>
                        <div className="flex justify-end">
                          <button type="button" onClick={handleResetPassword} className="text-xs text-primary hover:underline font-medium">Forgot password?</button>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Signing in…" : "Sign In"}
                        </Button>
                      </form>

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      <Button type="button" variant="outline" className="w-full gap-2 border-border/50 hover:bg-muted" onClick={handleGoogleSignIn} disabled={loading}>
                        <svg className="h-4 w-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                          <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
                        </svg>
                        Google
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Demo Accounts */}
                <Accordion type="single" collapsible className="mt-6">
                  <AccordionItem value="demo-accounts" className="border-border/30">
                    <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-3">
                      <span className="flex items-center gap-2"><Zap className="h-3 w-3" /> Demo Accounts — Try every role</span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {DEMO_ACCOUNTS.map((acc) => (
                          <button key={acc.email} type="button" onClick={() => fillDemoCredentials(acc.email, acc.password)} className="w-full flex items-center justify-between gap-2 rounded-md border border-border/30 px-3 py-2 text-left hover:bg-muted/50 transition-colors group">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                              <Badge variant="secondary" className={`text-[10px] shrink-0 w-fit ${acc.color}`}>{acc.role}</Badge>
                              <span className="text-xs text-muted-foreground truncate font-mono">{acc.email}</span>
                            </div>
                            {copiedEmail === acc.email ? <Check className="h-3 w-3 text-green-500 shrink-0" /> : <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
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

              {/* ─── SIGN UP ─── */}
              <TabsContent value="signup">
                <AnimatePresence mode="wait">
                  {!signupRole ? (
                    <motion.div key="role-select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <p className="text-xs text-muted-foreground mb-3">I want to join as:</p>
                      <div className="space-y-2">
                        {SIGNUP_ROLES.map((r) => (
                          <button
                            key={r.role}
                            type="button"
                            onClick={() => setSignupRole(r.role)}
                            className="w-full flex items-center gap-3 rounded-lg border border-border/50 px-4 py-3 text-left hover:bg-muted/50 hover:border-accent/40 transition-all group"
                          >
                            <r.icon className="h-5 w-5 text-primary shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{r.label}</p>
                              <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-4 text-center">
                        Judges & Tabulators are invited by organisers and sign in via Magic Link.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="signup-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button type="button" onClick={() => setSignupRole(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
                        <ChevronLeft className="h-3 w-3" /> Choose a different role
                      </button>
                      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-md bg-primary/5 border border-primary/20">
                        {(() => { const R = SIGNUP_ROLES.find(r => r.role === signupRole)!; return <><R.icon className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-foreground">{R.label}</span></>; })()}
                      </div>
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name">Full Name</Label>
                          <Input id="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} required placeholder="Jane Doe" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email</Label>
                          <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required placeholder="you@example.com" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-password">Password</Label>
                          <PasswordInput id="signup-password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Creating account…" : "Create Account"}
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
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
