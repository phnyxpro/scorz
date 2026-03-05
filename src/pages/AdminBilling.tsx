import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, ShieldAlert } from "lucide-react";
import BillingPanel from "@/components/admin/BillingPanel";

export default function AdminBilling() {
  const { hasRole, subscription, refreshSubscription } = useAuth();

  if (!hasRole("admin")) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <ShieldAlert className="h-12 w-12" />
        <p className="font-mono text-sm">Access denied. Admin role required.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          Billing & Subscriptions
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage subscription tiers and payment settings</p>
      </div>
      <BillingPanel
        subscription={subscription ? { subscribed: subscription.subscribed, product_id: subscription.productId, price_id: subscription.priceId, subscription_end: subscription.subscriptionEnd } : undefined}
        onRefresh={() => refreshSubscription()}
      />
    </div>
  );
}
