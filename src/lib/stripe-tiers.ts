export interface SubscriptionTier {
  name: string;
  priceId: string;
  productId: string;
  price: number; // in dollars
  description: string;
  features: string[];
  competitionLimit: number;
  highlight?: boolean;
}

export const TIERS: SubscriptionTier[] = [
  {
    name: "Start Scorz",
    priceId: "price_1T6khJERVeYk2KQ9N50SK1w7",
    productId: "prod_U4uWictdhk1hdd",
    price: 15,
    description: "Create up to 5 competitions per month with all features",
    competitionLimit: 5,
    features: [
      "Up to 5 competitions/month",
      "Unlimited contestants",
      "Full rubric builder",
      "Digital scoring",
      "Basic analytics",
    ],
  },
  {
    name: "Pro Scorz",
    priceId: "price_1T6kiuERVeYk2KQ98LF9v8Hf",
    productId: "prod_U4uYMqrEeuSamF",
    price: 49,
    description: "Create up to 20 competitions per month with advanced analytics, custom branding, and priority support",
    competitionLimit: 20,
    highlight: true,
    features: [
      "Up to 20 competitions/month",
      "Advanced analytics",
      "Custom branding",
      "Priority support",
      "Audience voting",
      "Ticketing system",
    ],
  },
  {
    name: "Enterprise Scorz",
    priceId: "price_1T6kjCERVeYk2KQ9PSPBv7AE",
    productId: "prod_U4uY3GNUMjd54Q",
    price: 149,
    description: "Unlimited competitions, white-label branding, API access, dedicated support, and custom integrations",
    competitionLimit: -1, // unlimited
    features: [
      "Unlimited competitions",
      "White-label branding",
      "API access",
      "Dedicated support",
      "Custom integrations",
      "All Pro features",
    ],
  },
];

export function getTierByProductId(productId: string): SubscriptionTier | undefined {
  return TIERS.find((t) => t.productId === productId);
}

export function getTierByPriceId(priceId: string): SubscriptionTier | undefined {
  return TIERS.find((t) => t.priceId === priceId);
}
