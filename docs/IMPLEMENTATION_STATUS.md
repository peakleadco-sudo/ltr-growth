# LTR Growth — Implementation status

Last updated: Phase 2 (core AI tools).

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

## 1b. Completed (Phase 2: core AI tools)

**Shared AI pipeline** (`src/lib/ai/engine.ts`) — every tool follows spec §25:
sign-in → plan entitlement → rate limit → idempotent credit reservation (`consume_credits`, keyed by a client request id so double submits never double charge) → saved business profile + brand kit context → tool prompt → provider call with strict JSON schema → schema validation → saved to `ai_generations` with tokens and estimated cost → automatic refund (`refund_credits`) and error log on any failure.
- Model, output-token cap and pricing come from `ai_settings`; admins can override a tool's system prompt, model and credit cost with `prompt_templates` (no redeploy).
- User inputs, profile data, website text, documents and chat history are wrapped as untrusted data; outputs never state facts the user didn't provide (assumptions are listed separately in every result).

**Tools**
- **LTR AI** (`/app/assistant`): conversations with history, business-specific starters, follow-up suggestions, document attachments (.txt/.md/.csv/.json), saved responses, Markdown export, "based on your profile" vs "assumptions" for every answer. Also reachable from the top bar everywhere. 1 credit per answer.
- **Ad Studio** (`/app/ads`): 6 platforms; copy, headlines/descriptions with platform character limits, hooks, video/UGC/voiceover scripts, creative concepts, audiences, campaign structure, A/B tests, landing page and budget guidance. Regenerate any section, inline editing, save/reopen campaigns, creative brief export. 2 credits.
- **Social Media Studio** (`/app/social`): posts for 6 platforms and 11 content types, or 7/14/30-day plans; editable post previews, CSV export, save as drafts with dates, saved-post library with draft/approved/scheduled/published status that the user sets (never claims to publish). 1–4 credits.
- **Marketing Strategy** (`/app/strategy`): 30/60/90-day or custom; positioning, personas, channels, budget split (flags totals ≠ 100%), channel strategies, KPIs, testing roadmap and weekly tasks that become dashboard tasks with due dates; edit, archive, print/PDF, progress tracking. 3–4 credits.
- **Website Copywriter** (`/app/copywriter`): 11 page types, 1 or 2 side-by-side versions, SEO title/meta preview with limits, copy as Markdown or HTML, save/reopen. 1–2 credits.
- **Email & SMS** (`/app/email`): 11 campaign types, sequences up to 7 messages, subject lines, preview text, A/B variations, compliance checklist and consent reminder; nothing is sent. 1–2 credits.
- **AI History** (`/app/history`): every generation with tool, credits and status, filters, star to save, reopen results; per-tool credit usage for the period. Subscription page shows charges and refunds. Admin shows 30-day AI usage, tokens, estimated cost and recent API errors.
- Contextual, non-intrusive LTRMarketing CTAs on ads, strategy and copy results pre-fill the consultation form.

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
- 61 unit tests: URL normalisation and SSRF guards, HTML extraction, schemas, upload validation, readiness scoring, AI output schemas (strict-mode rules), input validation, prompt-injection wrapping, the generation engine (charge, refund on failure/invalid output, insufficient credits, duplicate requests, plan gating), strategy→task dates, CSV/Markdown export.
- `npm run test:db`: migrations apply cleanly on Postgres; RLS isolation across tenants, role checks, credit ledger and idempotency, rate limiter, cross-tenant links to generations blocked, assistant messages can't be forged or edited by users.
- Phase 2 browser walkthrough against a mocked Supabase + mocked OpenAI-compatible API: every tool generated, regenerated a section, saved and reopened; assistant chat and saving; history, subscription, dashboard and admin; no console errors; no horizontal overflow at 390px.
- Browser checks (desktop + mobile) of every public page and every app page (against a mocked Supabase API): HTTP 200, no console errors, no horizontal overflow.

Still needed (requires a real Supabase project):
- End-to-end sign-up → email confirm → onboarding → dashboard.
- Storage uploads and signed URLs against the real bucket.
- Password reset email flow and Google OAuth.

## 5. Known limitations

- Phase 3–7 tools (Creative Studio, audits, SEO tools, competitors, local, calculators, campaigns, content calendar drag-and-drop, performance, full admin) are placeholders that say so.
- LTR AI accepts text documents only (.txt/.md/.csv/.json); PDF/Word parsing is not implemented yet. Answers arrive in one piece (no streaming).
- Strategy PDF export uses the browser's print-to-PDF; branded server-side PDFs are planned for Phase 3.
- Real AI output quality has not been reviewed yet because no OpenAI key is configured; prompts may need tuning once real responses can be checked.
- Billing is not live: plan buttons explain Stripe isn't configured.
- Privacy policy and terms are templates and need legal review before launch.
- Account deletion is a logged request processed by an admin, not instant.
- Logo is a text wordmark until brand assets are supplied.

## 6. Estimated API costs (rough, check current provider pricing)

- Onboarding AI suggestion: ~2–3k tokens per analysis with a small model → well under $0.01. Free, rate limited to 6/hour and 20/day per user.
- Phase 2 generations with the default `gpt-4.1-mini` pricing in `ai_settings` ($0.40 in / $1.60 out per 1M tokens): LTR AI answer ~3k in / 0.8k out ≈ $0.002; ad package ~2k / 3.5k ≈ $0.006; 30-day social plan ~2k / 12k ≈ $0.02; 90-day strategy ~2k / 10k ≈ $0.017. A Growth user spending all 500 credits costs roughly $1–4/month in AI. Actual costs per tool are shown on `/admin`.
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
