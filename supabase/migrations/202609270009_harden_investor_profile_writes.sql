begin;

alter table public.investor_profiles
  drop constraint if exists investor_profiles_linkedin_url_check,
  add constraint investor_profile_linkedin_url check (
    linkedin_url is null
    or (char_length(linkedin_url) <= 2048 and linkedin_url ~ '^https://(www\.)?linkedin\.com/(in|company)/[^[:space:]]+$')
  );

drop policy if exists "investors create own profile" on public.investor_profiles;
drop policy if exists "investors update own profile" on public.investor_profiles;

revoke insert, update on public.investor_profiles from authenticated;

comment on table public.investor_profiles is
  'Private investor preferences. Reads use owner RLS; validated writes use the authenticated server API and service role.';

commit;
