begin;

alter table public.accounts
  add column organization_name text
  check (organization_name is null or char_length(trim(organization_name)) between 2 and 120);

comment on column public.accounts.organization_name is
  'Founder startup name or investor firm/organization collected during first-run setup.';

grant update (organization_name) on public.accounts to authenticated;

commit;
