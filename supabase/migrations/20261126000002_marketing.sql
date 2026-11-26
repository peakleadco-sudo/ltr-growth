-- LTR Growth: AI, marketing tools, campaigns, performance, agency and admin tables.
-- Tables are created up front so later phases build on a stable schema.

-- ---------------------------------------------------------------------------
-- AI configuration (admin-managed, read by the server)
-- ---------------------------------------------------------------------------
create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  tool text not null,                          -- 'ad_studio', 'social', 'strategy', ...
  version integer not null default 1,
  system_prompt text not null,
  user_prompt_template text not null,
  output_schema jsonb,
  model text,                                  -- overrides ai_settings default when set
  credit_cost integer not null default 1 check (credit_cost >= 0),
  is_active boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool, version)
);
create trigger prompt_templates_updated before update on public.prompt_templates
  for each row execute function public.set_updated_at();

create table public.ai_settings (
  key text primary key,                        -- 'default_text_model', 'default_image_model', pricing...
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI generation history, conversations
-- ---------------------------------------------------------------------------
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  tool text not null,
  section text,                                -- for single-section regeneration
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider text,
  model text,
  prompt_template_id uuid references public.prompt_templates (id) on delete set null,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10, 5),
  credits_charged integer not null default 0,
  error_message text,
  idempotency_key text unique,
  is_saved boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index ai_generations_org_idx on public.ai_generations (organization_id, created_at desc);
create index ai_generations_tool_idx on public.ai_generations (organization_id, tool, created_at desc);

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  user_id uuid references auth.users (id) on delete cascade,
  title text not null default 'New conversation',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_updated before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,     -- {verified_facts:[], assumptions:[]}
  is_saved boolean not null default false,
  generation_id uuid references public.ai_generations (id) on delete set null,
  created_at timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Creative outputs
-- ---------------------------------------------------------------------------
create table public.generated_ads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  campaign_id uuid,
  generation_id uuid references public.ai_generations (id) on delete set null,
  platform text not null check (platform in ('meta', 'google', 'tiktok', 'instagram', 'youtube', 'linkedin')),
  title text not null,
  brief jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index generated_ads_org_idx on public.generated_ads (organization_id, created_at desc);
create trigger generated_ads_updated before update on public.generated_ads
  for each row execute function public.set_updated_at();

create table public.generated_images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  generation_id uuid references public.ai_generations (id) on delete set null,
  asset_id uuid references public.brand_assets (id) on delete set null,
  aspect_ratio text not null check (aspect_ratio in ('1:1', '4:5', '9:16', '16:9')),
  prompt text,
  overlay jsonb not null default '{}'::jsonb,
  source_asset_ids uuid[] not null default '{}',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Website audits
-- ---------------------------------------------------------------------------
create table public.website_audits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade, -- null = anonymous funnel scan
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  requested_by uuid references auth.users (id) on delete set null,
  url text not null,
  final_url text,
  scope text not null default 'full' check (scope in ('preview', 'free', 'full', 'advanced', 'prospect')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  scores jsonb not null default '{}'::jsonb,       -- {performance, technical_seo, conversion, marketing}
  checks jsonb not null default '[]'::jsonb,       -- [{id, status: pass|fail|warn|unverified, ...}]
  raw_data jsonb not null default '{}'::jsonb,
  data_sources jsonb not null default '[]'::jsonb, -- [{source, retrieved_at}]
  share_token text unique,
  share_expires_at timestamptz,
  is_prospect_report boolean not null default false,
  prospect_name text,
  error_message text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index website_audits_org_idx on public.website_audits (organization_id, created_at desc);

create table public.audit_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.website_audits (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  category text not null,
  check_key text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  status text not null check (status in ('pass', 'fail', 'warn', 'unverified')),
  title text not null,
  detail text,
  recommendation text,
  difficulty text check (difficulty in ('easy', 'moderate', 'advanced')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_findings_audit_idx on public.audit_findings (audit_id);

-- ---------------------------------------------------------------------------
-- Competitors
-- ---------------------------------------------------------------------------
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  name text not null,
  website_url text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.competitor_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  competitor_ids uuid[] not null default '{}',
  generation_id uuid references public.ai_generations (id) on delete set null,
  report jsonb not null default '{}'::jsonb,
  sources jsonb not null default '[]'::jsonb,       -- [{url, retrieved_at}]
  status text not null default 'completed' check (status in ('running', 'completed', 'failed')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Strategies & tasks
-- ---------------------------------------------------------------------------
create table public.marketing_strategies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete set null,
  generation_id uuid references public.ai_generations (id) on delete set null,
  title text not null,
  horizon text not null check (horizon in ('30_day', '60_day', '90_day', 'custom')),
  content jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  starts_on date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger marketing_strategies_updated before update on public.marketing_strategies
  for each row execute function public.set_updated_at();

create table public.marketing_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  strategy_id uuid references public.marketing_strategies (id) on delete set null,
  campaign_id uuid,
  title text not null check (char_length(title) between 1 and 300),
  description text,
  category text,
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'skipped')),
  due_date date,
  week_number integer,
  source text not null default 'manual' check (source in ('manual', 'strategy', 'audit', 'onboarding', 'campaign')),
  completed_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marketing_tasks_org_idx on public.marketing_tasks (organization_id, status, due_date);
create trigger marketing_tasks_updated before update on public.marketing_tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Social content & calendars
-- ---------------------------------------------------------------------------
create table public.content_calendars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  title text not null,
  starts_on date not null,
  length_days integer not null check (length_days in (7, 14, 30)),
  generation_id uuid references public.ai_generations (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.social_content (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  calendar_id uuid references public.content_calendars (id) on delete set null,
  campaign_id uuid,
  generation_id uuid references public.ai_generations (id) on delete set null,
  platform text not null check (platform in ('instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'x')),
  content_type text not null,
  title text,
  body jsonb not null default '{}'::jsonb,
  -- 'scheduled' / 'published' are user-recorded states: publishing is manual in the initial release.
  status text not null default 'draft' check (status in ('draft', 'approved', 'scheduled', 'published')),
  planned_for date,
  position integer not null default 0,
  image_asset_id uuid references public.brand_assets (id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_content_org_idx on public.social_content (organization_id, planned_for);
create trigger social_content_updated before update on public.social_content
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Email / SMS
-- ---------------------------------------------------------------------------
create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  generation_id uuid references public.ai_generations (id) on delete set null,
  channel text not null default 'email' check (channel in ('email', 'sms')),
  campaign_type text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger email_campaigns_updated before update on public.email_campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Campaign management
-- ---------------------------------------------------------------------------
create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  objective text,
  -- Statuses are internal planning states; they never claim the campaign is live on an ad platform.
  status text not null default 'draft' check (status in ('draft', 'planned', 'active', 'completed', 'paused')),
  planned_budget numeric(12, 2) check (planned_budget is null or planned_budget >= 0),
  actual_spend numeric(12, 2) check (actual_spend is null or actual_spend >= 0),
  starts_on date,
  ends_on date,
  channels text[] not null default '{}',
  notes text,
  results jsonb not null default '{}'::jsonb,      -- manually entered results
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index marketing_campaigns_org_idx on public.marketing_campaigns (organization_id, starts_on);
create trigger marketing_campaigns_updated before update on public.marketing_campaigns
  for each row execute function public.set_updated_at();

alter table public.generated_ads add constraint generated_ads_campaign_fk
  foreign key (campaign_id) references public.marketing_campaigns (id) on delete set null;
alter table public.marketing_tasks add constraint marketing_tasks_campaign_fk
  foreign key (campaign_id) references public.marketing_campaigns (id) on delete set null;
alter table public.social_content add constraint social_content_campaign_fk
  foreign key (campaign_id) references public.marketing_campaigns (id) on delete set null;

create table public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  asset_type text not null check (asset_type in ('ad', 'image', 'social', 'email', 'file')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, asset_type, ref_id)
);

-- ---------------------------------------------------------------------------
-- Performance data
-- ---------------------------------------------------------------------------
create table public.imported_data (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  file_name text,
  source text not null check (source in ('csv', 'manual', 'integration')),
  status text not null default 'pending_review' check (status in ('pending_review', 'imported', 'rejected')),
  row_count integer not null default 0,
  validation_errors jsonb not null default '[]'::jsonb,
  imported_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  campaign_id uuid references public.marketing_campaigns (id) on delete set null,
  import_id uuid references public.imported_data (id) on delete cascade,
  metric_date date not null,
  channel text,
  spend numeric(12, 2) check (spend is null or spend >= 0),
  impressions bigint check (impressions is null or impressions >= 0),
  reach bigint check (reach is null or reach >= 0),
  clicks bigint check (clicks is null or clicks >= 0),
  leads integer check (leads is null or leads >= 0),
  sales integer check (sales is null or sales >= 0),
  revenue numeric(12, 2) check (revenue is null or revenue >= 0),
  source text not null check (source in ('manual', 'import', 'integration')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index performance_metrics_org_idx on public.performance_metrics (organization_id, metric_date);

-- ---------------------------------------------------------------------------
-- Agency funnel
-- ---------------------------------------------------------------------------
create table public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  name text not null,
  business_name text not null,
  email citext not null,
  phone text,
  website text,
  industry text,
  marketing_budget text,
  services text[] not null default '{}',
  goals text,
  contact_method text check (contact_method in ('email', 'phone', 'video_call')),
  source text not null default 'contact_form',
  source_context jsonb not null default '{}'::jsonb,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.agency_leads (
  id uuid primary key default gen_random_uuid(),
  consultation_request_id uuid references public.consultation_requests (id) on delete set null,
  business_name text not null,
  contact_name text,
  email citext,
  phone text,
  website text,
  industry text,
  interested_services text[] not null default '{}',
  marketing_budget text,
  lead_source text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'meeting_booked', 'proposal_sent', 'closed_won', 'closed_lost')),
  assigned_to uuid references auth.users (id) on delete set null,
  notes text,
  follow_up_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger agency_leads_updated before update on public.agency_leads
  for each row execute function public.set_updated_at();

create table public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.agency_leads (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  activity_type text not null,
  detail text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Support, site content, admin logs, rate limits
-- ---------------------------------------------------------------------------
create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  email citext not null,
  subject text not null check (char_length(subject) between 1 and 200),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved')),
  priority text not null default 'normal' check (priority in ('normal', 'priority')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger support_requests_updated before update on public.support_requests
  for each row execute function public.set_updated_at();

-- Admin-managed public website content: FAQs, case studies, client logos,
-- testimonials, agency CTAs. Only 'published' rows are shown publicly.
-- Case studies and testimonials must be verified before publishing.
create table public.site_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('faq', 'case_study', 'client_logo', 'testimonial', 'agency_cta', 'announcement')),
  slug text,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  is_verified boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_published or content_type not in ('case_study', 'testimonial', 'client_logo') or is_verified)
);
create index site_content_type_idx on public.site_content (content_type, is_published, sort_order);
create trigger site_content_updated before update on public.site_content
  for each row execute function public.set_updated_at();

create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index admin_activity_logs_created_idx on public.admin_activity_logs (created_at desc);

create table public.api_error_logs (
  id uuid primary key default gen_random_uuid(),
  service text not null,
  route text,
  organization_id uuid references public.organizations (id) on delete set null,
  status_code integer,
  message text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index api_error_logs_created_idx on public.api_error_logs (created_at desc);

create table public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, window_start)
);

create table public.stripe_events (
  id text primary key,                         -- Stripe event id; guarantees idempotent processing
  type text not null,
  processed_at timestamptz not null default now()
);
