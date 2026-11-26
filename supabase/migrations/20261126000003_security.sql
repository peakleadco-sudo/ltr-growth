-- LTR Growth: row-level security, credit ledger functions, rate limiting,
-- default plan configuration and storage buckets.

-- ---------------------------------------------------------------------------
-- Purchased credits wallet (does not expire with the monthly period)
-- ---------------------------------------------------------------------------
create table public.credit_wallets (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  text_balance integer not null default 0 check (text_balance >= 0),
  image_balance integer not null default 0 check (image_balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.credit_transactions add column detail jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Cross-tenant consistency: a row may only reference a business profile,
-- conversation or campaign that belongs to the same organization.
-- ---------------------------------------------------------------------------
create or replace function public.check_tenant_refs()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb := to_jsonb(new);
  ref_org uuid;
begin
  if j ? 'business_profile_id' and (j ->> 'business_profile_id') is not null then
    select organization_id into ref_org from public.business_profiles where id = (j ->> 'business_profile_id')::uuid;
    if ref_org is distinct from (j ->> 'organization_id')::uuid then
      raise exception 'TENANT_MISMATCH: business profile belongs to another organization';
    end if;
  end if;
  if j ? 'conversation_id' and (j ->> 'conversation_id') is not null then
    select organization_id into ref_org from public.ai_conversations where id = (j ->> 'conversation_id')::uuid;
    if ref_org is distinct from (j ->> 'organization_id')::uuid then
      raise exception 'TENANT_MISMATCH: conversation belongs to another organization';
    end if;
  end if;
  if j ? 'campaign_id' and (j ->> 'campaign_id') is not null then
    select organization_id into ref_org from public.marketing_campaigns where id = (j ->> 'campaign_id')::uuid;
    if ref_org is distinct from (j ->> 'organization_id')::uuid then
      raise exception 'TENANT_MISMATCH: campaign belongs to another organization';
    end if;
  end if;
  if j ? 'audit_id' and (j ->> 'audit_id') is not null then
    select organization_id into ref_org from public.website_audits where id = (j ->> 'audit_id')::uuid;
    if ref_org is distinct from (j ->> 'organization_id')::uuid then
      raise exception 'TENANT_MISMATCH: audit belongs to another organization';
    end if;
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'brand_kits', 'brand_assets', 'ai_generations', 'ai_conversations', 'ai_messages',
    'generated_ads', 'generated_images', 'audit_findings', 'competitors', 'competitor_reports',
    'marketing_strategies', 'marketing_tasks', 'content_calendars', 'social_content',
    'email_campaigns', 'campaign_assets', 'imported_data', 'performance_metrics'
  ] loop
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.check_tenant_refs()',
      t || '_tenant_refs', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Profiles
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_platform_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Organizations
create policy orgs_select_member on public.organizations for select to authenticated
  using (public.is_org_member(id) or public.is_platform_admin());
create policy orgs_update_admin on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));

create policy members_select on public.organization_members for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- Plans & entitlements: public catalogue
create policy plans_public_read on public.plans for select to anon, authenticated
  using (is_active or public.is_platform_admin());
create policy entitlements_public_read on public.subscription_entitlements for select to anon, authenticated
  using (true);

-- Billing & usage: members can read, only the server writes
create policy subscriptions_select on public.subscriptions for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy usage_select on public.usage_credits for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy credit_tx_select on public.credit_transactions for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy wallets_select on public.credit_wallets for select to authenticated
  using (public.is_org_member(organization_id) or public.is_platform_admin());

-- Tenant tables members can fully manage
do $$
declare t text;
begin
  foreach t in array array[
    'business_profiles', 'brand_kits', 'marketing_tasks', 'social_content', 'content_calendars',
    'email_campaigns', 'marketing_campaigns', 'campaign_assets', 'competitors',
    'generated_ads', 'marketing_strategies', 'ai_conversations', 'ai_messages', 'performance_metrics', 'imported_data'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_org_member(organization_id))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_org_member(organization_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.is_org_member(organization_id))', t || '_delete', t);
  end loop;
end $$;

-- Tenant tables members can read; rows are produced by server-side workflows
-- (uploads are validated server-side, AI output is recorded server-side).
do $$
declare t text;
begin
  foreach t in array array[
    'brand_assets', 'ai_generations', 'generated_images', 'website_audits', 'audit_findings', 'competitor_reports'
  ] loop
    execute format('create policy %I on public.%I for select to authenticated using (organization_id is not null and public.is_org_member(organization_id))', t || '_select', t);
  end loop;
end $$;
-- Saving / unsaving a generation is a harmless user-level action.
create policy ai_generations_update_saved on public.ai_generations for update to authenticated
  using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create or replace function public.protect_generation_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    -- Users may only toggle is_saved; everything else is server-owned.
    new := jsonb_populate_record(old, jsonb_build_object('is_saved', new.is_saved));
  end if;
  return new;
end $$;
create trigger ai_generations_protect before update on public.ai_generations
  for each row execute function public.protect_generation_columns();

-- Notifications: per user
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- Consultation & support requests: users see their own, admins see all.
create policy consultations_select on public.consultation_requests for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());
create policy support_select on public.support_requests for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());
create policy support_insert on public.support_requests for insert to authenticated
  with check (user_id = auth.uid() and (organization_id is null or public.is_org_member(organization_id)));

-- Public site content
create policy site_content_public on public.site_content for select to anon, authenticated
  using (is_published or public.is_platform_admin());

-- Admin-only reads (writes happen server-side after a role check)
create policy agency_leads_admin on public.agency_leads for select to authenticated using (public.is_platform_admin());
create policy lead_activity_admin on public.lead_activity for select to authenticated using (public.is_platform_admin());
create policy admin_logs_admin on public.admin_activity_logs for select to authenticated using (public.is_platform_admin());
create policy api_errors_admin on public.api_error_logs for select to authenticated using (public.is_platform_admin());
create policy prompt_templates_admin on public.prompt_templates for select to authenticated using (public.is_platform_admin());
create policy ai_settings_admin on public.ai_settings for select to authenticated using (public.is_platform_admin());
-- rate_limits and stripe_events: no client policies at all.

-- ---------------------------------------------------------------------------
-- Credit ledger (server only)
-- ---------------------------------------------------------------------------
create or replace function public.consume_credits(
  p_org uuid, p_type text, p_amount integer, p_key text,
  p_user uuid default null, p_reference uuid default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  existing public.credit_transactions;
  period public.usage_credits;
  wallet public.credit_wallets;
  period_available integer;
  wallet_available integer := 0;
  from_period integer;
  from_wallet integer;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if p_type not in ('text', 'image', 'audit') then
    raise exception 'INVALID_CREDIT_TYPE';
  end if;

  -- Idempotency: the same key never charges twice.
  select * into existing from public.credit_transactions where idempotency_key = p_key;
  if existing.id is not null then
    return jsonb_build_object('ok', true, 'duplicate', true, 'transaction_id', existing.id);
  end if;

  perform public.ensure_usage_period(p_org);
  select * into period from public.usage_credits
  where organization_id = p_org and period_start <= now() and period_end > now()
  order by period_start desc limit 1
  for update;

  if p_type = 'text' then
    period_available := period.text_credits_granted + period.bonus_text_credits - period.text_credits_used;
  elsif p_type = 'image' then
    period_available := period.image_credits_granted + period.bonus_image_credits - period.image_credits_used;
  else
    period_available := period.audits_granted - period.audits_used;
  end if;
  period_available := greatest(period_available, 0);

  if p_type in ('text', 'image') then
    insert into public.credit_wallets (organization_id) values (p_org) on conflict do nothing;
    select * into wallet from public.credit_wallets where organization_id = p_org for update;
    wallet_available := case when p_type = 'text' then wallet.text_balance else wallet.image_balance end;
  end if;

  if period_available + wallet_available < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  from_period := least(period_available, p_amount);
  from_wallet := p_amount - from_period;

  if p_type = 'text' then
    update public.usage_credits set text_credits_used = text_credits_used + from_period where id = period.id;
    update public.credit_wallets set text_balance = text_balance - from_wallet, updated_at = now() where organization_id = p_org;
  elsif p_type = 'image' then
    update public.usage_credits set image_credits_used = image_credits_used + from_period where id = period.id;
    update public.credit_wallets set image_balance = image_balance - from_wallet, updated_at = now() where organization_id = p_org;
  else
    update public.usage_credits set audits_used = audits_used + from_period where id = period.id;
  end if;

  insert into public.credit_transactions (organization_id, user_id, credit_type, amount, reason, reference_id, idempotency_key, detail)
  values (p_org, p_user, p_type, -p_amount, 'generation', p_reference, p_key,
          jsonb_build_object('period_id', period.id, 'from_period', from_period, 'from_wallet', from_wallet))
  returning id into existing.id;

  return jsonb_build_object('ok', true, 'duplicate', false, 'transaction_id', existing.id);
end $$;

-- Refund a previous charge (e.g. provider failure after reservation). Idempotent.
create or replace function public.refund_credits(p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  tx public.credit_transactions;
  fp integer;
  fw integer;
begin
  select * into tx from public.credit_transactions where idempotency_key = p_key and amount < 0;
  if tx.id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if exists (select 1 from public.credit_transactions where idempotency_key = p_key || ':refund') then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  fp := coalesce((tx.detail ->> 'from_period')::integer, 0);
  fw := coalesce((tx.detail ->> 'from_wallet')::integer, 0);

  if tx.credit_type = 'text' then
    update public.usage_credits set text_credits_used = greatest(text_credits_used - fp, 0) where id = (tx.detail ->> 'period_id')::uuid;
    update public.credit_wallets set text_balance = text_balance + fw where organization_id = tx.organization_id;
  elsif tx.credit_type = 'image' then
    update public.usage_credits set image_credits_used = greatest(image_credits_used - fp, 0) where id = (tx.detail ->> 'period_id')::uuid;
    update public.credit_wallets set image_balance = image_balance + fw where organization_id = tx.organization_id;
  else
    update public.usage_credits set audits_used = greatest(audits_used - fp, 0) where id = (tx.detail ->> 'period_id')::uuid;
  end if;

  insert into public.credit_transactions (organization_id, user_id, credit_type, amount, reason, reference_id, idempotency_key, detail)
  values (tx.organization_id, tx.user_id, tx.credit_type, -tx.amount, 'refund', tx.reference_id, p_key || ':refund', tx.detail);
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- Add purchased credits to the wallet (called from verified Stripe webhooks). Idempotent.
create or replace function public.grant_purchased_credits(p_org uuid, p_type text, p_amount integer, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 or p_type not in ('text', 'image') then
    raise exception 'INVALID_GRANT';
  end if;
  if exists (select 1 from public.credit_transactions where idempotency_key = p_key) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  insert into public.credit_wallets (organization_id) values (p_org) on conflict do nothing;
  if p_type = 'text' then
    update public.credit_wallets set text_balance = text_balance + p_amount, updated_at = now() where organization_id = p_org;
  else
    update public.credit_wallets set image_balance = image_balance + p_amount, updated_at = now() where organization_id = p_org;
  end if;
  insert into public.credit_transactions (organization_id, credit_type, amount, reason, idempotency_key)
  values (p_org, p_type, p_amount, 'purchase', p_key);
  return jsonb_build_object('ok', true, 'duplicate', false);
end $$;

-- Fixed-window rate limiter (server only). Returns true when the call is allowed.
create or replace function public.check_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits (bucket, window_start, count) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;
  -- opportunistic cleanup of old windows
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return c <= p_limit;
end $$;

-- Lock down server-only functions.
revoke execute on function public.consume_credits(uuid, text, integer, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.refund_credits(text) from public, anon, authenticated;
revoke execute on function public.grant_purchased_credits(uuid, text, integer, text) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.ensure_usage_period(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.consume_credits(uuid, text, integer, text, uuid, uuid) to service_role;
grant execute on function public.refund_credits(text) to service_role;
grant execute on function public.grant_purchased_credits(uuid, text, integer, text) to service_role;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.ensure_usage_period(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Default plan configuration (editable from the admin dashboard)
-- ---------------------------------------------------------------------------
insert into public.plans (id, name, description, price_cents, max_business_profiles,
  monthly_text_credits, monthly_image_credits, monthly_audits, marketing_bullets, sort_order) values
('free', 'Free', 'Explore LTR Growth and get a baseline for your marketing.', 0, 1, 5, 0, 1,
  array['One business profile', 'One limited website audit per month', 'Basic marketing readiness report',
        'Five AI text generations per month', 'Basic marketing calculators', 'Limited access to LTR AI'], 0),
('starter', 'Starter', 'Core AI marketing tools for a single business.', 2900, 1, 150, 0, 1,
  array['One business profile', 'AI advertising copy generator', 'Social media content generator',
        'Marketing strategy generator', 'Email marketing generator', 'Website copywriter', 'Brand kit',
        'Monthly website audit', '150 AI text generation credits per month'], 1),
('growth', 'Growth', 'Advanced audits, competitor intelligence and campaign management.', 5900, 3, 500, 30, 5,
  array['Everything in Starter', 'Up to three business profiles', 'Advanced website and SEO audits',
        'Competitor intelligence', 'Local business marketing tools', 'AI image generation', 'Campaign management',
        'Marketing performance dashboard', 'Branded PDF reports', '500 AI text generation credits per month',
        '30 standard image generation credits per month'], 2),
('pro', 'Pro', 'For multi-brand operators who need more capacity and reporting.', 9900, 5, 1000, 60, 15,
  array['Everything in Growth', 'Up to five business profiles', 'Advanced competitor reports',
        'Additional reporting capabilities', 'Priority support', '1,000 AI text generation credits per month',
        '60 standard image generation credits per month'], 3);

insert into public.subscription_entitlements (plan_id, feature_key)
select p.id, f.key from public.plans p
cross join lateral (
  select unnest(case p.id
    when 'free' then array['assistant', 'calculators', 'website_audit', 'readiness_report', 'brand_kit_basic']
    when 'starter' then array['assistant', 'calculators', 'website_audit', 'readiness_report', 'brand_kit_basic',
      'brand_kit', 'ad_studio', 'social_studio', 'strategy', 'email_sms', 'website_copy', 'content_calendar']
    when 'growth' then array['assistant', 'calculators', 'website_audit', 'readiness_report', 'brand_kit_basic',
      'brand_kit', 'ad_studio', 'social_studio', 'strategy', 'email_sms', 'website_copy', 'content_calendar',
      'advanced_audit', 'competitor_intel', 'local_marketing', 'image_generation', 'campaigns', 'performance', 'pdf_reports']
    when 'pro' then array['assistant', 'calculators', 'website_audit', 'readiness_report', 'brand_kit_basic',
      'brand_kit', 'ad_studio', 'social_studio', 'strategy', 'email_sms', 'website_copy', 'content_calendar',
      'advanced_audit', 'competitor_intel', 'local_marketing', 'image_generation', 'campaigns', 'performance', 'pdf_reports',
      'advanced_competitor', 'advanced_reporting', 'priority_support']
  end) as key
) f;

insert into public.ai_settings (key, value) values
  ('text_provider', '"openai"'),
  ('default_text_model', '"gpt-4.1-mini"'),
  ('image_provider', '"openai"'),
  ('default_image_model', '"gpt-image-1"'),
  -- Configurable provider pricing used for cost estimates (USD). Update to match your contract.
  ('pricing', '{"text_input_per_1m": 0.40, "text_output_per_1m": 1.60, "image_standard_each": 0.04}'),
  ('max_output_tokens', '4000');

-- ---------------------------------------------------------------------------
-- Storage: private bucket for business assets. All access goes through the
-- server, which validates files and issues short-lived signed URLs.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('brand-assets', 'brand-assets', false, 26214400,
            array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain', 'text/csv'])
    on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Defense in depth: table privileges for server-owned data.
-- RLS already blocks these writes; revoking privileges makes the intent explicit.
-- ---------------------------------------------------------------------------
revoke all on public.rate_limits, public.stripe_events from anon, authenticated;
revoke insert, update, delete on
  public.plans, public.subscription_entitlements, public.subscriptions, public.usage_credits,
  public.credit_transactions, public.credit_wallets, public.agency_leads, public.lead_activity,
  public.admin_activity_logs, public.api_error_logs, public.prompt_templates, public.ai_settings,
  public.consultation_requests, public.site_content, public.organization_members,
  public.website_audits, public.audit_findings, public.competitor_reports, public.generated_images,
  public.brand_assets
from anon, authenticated;
revoke insert, delete on public.ai_generations, public.organizations, public.profiles from anon, authenticated;
revoke all on all tables in schema public from anon;
grant select on public.plans, public.subscription_entitlements, public.site_content to anon;
