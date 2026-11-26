-- Phase 2: AI tools.

-- Saved website copy (Website Copywriter).
create table public.website_copies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  business_profile_id uuid references public.business_profiles (id) on delete cascade,
  generation_id uuid references public.ai_generations (id) on delete set null,
  page_type text not null,
  title text not null check (char_length(title) between 1 and 200),
  content jsonb not null default '{}'::jsonb,
  is_demo boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index website_copies_org_idx on public.website_copies (organization_id, created_at desc);
create trigger website_copies_updated before update on public.website_copies
  for each row execute function public.set_updated_at();
alter table public.website_copies enable row level security;
create policy website_copies_select on public.website_copies for select to authenticated using (public.is_org_member(organization_id));
create policy website_copies_insert on public.website_copies for insert to authenticated with check (public.is_org_member(organization_id));
create policy website_copies_update on public.website_copies for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy website_copies_delete on public.website_copies for delete to authenticated using (public.is_org_member(organization_id));
revoke all on public.website_copies from anon;

-- Extend cross-tenant checks to generation, strategy and calendar references.
create or replace function public.check_tenant_refs()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  j jsonb := to_jsonb(new);
  org uuid := (j ->> 'organization_id')::uuid;
  ref_org uuid;
  refs text[][] := array[
    array['business_profile_id', 'business_profiles'],
    array['conversation_id', 'ai_conversations'],
    array['campaign_id', 'marketing_campaigns'],
    array['audit_id', 'website_audits'],
    array['generation_id', 'ai_generations'],
    array['strategy_id', 'marketing_strategies'],
    array['calendar_id', 'content_calendars']
  ];
  i integer;
begin
  for i in 1 .. array_length(refs, 1) loop
    if j ? refs[i][1] and (j ->> refs[i][1]) is not null then
      execute format('select organization_id from public.%I where id = $1', refs[i][2])
        into ref_org using (j ->> refs[i][1])::uuid;
      if ref_org is distinct from org then
        raise exception 'TENANT_MISMATCH: % belongs to another organization', refs[i][1];
      end if;
    end if;
  end loop;
  return new;
end $$;

create trigger website_copies_tenant_refs before insert or update on public.website_copies
  for each row execute function public.check_tenant_refs();

-- Assistant messages are written by the server; members may only save/unsave them.
drop policy if exists ai_messages_insert on public.ai_messages;
revoke insert on public.ai_messages from authenticated;
create or replace function public.protect_message_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new := jsonb_populate_record(old, jsonb_build_object('is_saved', new.is_saved));
  end if;
  return new;
end $$;
create trigger ai_messages_protect before update on public.ai_messages
  for each row execute function public.protect_message_columns();

-- Long-form tools (30-day plans, 90-day strategies) need larger outputs.
update public.ai_settings set value = '16000' where key = 'max_output_tokens';
