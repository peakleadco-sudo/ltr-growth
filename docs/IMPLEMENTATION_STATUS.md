# LTR Growth — Implementation status

Last updated: Phase 1 (core platform).

## 1. Completed (Phase 1)

**Public website**
- Landing page with an animated, clearly labelled *illustrative* product preview (fictional business, no fabricated customers, stats or testimonials).
- 9 SEO solution pages (`/solutions/[slug]`), pricing, free audit funnel entry, agency page, privacy and terms templates, sitemap, robots, 404, metadata and Open Graph.
- Consultation form → `consultation_requests` (validated, same-origin checked, rate limited).

**Auth & accounts**
- Supabase email/password sign-up, login, forgot/reset password, email confirmation callback, sign-out; optional Google sign-in (flag).
- Route protection in `src/proxy.ts`; safe `next=` redirects.
- Automatic profile + organization + Free plan bootstrap on sign-up (`handle_new_user`).

**Onboarding**
- Multi-step wizard with draft autosave.
- Website analysis: SSRF-hardened fetcher (DNS-time IP blocking, redirects re-validated, size/time limits), optional Firecrawl, deterministic extraction (title, meta, JSON-LD, socials, colors, logos, contacts).
- Optional AI suggestions, each labelled *stated on site* vs *inferred*; AI never overwrites facts read from the site. Website text is treated as untrusted (prompt-injection guard).

**App**
- Dashboard: transparent readiness score (15 weighted criteria, each shown), credits, plan, onboarding tasks, next steps.
- Sidebar per spec §28. Tools scheduled for later phases show an honest "coming in Phase N" page.
- Tasks, Brand Kit (colors, fonts, voice, logo/asset uploads to private storage with magic-byte validation and SVG sanitisation), Asset library, Business profile, Account settings (profile, password, data export JSON, account deletion request), Subscription page (plans from DB; checkout shows "Stripe not configured"), Help/support requests, Agency page.

**Admin**
- `/admin` gated by server-side `platform_role` check: integration configuration status and table counts.

**Database & security**
- Full schema for all spec tables (4 migrations), RLS on every table, role-aware helpers, cross-tenant reference triggers, protected columns, plan limits.
- Credit ledger (`consume_credits` / `refund_credits` / `grant_purchased_credits`), idempotent by key, service-role only; database rate limiter.
- Security headers, `noindex` on private areas, no credentials in client code.

## 2. Credentials needed

| Need | Variables | Blocks |
|---|---|---|
| **Supabase project** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Everything behind login |
| OpenAI (or compatible) | `OPENAI_API_KEY` | AI suggestions now; all AI tools from Phase 2 |
| Firecrawl (optional) | `FIRECRAWL_API_KEY` | Multi-page crawling (Phase 3) |
| Google PageSpeed | `PAGESPEED_API_KEY` | Verified performance in audits (Phase 3) |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` + products/prices | Paid plans (Phase 4) |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM`, `AGENCY_NOTIFICATION_EMAIL` | Lead emails (Phase 5) |
| Google OAuth (optional) | Configured inside Supabase, then `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` | Google sign-in |
| Brand assets | Logo / favicon files | Replace the placeholder wordmark |

## 3. External configuration

- Supabase: apply migrations, Auth redirect URLs, email confirmation, custom SMTP for production, promote an admin (see README).
- Hosting (e.g. Vercel): set env vars, set `NEXT_PUBLIC_SITE_URL` to the production domain.
- Stripe (Phase 4): products and prices for Starter $29 / Growth $59 / Pro $99, webhook endpoint.
- DNS / email domain verification for Resend (Phase 5).

## 4. Testing

Done in this phase:
- `npm run typecheck`, `npm run lint`, production build.
- 42 unit tests: URL normalisation and SSRF guards, HTML extraction, schemas, upload validation, readiness scoring.
- `npm run test:db`: migrations apply cleanly on Postgres; RLS isolation across tenants, role checks, credit ledger and idempotency, rate limiter.
- Browser checks (desktop + mobile) of every public page and every app page (against a mocked Supabase API): HTTP 200, no console errors, no horizontal overflow.

Still needed (requires a real Supabase project):
- End-to-end sign-up → email confirm → onboarding → dashboard.
- Storage uploads and signed URLs against the real bucket.
- Password reset email flow and Google OAuth.

## 5. Known limitations

- Phase 2–7 tools (LTR AI, Ad/Creative/Social Studio, audits, competitors, strategy, local, email/SMS, copywriter, calculators, campaigns, performance, full admin) are placeholders that say so.
- Billing is not live: plan buttons explain Stripe isn't configured.
- Privacy policy and terms are templates and need legal review before launch.
- Account deletion is a logged request processed by an admin, not instant.
- Logo is a text wordmark until brand assets are supplied.

## 6. Estimated API costs (rough, check current provider pricing)

- Onboarding AI suggestion: ~2–3k tokens per analysis with a small model → well under $0.01. Free, rate limited to 6/hour and 20/day per user.
- Typical Phase 2 text generation (ad set, post batch): ~1.5–4k tokens → roughly $0.001–$0.02 depending on model.
- Image generation (Phase 2–3): typically $0.02–$0.08 per image; to be metered through credits.
- Firecrawl / PageSpeed: per their plans; PageSpeed API is free within quota.
- Supabase free tier is enough for development; Pro (~$25/month) recommended for production.

## 7. Launch requirements

1. Supabase production project with migrations applied, SMTP configured, backups on.
2. Production domain + `NEXT_PUBLIC_SITE_URL`; Auth redirect URLs updated.
3. Stripe live mode with webhooks (Phase 4) before charging.
4. Legal review of privacy policy and terms.
5. Real brand assets.
6. Monitoring of `api_error_logs` and the admin portal.
7. Complete Phases 2–7, testing each phase before the next.
