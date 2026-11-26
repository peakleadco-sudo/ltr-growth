-- LTR Growth: core platform schema
-- Users, organizations, memberships, business profiles, brand kits, assets,
-- plans/entitlements, subscriptions, usage credits and notifications.
--
-- Conventions:
--   * UUID primary keys, created_at / updated_at timestamps.
--   * Every tenant-owned row carries organization_id and is protected by RLS.
--   * is_demo = true marks seed/demonstration rows. Real customer data is never
--     created with is_demo = true, and the app labels demo rows in the UI.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email citext,
  full_name text,
  avatar_url text,
  platform_role text not null default 'user' check (platform_role in ('user', 'admin')),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  active_organization_id uuid,
  active_business_profile_id uuid,
  onboarding_completed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- Users must never be able to promote themselves to admin.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.platform_role := old.platform_role;
    new.id := old.id;
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- Organizations & memberships
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_by uuid references auth.users (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger organizations_updated before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id);

alter table public.profiles
  add constraint profiles_active_org_fk foreign key (active_organization_id)
  references public.organizations (id) on delete set null;

-- SECURITY DEFINER helpers avoid recursive RLS evaluation on memberships.
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org uuid, roles text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid() and m.role = any (roles)
  );
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.platform_role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Plans & entitlements (configurable from the admin dashboard)
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key,                       -- 'free', 'starter', 'growth', 'pro'
  name text not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd',
  interval text not null default 'month' check (interval in ('month', 'year')),
  stripe_price_id text,
  max_business_profiles integer not null default 1 check (max_business_profiles >= 1),
  monthly_text_credits integer not null default 0 check (monthly_text_credits >= 0),
  monthly_image_credits integer not null default 0 check (monthly_image_credits >= 0),
  monthly_audits integer not null default 0 check (monthly_audits >= 0),
  marketing_bullets text[] not null default '{}',
  is_public boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger plans_updated before update on public.plans
  for each row execute function public.set_updated_at();

create table public.subscription_entitlements (
  plan_id text not null references public.plans (id) on delete cascade,
  feature_key text not null,                 -- e.g. 'ad_studio', 'competitor_intel'
  enabled boolean not null default true,
  limit_value integer,                       -- optional per-feature cap (null = plan credits apply)
  created_at timestamptz not null default now(),
  primary key (plan_id, feature_key)
);

-- ---------------------------------------------------------------------------
-- Subscriptions (written only by the server / Stripe webhooks)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  plan_id text not null references public.plans (id) default 'free',
  status text not null default 'active'
    check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Usage credits & ledger (written only through SECURITY DEFINER functions)
-- ---------------------------------------------------------------------------
create table public.usage_credits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  text_credits_granted integer not null default 0,
  text_credits_used integer not null default 0,
  image_credits_granted integer not null default 0,
  image_credits_used integer not null default 0,
  audits_granted integer not null default 0,
  audits_used integer not null default 0,
  bonus_text_credits integer not null default 0,
  bonus_image_credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, period_start),
  check (text_credits_used >= 0 and image_credits_used >= 0 and audits_used >= 0)
);
create trigger usage_credits_updated before update on public.usage_credits
  for each row execute function public.set_updated_at();

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  credit_type text not null check (credit_type in ('text', 'image', 'audit')),
  amount integer not null,                   -- negative = consumption, positive = grant/refund
  reason text not null,                      -- 'generation', 'refund', 'monthly_grant', 'purchase', 'admin_adjustment'
  reference_id uuid,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index credit_transactions_org_idx on public.credit_transactions (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Business profiles (persistent AI context)
-- ---------------------------------------------------------------------------
create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  website_url text check (website_url is null or website_url ~* '^https?://'),
  industry text,
  description text check (description is null or char_length(description) <= 4000),
  location text,
  service_areas text[] not null default '{}',
  products_services text,
  target_audience text,
  average_customer_value numeric(12, 2) check (average_customer_value is null or average_customer_value >= 0),
  monthly_marketing_budget numeric(12, 2) check (monthly_marketing_budget is null or monthly_marketing_budget >= 0),
  competitors jsonb not null default '[]'::jsonb,           -- [{name, url}]
  marketing_channels text[] not null default '{}',
  goals text[] not null default '{}',
  social_links jsonb not null default '{}'::jsonb,          -- {instagram: url, ...}
  website_extraction jsonb,                                  -- raw approved extraction snapshot
  website_extraction_approved_at timestamptz,
  onboarding_step text,
  onboarding_completed_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_profiles_org_idx on public.business_profiles (organization_id);
create trigger business_profiles_updated before update on public.business_profiles
  for each row execute function public.set_updated_at();

alter table public.profiles
  add constraint profiles_active_bp_fk foreign key (active_business_profile_id)
  references public.business_profiles (id) on delete set null;

-- Enforce the plan's business-profile limit at the database level.
create or replace function public.enforce_business_profile_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  max_allowed integer;
  current_count integer;
begin
  select p.max_business_profiles into max_allowed
  from public.subscriptions s join public.plans p on p.id = s.plan_id
  where s.organization_id = new.organization_id
    and s.status in ('active', 'trialing', 'past_due');
  if max_allowed is null then
    max_allowed := 1;
  end if;
  select count(*) into current_count from public.business_profiles
  where organization_id = new.organization_id;
  if current_count >= max_allowed then
    raise exception 'PLAN_LIMIT: your plan allows % business profile(s)', max_allowed
      using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger business_profiles_limit before insert on public.business_profiles
  for each row execute function public.enforce_business_profile_limit();

-- ---------------------------------------------------------------------------
-- Brand kits & assets
-- ---------------------------------------------------------------------------
create table public.brand_kits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid not null unique references public.business_profiles (id) on delete cascade,
  colors jsonb not null default '[]'::jsonb,                -- [{name, hex}]
  fonts jsonb not null default '[]'::jsonb,                 -- [{role, family}]
  brand_voice text,
  voice_traits text[] not null default '{}',
  mission text,
  tagline text,
  unique_selling_propositions text[] not null default '{}',
  approved_claims text[] not null default '{}',
  preferred_terms text[] not null default '{}',
  restricted_terms text[] not null default '{}',
  customer_profiles jsonb not null default '[]'::jsonb,     -- [{name, description}]
  logo_asset_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger brand_kits_updated before update on public.brand_kits
  for each row execute function public.set_updated_at();

create table public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  kind text not null check (kind in ('logo', 'product_photo', 'brand_imagery', 'document', 'generated', 'other')),
  title text,
  storage_bucket text not null default 'brand-assets',
  storage_path text not null unique,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 26214400),
  width integer,
  height integer,
  tags text[] not null default '{}',
  is_demo boolean not null default false,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index brand_assets_org_idx on public.brand_assets (organization_id, created_at desc);

alter table public.brand_kits
  add constraint brand_kits_logo_fk foreign key (logo_asset_id)
  references public.brand_assets (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  kind text not null default 'info' check (kind in ('info', 'success', 'warning', 'error', 'billing')),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- New-user bootstrap: profile, personal organization, owner membership,
-- free subscription and first usage period.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_usage_period(org uuid)
returns public.usage_credits language plpgsql security definer set search_path = public as $$
declare
  sub public.subscriptions;
  pl public.plans;
  row public.usage_credits;
  p_start timestamptz;
  p_end timestamptz;
begin
  select * into sub from public.subscriptions where organization_id = org;
  if sub.id is null then
    raise exception 'NO_SUBSCRIPTION';
  end if;
  -- Paid plans use the Stripe billing period; free plans reset on the calendar month.
  -- A plan that is not in good standing falls back to free-plan allowances.
  if sub.status in ('active', 'trialing') then
    select * into pl from public.plans where id = sub.plan_id;
  else
    select * into pl from public.plans where id = 'free';
  end if;

  if sub.stripe_subscription_id is not null and sub.current_period_end > now() then
    p_start := sub.current_period_start;
    p_end := sub.current_period_end;
  else
    p_start := date_trunc('month', now());
    p_end := date_trunc('month', now()) + interval '1 month';
  end if;

  select * into row from public.usage_credits
  where organization_id = org and period_start = p_start;
  if row.id is null then
    insert into public.usage_credits (organization_id, period_start, period_end,
      text_credits_granted, image_credits_granted, audits_granted)
    values (org, p_start, p_end, pl.monthly_text_credits, pl.monthly_image_credits, pl.monthly_audits)
    on conflict (organization_id, period_start) do nothing;
    select * into row from public.usage_credits
    where organization_id = org and period_start = p_start;
  end if;
  return row;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_org uuid;
  display_name text;
begin
  display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  );

  insert into public.organizations (name, created_by)
  values (left(coalesce(display_name, 'My') || '''s workspace', 160), new.id)
  returning id into new_org;

  insert into public.profiles (id, email, full_name, avatar_url, active_organization_id,
    marketing_consent, marketing_consent_at)
  values (
    new.id, new.email, display_name, new.raw_user_meta_data ->> 'avatar_url', new_org,
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
    case when coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false) then now() end
  );

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, new.id, 'owner');

  insert into public.subscriptions (organization_id, plan_id, status)
  values (new_org, 'free', 'active');

  perform public.ensure_usage_period(new_org);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
