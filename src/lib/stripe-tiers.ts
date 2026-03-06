export interface SubscriptionTier {
  name: string;
  priceId: string;
  productId: string;
  price: number; // in USD
  description: string;
  features: string[];
  highlight?: boolean;
}

export const USD_DISCLAIMER = "All prices quoted in US Dollars (USD)";

// Static approximation table for major currencies (rates vs USD)
const CURRENCY_APPROX: Record<string, { symbol: string; rate: number; code: string }> = {
  "en-GB": { symbol: "£", rate: 0.79, code: "GBP" },
  "en-ZA": { symbol: "R", rate: 18.2, code: "ZAR" },
  "de-DE": { symbol: "€", rate: 0.92, code: "EUR" },
  "fr-FR": { symbol: "€", rate: 0.92, code: "EUR" },
  "es-ES": { symbol: "€", rate: 0.92, code: "EUR" },
  "it-IT": { symbol: "€", rate: 0.92, code: "EUR" },
  "pt-BR": { symbol: "R$", rate: 5.0, code: "BRL" },
  "ja-JP": { symbol: "¥", rate: 149, code: "JPY" },
  "en-AU": { symbol: "A$", rate: 1.53, code: "AUD" },
  "en-CA": { symbol: "C$", rate: 1.36, code: "CAD" },
  "en-IN": { symbol: "₹", rate: 83.5, code: "INR" },
  "zh-CN": { symbol: "¥", rate: 7.24, code: "CNY" },
  "ko-KR": { symbol: "₩", rate: 1320, code: "KRW" },
  "en-NG": { symbol: "₦", rate: 1550, code: "NGN" },
  "en-KE": { symbol: "KSh", rate: 153, code: "KES" },
  "en-GH": { symbol: "GH₵", rate: 15.5, code: "GHS" },
};

export function getLocalCurrencyApprox(usdAmount: number): string | null {
  const locale = navigator.language;
  // Don't show for US users
  if (locale.startsWith("en-US") || locale === "en") return null;

  const match = CURRENCY_APPROX[locale];
  if (!match) {
    // Try language-region fallback
    const langOnly = locale.split("-")[0];
    const fallback = Object.entries(CURRENCY_APPROX).find(([k]) => k.startsWith(langOnly));
    if (!fallback) return null;
    const [, info] = fallback;
    const approx = Math.round(usdAmount * info.rate);
    return `~${info.symbol}${approx.toLocaleString()}`;
  }

  const approx = Math.round(usdAmount * match.rate);
  return `~${match.symbol}${approx.toLocaleString()}`;
}

export const TIERS: SubscriptionTier[] = [
  {
    name: "Start Scorz",
    priceId: "price_1T7t57ERVeYk2KQ9qbilZ1NA",
    productId: "prod_U65F5A4sKTnuVF",
    price: 15,
    description: "One competition with all core features—perfect for small events",
    features: [
      "Unlimited contestants",
      "Full rubric builder",
      "Digital scoring",
      "Basic analytics",
    ],
  },
  {
    name: "Pro Scorz",
    priceId: "price_1T7t5VERVeYk2KQ9Ul4CAyq7",
    productId: "prod_U65GjQ5kHCWQRe",
    price: 49,
    description: "One competition with advanced features for serious organizers",
    highlight: true,
    features: [
      "Everything in Start",
      "Advanced analytics",
      "Custom branding",
      "Priority support",
      "Audience voting",
      "Ticketing system",
    ],
  },
  {
    name: "Enterprise Scorz",
    priceId: "price_1T7t5kERVeYk2KQ96rEqSzcF",
    productId: "prod_U65G1kKSbu9uDM",
    price: 149,
    description: "One premium competition with white-label branding, API access, and dedicated support",
    features: [
      "Everything in Pro",
      "White-label branding",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export function getTierByProductId(productId: string): SubscriptionTier | undefined {
  return TIERS.find((t) => t.productId === productId);
}

export function getTierByPriceId(priceId: string): SubscriptionTier | undefined {
  return TIERS.find((t) => t.priceId === priceId);
}
