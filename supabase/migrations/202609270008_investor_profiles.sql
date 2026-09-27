begin;

create table public.investor_profiles (
  user_id uuid primary key references public.accounts(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  investor_type text not null check (investor_type in ('angel', 'vc-firm', 'corporate-venture', 'accelerator')),
  firm_name text check (firm_name is null or char_length(trim(firm_name)) between 2 and 120),
  professional_title text check (professional_title is null or char_length(trim(professional_title)) between 2 and 100),
  bio text check (bio is null or char_length(trim(bio)) between 2 and 600),
  sectors text[] not null,
  stages text[] not null,
  countries text[] not null default '{}',
  check_currency text not null check (check_currency in ('NGN', 'USD')),
  check_min_minor bigint not null check (check_min_minor >= 0 and check_min_minor <= 100000000000000),
  check_max_minor bigint not null check (check_max_minor >= check_min_minor and check_max_minor <= 100000000000000),
  linkedin_url text check (linkedin_url is null or char_length(linkedin_url) <= 2048),
  domain_signal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investor_profile_sector_count check (cardinality(sectors) between 1 and 5),
  constraint investor_profile_stage_count check (cardinality(stages) between 1 and 4),
  constraint investor_profile_country_count check (cardinality(countries) between 0 and 10),
  constraint investor_profile_sector_values check (sectors <@ array['agritech','climate-energy','commerce','education','fintech','healthtech','logistics','enterprise-software','consumer','other']::text[]),
  constraint investor_profile_stage_values check (stages <@ array['idea','pre-seed','seed','growth']::text[]),
  constraint investor_profile_country_values check (
    cardinality(countries) = 0 or array_to_string(countries, ',') ~ '^([A-Z]{2})(,[A-Z]{2})*$'
  )
);

comment on table public.investor_profiles is
  'Private investor preferences. Only explicit safe projections may be shown to conversation participants.';

create trigger investor_profiles_set_updated_at
before update on public.investor_profiles
for each row execute function public.set_updated_at();

alter table public.investor_profiles enable row level security;
alter table public.investor_profiles force row level security;

create policy "investors read own profile"
on public.investor_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "investors create own profile"
on public.investor_profiles for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.role = 'investor'::public.account_role
      and accounts.suspended_at is null
  )
);

create policy "investors update own profile"
on public.investor_profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.accounts
    where accounts.id = (select auth.uid())
      and accounts.role = 'investor'::public.account_role
      and accounts.suspended_at is null
  )
);

revoke all on public.investor_profiles from anon, authenticated;
grant select, insert, update on public.investor_profiles to authenticated;

commit;
