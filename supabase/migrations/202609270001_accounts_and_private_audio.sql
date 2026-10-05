begin;

create type public.account_role as enum ('founder', 'investor');

create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role,
  display_name text not null check (char_length(display_name) between 2 and 80),
  onboarding_completed_at timestamptz,
  suspended_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_role_matches_onboarding check (
    (role is null and onboarding_completed_at is null)
    or (role is not null and onboarding_completed_at is not null)
  )
);

comment on table public.accounts is 'Private application account attached one-to-one to auth.users.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role public.account_role;
  selected_name text;
begin
  selected_role := case
    when new.raw_user_meta_data ->> 'role' in ('founder', 'investor')
      then (new.raw_user_meta_data ->> 'role')::public.account_role
    else null
  end;
  selected_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.accounts (id, role, display_name, onboarding_completed_at)
  values (
    new.id,
    selected_role,
    left(coalesce(selected_name, 'Peekytoe member'), 80),
    case when selected_role is null then null else now() end
  );
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.accounts enable row level security;
alter table public.accounts force row level security;

create policy "account owner can read own account"
on public.accounts for select
to authenticated
using ((select auth.uid()) = id);

create policy "account owner can update own allowed columns"
on public.accounts for update
to authenticated
using ((select auth.uid()) = id and suspended_at is null)
with check ((select auth.uid()) = id);

revoke all on public.accounts from anon, authenticated;
grant select on public.accounts to authenticated;
grant update (display_name) on public.accounts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pitch-audio',
  'pitch-audio',
  false,
  20971520,
  array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners can read private pitch audio"
on storage.objects for select
to authenticated
using (bucket_id = 'pitch-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "owners can upload private pitch audio"
on storage.objects for insert
to authenticated
with check (bucket_id = 'pitch-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "owners can delete private pitch audio"
on storage.objects for delete
to authenticated
using (bucket_id = 'pitch-audio' and (storage.foldername(name))[1] = (select auth.uid()::text));

commit;
