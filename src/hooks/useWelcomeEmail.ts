import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Fires a welcome email exactly once per user (checks profiles.welcome_email_sent).
 * Should be called from AuthContext after roles are loaded.
 */
export function useWelcomeEmail() {
  const { user, roles } = useAuth();
  const sent = useRef(false);

  useEffect(() => {
    if (!user || roles.length === 0 || sent.current) return;

    const fire = async () => {
      try {
        // Check if already sent
        const { data: profile } = await supabase
          .from("profiles")
          .select("welcome_email_sent")
          .eq("user_id", user.id)
          .single();

        if ((profile as any)?.welcome_email_sent) {
          sent.current = true;
          return;
        }

        sent.current = true;

        const primaryRole = roles[0]; // first role is primary
        const userName =
          user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

        await supabase.functions.invoke("send-welcome-email", {
          body: { user_name: userName, primary_role: primaryRole },
        });
      } catch (err) {
        console.error("Welcome email error:", err);
      }
    };

    fire();
  }, [user, roles]);
}
