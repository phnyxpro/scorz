import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getTierByProductId, type SubscriptionTier } from "@/lib/stripe-tiers";

type AppRole = "admin" | "organizer" | "judge" | "chief_judge" | "tabulator" | "witness" | "contestant" | "audience";

interface MasqueradeTarget {
  userId: string;
  email: string;
  fullName: string;
}

export interface SubscriptionStatus {
  subscribed: boolean;
  productId?: string;
  priceId?: string;
  tier?: SubscriptionTier;
  creditsTotal: number;
  creditsUsed: number;
  creditsAvailable: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  subscription: SubscriptionStatus;
  refreshSubscription: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role?: AppRole) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  hasRole: (role: AppRole) => boolean;
  masquerade: MasqueradeTarget | null;
  startMasquerade: (target: MasqueradeTarget) => Promise<void>;
  stopMasquerade: () => void;
  isMasquerading: boolean;
}

const DEFAULT_SUB: SubscriptionStatus = { subscribed: false, creditsTotal: 0, creditsUsed: 0, creditsAvailable: 0 };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [masquerade, setMasquerade] = useState<MasqueradeTarget | null>(null);
  const [realRoles, setRealRoles] = useState<AppRole[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus>(DEFAULT_SUB);
  const welcomeSent = useRef(false);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      const loadedRoles = data?.map((r: any) => r.role as AppRole) || [];
      setRoles(loadedRoles);
      return loadedRoles;
    } catch (err) {
      console.error("Error fetching roles:", err);
      setRoles([]);
      return [] as AppRole[];
    }
  }, []);

  const fireWelcomeEmail = useCallback(async (currentUser: User, userRoles: AppRole[]) => {
    if (welcomeSent.current || userRoles.length === 0) return;
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("welcome_email_sent")
        .eq("user_id", currentUser.id)
        .single();
      if ((profile as any)?.welcome_email_sent) { welcomeSent.current = true; return; }
      welcomeSent.current = true;
      const userName = currentUser.user_metadata?.full_name || currentUser.email?.split("@")[0] || "there";
      await supabase.functions.invoke("send-welcome-email", {
        body: { user_name: userName, primary_role: userRoles[0] },
      });
    } catch (err) {
      console.error("Welcome email error:", err);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        setSubscription(DEFAULT_SUB);
        return;
      }
      if (data) {
        const tier = data.product_id ? getTierByProductId(data.product_id) : undefined;
        setSubscription({
          subscribed: data.subscribed,
          productId: data.product_id,
          tier,
          creditsTotal: data.credits_total ?? 0,
          creditsUsed: data.credits_used ?? 0,
          creditsAvailable: data.credits_available ?? 0,
        });
      }
    } catch {
      setSubscription(DEFAULT_SUB);
    }
  }, []);

  const assignSignupRole = useCallback(async (currentUser: User) => {
    const signupRole = currentUser.user_metadata?.signup_role;
    if (!signupRole) return;
    const allowedRoles: AppRole[] = ["organizer", "contestant", "audience"];
    if (!allowedRoles.includes(signupRole as AppRole)) return;
    try {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("role", signupRole);
      if (!existing || existing.length === 0) {
        await supabase.from("user_roles").insert({ user_id: currentUser.id, role: signupRole });
      }
      await supabase.auth.updateUser({ data: { signup_role: null } });
    } catch (err) {
      console.error("Error assigning signup role:", err);
    }
  }, []);

  useEffect(() => {
    let initialSessionHandled = false;

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "INITIAL_SESSION") return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchRoles(session.user.id);

          if (event === "SIGNED_IN") {
            // Mark any pending staff invitations as accepted
            supabase.rpc("accept_staff_invitations", { _user_id: session.user.id }).then(() => {});

            assignSignupRole(session.user).then(() =>
              fetchRoles(session.user!.id).then((r) =>
                fireWelcomeEmail(session.user!, r || [])
              )
            );
          }
        } else if (event === "SIGNED_OUT") {
          setRoles([]);
          setSubscription(DEFAULT_SUB);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (initialSessionHandled) return;
      initialSessionHandled = true;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchRoles(session.user.id);
      }

      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [fetchRoles, assignSignupRole, fireWelcomeEmail]);

  useEffect(() => {
    if (session?.user) {
      refreshSubscription();
    }
  }, [session?.user?.id, refreshSubscription]);

  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.id, refreshSubscription]);

  const signUp = async (email: string, password: string, fullName: string, role?: AppRole) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, ...(role ? { signup_role: role } : {}) },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/welcome` },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    setMasquerade(null);
    setRealRoles([]);
    setSubscription(DEFAULT_SUB);
    await supabase.auth.signOut();
    setRoles([]);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    return { error };
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  const startMasquerade = useCallback(async (target: MasqueradeTarget) => {
    setRealRoles(roles);
    setMasquerade(target);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", target.userId);
      if (error) throw error;
      setRoles(data?.map((r: any) => r.role as AppRole) || []);
    } catch {
      setRoles([]);
    }
  }, [roles]);

  const stopMasquerade = useCallback(() => {
    setMasquerade(null);
    setRoles(realRoles);
    setRealRoles([]);
  }, [realRoles]);

  const isMasquerading = masquerade !== null;

  return (
    <AuthContext.Provider value={{
      user, session, loading, roles, subscription, refreshSubscription,
      signUp, signIn, signInWithMagicLink, signOut, resetPassword, signInWithGoogle, hasRole,
      masquerade, startMasquerade, stopMasquerade, isMasquerading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
