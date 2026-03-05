import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getTierByProductId, type SubscriptionTier } from "@/lib/stripe-tiers";

type AppRole = "admin" | "organizer" | "chief_judge" | "judge" | "tabulator" | "contestant" | "audience";

interface MasqueradeTarget {
  userId: string;
  email: string;
  fullName: string;
}

export interface SubscriptionStatus {
  subscribed: boolean;
  productId?: string;
  priceId?: string;
  subscriptionEnd?: string;
  tier?: SubscriptionTier;
  competitionLimit: number; // -1 = unlimited, 0 = none
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  subscription: SubscriptionStatus;
  refreshSubscription: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  hasRole: (role: AppRole) => boolean;
  masquerade: MasqueradeTarget | null;
  startMasquerade: (target: MasqueradeTarget) => Promise<void>;
  stopMasquerade: () => void;
  isMasquerading: boolean;
}

const DEFAULT_SUB: SubscriptionStatus = { subscribed: false, competitionLimit: 0 };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [masquerade, setMasquerade] = useState<MasqueradeTarget | null>(null);
  const [realRoles, setRealRoles] = useState<AppRole[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionStatus>(DEFAULT_SUB);

  const fetchRoles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) throw error;
      if (data) setRoles(data.map((r: any) => r.role as AppRole));
    } catch (err) {
      console.error("Error fetching roles:", err);
      setRoles([]);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      if (data) {
        const tier = data.product_id ? getTierByProductId(data.product_id) : undefined;
        setSubscription({
          subscribed: data.subscribed,
          productId: data.product_id,
          priceId: data.price_id,
          subscriptionEnd: data.subscription_end,
          tier,
          competitionLimit: tier ? tier.competitionLimit : 0,
        });
      }
    } catch (err) {
      console.error("Error checking subscription:", err);
      setSubscription(DEFAULT_SUB);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchRoles(session.user.id);
        } else if (event === "SIGNED_OUT") {
          setRoles([]);
          setSubscription(DEFAULT_SUB);
        }

        if (event !== "INITIAL_SESSION") {
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    return () => authSub.unsubscribe();
  }, [fetchRoles]);

  // Check subscription after roles are loaded (need auth token)
  useEffect(() => {
    if (session?.user) {
      refreshSubscription();
    }
  }, [session?.user?.id, refreshSubscription]);

  // Periodic refresh every 60s
  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(refreshSubscription, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.id, refreshSubscription]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
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
      signUp, signIn, signOut, resetPassword, signInWithGoogle, hasRole,
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
