import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TIERS, USD_DISCLAIMER, getLocalCurrencyApprox, type SubscriptionTier } from "@/lib/stripe-tiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Crown, Check, Loader2, Ticket, Users } from "lucide-react";

interface BillingPanelProps {
  subscription?: {
    subscribed: boolean;
    product_id?: string;
    credits_total?: number;
    credits_used?: number;
    credits_available?: number;
  } | null;
  onRefresh: () => void;
}

export default function BillingPanel({ subscription, onRefresh }: BillingPanelProps) {
  const { session } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleCheckout = async (tier: SubscriptionTier) => {
    if (!session) {
      toast.error("You must be logged in");
      return;
    }
    setCheckoutLoading(tier.priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: tier.priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create checkout session");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    if (!session) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const creditsAvailable = subscription?.credits_available ?? 0;
  const creditsTotal = subscription?.credits_total ?? 0;
  const creditsUsed = subscription?.credits_used ?? 0;

  return (
    <div className="space-y-6">
      {/* Credits Summary */}
      {creditsTotal > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {creditsAvailable} competition credit{creditsAvailable !== 1 ? "s" : ""} available
                </p>
                <p className="text-xs text-muted-foreground">
                  {creditsUsed} used of {creditsTotal} purchased
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5 mr-1" />}
              Payment History
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tier Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const localApprox = getLocalCurrencyApprox(tier.price);
          return (
            <Card
              key={tier.priceId}
              className={`relative border-border/50 bg-card/80 ${
                tier.highlight ? "ring-2 ring-accent/50" : ""
              }`}
            >
              {tier.highlight && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[10px]">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-sm font-mono">{tier.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold text-foreground">${tier.price}</span>
                  <span className="text-xs text-muted-foreground">/competition</span>
                </div>
                {localApprox && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{localApprox} approx.</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{tier.description}</p>
                {/* Staff limits summary */}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1.5">
                  <Users className="h-3 w-3 shrink-0" />
                  <span>{tier.limits.organizers} org · {tier.limits.judges} judges · {tier.limits.tabulators} tab</span>
                </div>
                <ul className="space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                      <Check className="h-3 w-3 text-secondary shrink-0" />
                      <span className={f.includes("coming soon") ? "text-muted-foreground italic" : ""}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="w-full"
                  variant={tier.highlight ? "default" : "outline"}
                  disabled={!!checkoutLoading}
                  onClick={() => handleCheckout(tier)}
                >
                  {checkoutLoading === tier.priceId ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <CreditCard className="h-3.5 w-3.5 mr-1" />
                  )}
                  Buy Competition Credit
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* USD Disclaimer */}
      <p className="text-center text-[10px] text-muted-foreground font-mono">
        {USD_DISCLAIMER}
      </p>
      <p className="text-center text-xs text-muted-foreground max-w-lg mx-auto">
        Mix and match plans as needed—each credit unlocks one competition at its tier's limits. Buy a Start credit for small events and a Pro credit for larger ones.
      </p>

      {/* Refresh */}
      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs text-muted-foreground">
          Refresh credit status
        </Button>
      </div>
    </div>
  );
}
