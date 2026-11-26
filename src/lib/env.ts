/**
 * Central configuration and integration status.
 * Public values (NEXT_PUBLIC_*) are safe for the browser. Everything else is
 * read only on the server — never import `serverEnv` into client components.
 */

export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  googleAuthEnabled: process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
};

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);

export type IntegrationKey =
  | "supabase"
  | "supabase_service"
  | "openai"
  | "stripe"
  | "stripe_webhook"
  | "firecrawl"
  | "pagespeed"
  | "resend"
  | "google_oauth";

export type IntegrationStatus = {
  key: IntegrationKey;
  name: string;
  configured: boolean;
  envVars: string[];
  purpose: string;
  docsUrl: string;
};

/** Server-only: reports which integrations are configured without revealing values. */
export function getIntegrationStatuses(): IntegrationStatus[] {
  const has = (...k: string[]) => k.every((v) => Boolean(process.env[v]));
  return [
    { key: "supabase", name: "Supabase", configured: isSupabaseConfigured, envVars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"], purpose: "Authentication, database and storage", docsUrl: "https://supabase.com/docs/guides/getting-started" },
    { key: "supabase_service", name: "Supabase service role", configured: has("SUPABASE_SERVICE_ROLE_KEY"), envVars: ["SUPABASE_SERVICE_ROLE_KEY"], purpose: "Server-side credit ledger, uploads, admin and account deletion", docsUrl: "https://supabase.com/docs/guides/api/api-keys" },
    { key: "openai", name: "OpenAI", configured: has("OPENAI_API_KEY"), envVars: ["OPENAI_API_KEY"], purpose: "AI text and image generation", docsUrl: "https://platform.openai.com/api-keys" },
    { key: "stripe", name: "Stripe", configured: has("STRIPE_SECRET_KEY"), envVars: ["STRIPE_SECRET_KEY"], purpose: "Subscriptions and billing", docsUrl: "https://dashboard.stripe.com/apikeys" },
    { key: "stripe_webhook", name: "Stripe webhooks", configured: has("STRIPE_WEBHOOK_SECRET"), envVars: ["STRIPE_WEBHOOK_SECRET"], purpose: "Verified subscription updates", docsUrl: "https://docs.stripe.com/webhooks" },
    { key: "firecrawl", name: "Firecrawl", configured: has("FIRECRAWL_API_KEY"), envVars: ["FIRECRAWL_API_KEY"], purpose: "Multi-page website crawling (built-in single-page fetcher is used otherwise)", docsUrl: "https://www.firecrawl.dev/app/api-keys" },
    { key: "pagespeed", name: "Google PageSpeed Insights", configured: has("PAGESPEED_API_KEY"), envVars: ["PAGESPEED_API_KEY"], purpose: "Verified performance and mobile data for audits", docsUrl: "https://developers.google.com/speed/docs/insights/v5/get-started" },
    { key: "resend", name: "Resend", configured: has("RESEND_API_KEY", "EMAIL_FROM"), envVars: ["RESEND_API_KEY", "EMAIL_FROM", "AGENCY_NOTIFICATION_EMAIL"], purpose: "Transactional email and lead notifications", docsUrl: "https://resend.com/api-keys" },
    { key: "google_oauth", name: "Google sign-in", configured: publicEnv.googleAuthEnabled, envVars: ["NEXT_PUBLIC_GOOGLE_AUTH_ENABLED"], purpose: "Sign in with Google (configured in Supabase Auth providers)", docsUrl: "https://supabase.com/docs/guides/auth/social-login/auth-google" },
  ];
}

export function isIntegrationConfigured(key: IntegrationKey) {
  return getIntegrationStatuses().find((s) => s.key === key)?.configured ?? false;
}
