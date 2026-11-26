-- Development seed data. EVERYTHING HERE IS DEMONSTRATION DATA.
-- Rows are flagged is_demo = true and the UI labels them as demo. Never run this
-- against production. (Supabase CLI runs it automatically on `supabase db reset`.)
--
-- Demo login: demo@ltrgrowth.local / demo-password-123  (email pre-confirmed)

do $$
declare
  demo_user uuid := '11111111-1111-1111-1111-111111111111';
  org uuid;
  bp uuid := '22222222-2222-2222-2222-222222222222';
begin
  if exists (select 1 from auth.users where id = demo_user) then
    return;
  end if;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
  values ('00000000-0000-0000-0000-000000000000', demo_user, 'authenticated', 'authenticated', 'demo@ltrgrowth.local',
    crypt('demo-password-123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Demo User"}', now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
  values (gen_random_uuid(), demo_user, demo_user::text, jsonb_build_object('sub', demo_user::text, 'email', 'demo@ltrgrowth.local'), 'email', now(), now(), now());

  -- handle_new_user() created the workspace; mark it as demo.
  select organization_id into org from public.organization_members where user_id = demo_user;
  update public.organizations set name = 'Demo workspace', is_demo = true where id = org;

  insert into public.business_profiles (id, organization_id, name, website_url, industry, description, location, service_areas,
    products_services, target_audience, average_customer_value, monthly_marketing_budget, competitors, marketing_channels, goals,
    onboarding_step, onboarding_completed_at, is_demo, created_by)
  values (bp, org, 'Demo Plumbing Co. (sample data)', 'https://example.com/', 'Home services',
    'Fictional residential plumbing company used for development and demos.', 'Springfield', array['Springfield', 'Shelbyville'],
    'Drain cleaning, water heater installation, leak repair', 'Homeowners aged 30-65 who need fast, reliable repairs', 350, 1500,
    '[{"name":"Example Competitor A"},{"name":"Example Competitor B"}]', array['Website', 'Google Business Profile'], array['Get more leads', 'Improve local visibility'],
    'done', now(), true, demo_user);
  update public.profiles set active_business_profile_id = bp, onboarding_completed_at = now() where id = demo_user;

  insert into public.brand_kits (organization_id, business_profile_id, colors, brand_voice, voice_traits, tagline, is_demo)
  values (org, bp, '[{"name":"Primary","hex":"#1D4ED8"},{"name":"Accent","hex":"#F59E0B"}]', 'Plain-spoken and reassuring.', array['Friendly', 'Straightforward'], 'Sample tagline', true);

  insert into public.marketing_tasks (organization_id, business_profile_id, title, description, category, priority, source, is_demo, created_by) values
    (org, bp, 'Run your first website audit', 'Demo task.', 'Website', 'high', 'onboarding', true, demo_user),
    (org, bp, 'Upload your logo to the Brand Kit', 'Demo task.', 'Brand', 'medium', 'onboarding', true, demo_user),
    (org, bp, 'Add your Google Business Profile link', 'Demo task.', 'Local', 'low', 'manual', true, demo_user);
end $$;
