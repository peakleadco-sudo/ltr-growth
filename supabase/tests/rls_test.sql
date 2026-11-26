-- Row-level security and credit-ledger tests.
-- Run: psql -v ON_ERROR_STOP=1 -f tests/local_supabase_stub.sql -f migrations/*.sql -f tests/rls_test.sql
-- Any failed assertion aborts with a non-zero exit code.
\set ON_ERROR_STOP 1

create or replace function pg_temp.expect_error(stmt text, expected text default null)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if expected is not null and position(expected in sqlerrm) = 0 then
      raise exception 'expected error containing "%" but got "%" for: %', expected, sqlerrm, stmt;
    end if;
    return;
  end;
  raise exception 'expected an error but statement succeeded: %', stmt;
end $$;
grant execute on function pg_temp.expect_error(text, text) to anon, authenticated, service_role;

-- Two independent users sign up.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.test', '{"full_name":"Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.test', '{"full_name":"Bob","marketing_consent":true}');

-- Bootstrap trigger created profile, org, owner membership, free subscription, usage period.
do $$
declare n int;
begin
  select count(*) into n from public.profiles; assert n = 2, 'profiles bootstrapped';
  select count(*) into n from public.organizations; assert n = 2, 'orgs bootstrapped';
  select count(*) into n from public.organization_members where role = 'owner'; assert n = 2, 'owners bootstrapped';
  select count(*) into n from public.subscriptions where plan_id = 'free'; assert n = 2, 'free subs';
  select count(*) into n from public.usage_credits where text_credits_granted = 5 and audits_granted = 1; assert n = 2, 'usage periods';
  select count(*) into n from public.profiles where marketing_consent and marketing_consent_at is not null; assert n = 1, 'consent stored';
end $$;

-- Remember org ids for later.
select organization_id as alice_org from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000a' \gset
select organization_id as bob_org from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000b' \gset

-- Bob creates a business profile (as Bob).
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
insert into public.business_profiles (organization_id, name) values (:'bob_org', 'Bob Plumbing');
select id as bob_bp from public.business_profiles where organization_id = :'bob_org' \gset

-- ---- Alice ----
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$
declare n int;
begin
  select count(*) into n from public.profiles; assert n = 1, 'alice sees only her profile';
  select count(*) into n from public.organizations; assert n = 1, 'alice sees only her org';
  select count(*) into n from public.business_profiles; assert n = 0, 'alice cannot see bob business profile';
  select count(*) into n from public.subscriptions; assert n = 1, 'alice sees only her subscription';
  select count(*) into n from public.usage_credits; assert n = 1, 'alice sees only her usage';
  select count(*) into n from public.plans; assert n = 4, 'plans readable';
end $$;

-- Alice can create in her org but not in Bob's.
insert into public.business_profiles (organization_id, name, website_url) values (:'alice_org', 'Alice Bakery', 'https://alice.example');
select id as alice_bp from public.business_profiles where organization_id = :'alice_org' \gset
select pg_temp.expect_error(format('insert into public.business_profiles (organization_id, name) values (%L, %L)', :'bob_org', 'Hijack'));

-- Free plan allows one business profile (enforced in the database).
select pg_temp.expect_error(format('insert into public.business_profiles (organization_id, name) values (%L, %L)', :'alice_org', 'Second'), 'PLAN_LIMIT');

-- Cannot update or delete Bob's rows (silently affects zero rows).
update public.business_profiles set name = 'pwned' where id = :'bob_bp';
delete from public.business_profiles where id = :'bob_bp';

-- Cannot move her own row into Bob's org.
select pg_temp.expect_error(format('update public.business_profiles set organization_id = %L where id = %L', :'bob_org', :'alice_bp'));

-- Cannot attach Bob's business profile to her own brand kit (cross-tenant reference).
select pg_temp.expect_error(format('insert into public.brand_kits (organization_id, business_profile_id) values (%L, %L)', :'alice_org', :'bob_bp'), 'TENANT_MISMATCH');
insert into public.brand_kits (organization_id, business_profile_id, brand_voice) values (:'alice_org', :'alice_bp', 'Warm');

-- Cannot escalate to platform admin.
update public.profiles set platform_role = 'admin', full_name = 'Alice A.' where id = auth.uid();
do $$ begin
  assert (select platform_role from public.profiles where id = auth.uid()) = 'user', 'role escalation blocked';
  assert (select full_name from public.profiles where id = auth.uid()) = 'Alice A.', 'own profile editable';
end $$;

-- Cannot grant herself a paid plan or credits.
select pg_temp.expect_error($q$update public.subscriptions set plan_id = 'pro'$q$, 'permission denied');
do $$ begin assert (select plan_id from public.subscriptions) = 'free', 'subscription untouched'; end $$;
select pg_temp.expect_error(format('insert into public.usage_credits (organization_id, period_start, period_end, text_credits_granted) values (%L, now(), now() + interval %L, 9999)', :'alice_org', '1 month'));
select pg_temp.expect_error($q$update public.usage_credits set text_credits_granted = 9999$q$, 'permission denied');
do $$ begin assert (select text_credits_granted from public.usage_credits) = 5, 'usage untouched'; end $$;
select pg_temp.expect_error(format('select public.consume_credits(%L, %L, 1, %L)', :'alice_org', 'text', 'k'), 'permission denied');
select pg_temp.expect_error(format('select public.grant_purchased_credits(%L, %L, 100, %L)', :'alice_org', 'text', 'k'), 'permission denied');
select pg_temp.expect_error(format('select public.check_rate_limit(%L, 1, 60)', 'x'), 'permission denied');

-- Admin-only data is invisible.
do $$ declare n int; begin
  select count(*) into n from public.agency_leads; assert n = 0;
  select count(*) into n from public.prompt_templates; assert n = 0;
  select count(*) into n from public.ai_settings; assert n = 0, 'ai settings hidden from users';
end $$;
select pg_temp.expect_error($q$insert into public.agency_leads (business_name) values ('x')$q$);
select pg_temp.expect_error($q$select * from public.rate_limits$q$);

reset role;

-- ---- Server (service role): credit ledger ----
set role service_role;
do $$
declare r jsonb; org uuid;
begin
  select organization_id into org from public.organization_members where user_id = '00000000-0000-0000-0000-00000000000a';
  -- Spend all 5 free text credits.
  for i in 1..5 loop
    r := public.consume_credits(org, 'text', 1, 'gen-' || i);
    assert (r ->> 'ok')::boolean, 'consume ok';
  end loop;
  -- Retrying the same key does not double charge.
  r := public.consume_credits(org, 'text', 1, 'gen-5');
  assert (r ->> 'duplicate')::boolean, 'idempotent';
  assert (select text_credits_used from public.usage_credits where organization_id = org) = 5, 'exactly 5 used';
  -- The 6th distinct generation is refused.
  begin
    perform public.consume_credits(org, 'text', 1, 'gen-6');
    raise exception 'should have failed';
  exception when others then
    assert sqlerrm = 'INSUFFICIENT_CREDITS', 'insufficient credits: ' || sqlerrm;
  end;
  -- Refund returns the credit once.
  r := public.refund_credits('gen-5');
  r := public.refund_credits('gen-5');
  assert (r ->> 'duplicate')::boolean, 'refund idempotent';
  assert (select text_credits_used from public.usage_credits where organization_id = org) = 4, 'refunded';
  -- Purchased credits extend capacity and are used after the monthly allowance.
  r := public.grant_purchased_credits(org, 'text', 10, 'stripe-evt-1');
  r := public.grant_purchased_credits(org, 'text', 10, 'stripe-evt-1');
  assert (select text_balance from public.credit_wallets where organization_id = org) = 10, 'grant idempotent';
  r := public.consume_credits(org, 'text', 3, 'gen-7');
  assert (select text_balance from public.credit_wallets where organization_id = org) = 8, 'split 1 period + 2 wallet';
  assert (select text_credits_used from public.usage_credits where organization_id = org) = 5;
  -- Image credits are 0 on free.
  begin
    perform public.consume_credits(org, 'image', 1, 'img-1');
    raise exception 'should have failed';
  exception when others then
    assert sqlerrm = 'INSUFFICIENT_CREDITS', 'free has no image credits';
  end;
  -- Rate limiter.
  assert public.check_rate_limit('t', 2, 60);
  assert public.check_rate_limit('t', 2, 60);
  assert not public.check_rate_limit('t', 2, 60), 'third call limited';
end $$;
reset role;

-- ---- Users cannot tamper with server-owned generation output ----
insert into public.ai_generations (organization_id, tool, output, status) values (:'alice_org', 'ad_studio', '{"a":1}', 'succeeded');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.ai_generations set output = '{"a":2}', credits_charged = -100, is_saved = true;
do $$ begin
  assert (select output ->> 'a' from public.ai_generations) = '1', 'output protected';
  assert (select credits_charged from public.ai_generations) = 0, 'credits protected';
  assert (select is_saved from public.ai_generations), 'is_saved toggle allowed';
end $$;
select pg_temp.expect_error(format('insert into public.ai_generations (organization_id, tool) values (%L, %L)', :'alice_org', 'x'));

-- ---- Phase 2: AI tool tables ----
reset role;
insert into public.ai_generations (organization_id, tool, status) values (:'bob_org', 'ad_studio', 'succeeded') returning id as bob_gen \gset
insert into public.ai_conversations (organization_id, user_id, title) values (:'alice_org', '00000000-0000-0000-0000-00000000000a', 'Chat') returning id as alice_conv \gset
insert into public.ai_messages (conversation_id, organization_id, role, content) values (:'alice_conv', :'alice_org', 'assistant', 'Hello');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
-- Cannot link saved content to another tenant's generation.
select pg_temp.expect_error(format('insert into public.generated_ads (organization_id, platform, title, generation_id) values (%L, %L, %L, %L)', :'alice_org', 'meta', 'x', :'bob_gen'), 'TENANT_MISMATCH');
select pg_temp.expect_error(format('insert into public.website_copies (organization_id, page_type, title, generation_id) values (%L, %L, %L, %L)', :'alice_org', 'home', 'x', :'bob_gen'), 'TENANT_MISMATCH');
insert into public.website_copies (organization_id, business_profile_id, page_type, title) values (:'alice_org', :'alice_bp', 'home', 'Home v1');
-- Assistant messages are server-written; users may only toggle is_saved.
select pg_temp.expect_error(format('insert into public.ai_messages (conversation_id, organization_id, role, content) values (%L, %L, %L, %L)', :'alice_conv', :'alice_org', 'assistant', 'forged'));
update public.ai_messages set content = 'tampered', is_saved = true;
do $$ begin
  assert (select content from public.ai_messages) = 'Hello', 'message content protected';
  assert (select is_saved from public.ai_messages), 'message save allowed';
end $$;
-- Bob cannot see Alice's copy or conversation.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert (select count(*) from public.website_copies) = 0, 'bob cannot see alice copy';
  assert (select count(*) from public.ai_conversations) = 0, 'bob cannot see alice conversation';
  assert (select count(*) from public.ai_messages) = 0, 'bob cannot see alice messages';
end $$;
reset role;

-- ---- Anonymous visitors ----
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ declare n int; begin
  select count(*) into n from public.plans; assert n = 4, 'anon reads plans';
end $$;
select pg_temp.expect_error('select * from public.profiles', 'permission denied');
select pg_temp.expect_error('select * from public.business_profiles', 'permission denied');
select pg_temp.expect_error('select * from public.usage_credits', 'permission denied');
reset role;

-- ---- Unverified case studies cannot be published ----
select pg_temp.expect_error($q$insert into public.site_content (content_type, title, is_published) values ('case_study', 'Fake', true)$q$);

\echo 'ALL RLS TESTS PASSED'
