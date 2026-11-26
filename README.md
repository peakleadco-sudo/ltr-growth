# LTR Growth

**Your entire marketing department. Powered by AI.** — an all-in-one AI marketing platform by LTRMarketing.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Auth, Postgres, Storage, RLS) · OpenAI-compatible AI · Stripe · Resend.

See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) for what's built, what needs credentials, and known limitations.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase values at minimum
npm run dev                  # http://localhost:3000
```

Without Supabase variables the public website works, and the login/sign-up pages explain what to configure.

## 1. Supabase setup (required)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. **Project Settings → API**: copy the Project URL, `anon` key and `service_role` key into `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. The service role key is server-only — never prefix it with `NEXT_PUBLIC_`.
3. Apply the migrations in `supabase/migrations` in order. Either:
   - Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`, or
   - paste each file into the SQL editor in filename order.
4. **Storage**: migration 3 creates the private `brand-assets` bucket automatically. If it reports that storage wasn't available, create a **private** bucket named `brand-assets` in the dashboard. All file access goes through the server with short-lived signed URLs.
5. **Authentication → URL Configuration**: set Site URL to your domain and add `https://<your-domain>/auth/callback` (and `http://localhost:3000/auth/callback`) to Redirect URLs.
6. **Authentication → Providers → Email**: keep "Confirm email" on. Configure custom SMTP for production sending.
7. (Optional) **Google sign-in**: enable the Google provider with your Google OAuth client, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
8. **Make yourself an admin** (SQL editor): `update public.profiles set platform_role = 'admin' where email = 'you@example.com';`

Development seed data (`supabase/seed.sql`) creates a clearly labelled demo account. Never run it in production.

## 2. AI provider

Set `OPENAI_API_KEY` (any OpenAI-compatible endpoint works via `OPENAI_BASE_URL`). The model, output-token cap and pricing used for cost estimates live in the `ai_settings` table; per-tool prompt, model and credit-cost overrides go in `prompt_templates`. `OPENAI_TEXT_MODEL` overrides the database model if set. The service role key is also required, because usage is recorded server-side. All AI calls are server-side; website content is passed as untrusted data with prompt-injection guardrails. Without a key, onboarding still extracts facts stated directly on the user's website, and AI features show a "not configured" state.

## 3. Other integrations

| Service | Variables | Used for | Phase |
|---|---|---|---|
| Firecrawl | `FIRECRAWL_API_KEY` | Multi-page crawling (built-in fetcher otherwise) | 1, 3 |
| PageSpeed Insights | `PAGESPEED_API_KEY` | Verified performance data | 3 |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Subscriptions & credits | 4 |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM`, `AGENCY_NOTIFICATION_EMAIL` | Lead notifications | 5 |

Admins can see which integrations are configured at `/admin`.

## Testing

```bash
npm run typecheck
npm run lint
npm test                 # unit tests (SSRF guards, extraction, schemas, uploads, readiness, AI engine and tools)
npm run test:db          # migrations + RLS + credit ledger tests against a local Postgres
                         # (set PGHOST/PGPORT/PGUSER; needs a superuser on a throwaway server)
```

## Architecture

- `src/app/(marketing)` public, statically rendered SEO pages · `src/app/(auth)` auth · `src/app/app` the authenticated app · `src/app/admin` admin portal (server-side role check) · `src/app/api` route handlers.
- `src/lib/workspace.ts` loads the signed-in user's workspace through RLS. `src/lib/supabase/admin.ts` is the only service-role client and is used only after server-side authorization.
- `src/lib/ai/*` provider-agnostic AI layer: `engine.ts` (credits, validation, refunds), `tools/*` (one definition per tool: input schema, output schema, prompts, credit cost), `assistant.ts` (LTR AI). `src/app/api/ai/[tool]` and `src/app/api/assistant` are the only AI endpoints. `src/lib/services/website/*` SSRF-hardened fetching and HTML extraction.
- `supabase/migrations` schema, RLS policies, credit ledger functions (`consume_credits`, `refund_credits`, idempotent by key), rate limiting and default plan configuration.
