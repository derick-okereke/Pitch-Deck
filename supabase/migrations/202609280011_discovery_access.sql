begin;

create table public.investor_detail_views (
  investor_id uuid not null references public.accounts(id) on delete cascade,
  startup_id uuid not null references public.startups(id) on delete cascade,
  view_month date not null,
  first_viewed_at timestamptz not null default now(),
  primary key (investor_id, startup_id, view_month)
);

create index investor_detail_views_month_idx
  on public.investor_detail_views (investor_id, view_month, first_viewed_at);

alter table public.investor_detail_views enable row level security;
alter table public.investor_detail_views force row level security;
revoke all on public.investor_detail_views from anon, authenticated;

create or replace function public.reserve_investor_detail_view(
  p_investor_id uuid,
  p_startup_id uuid,
  p_demo_mode boolean,
  p_limit integer default 20
)
returns table (allowed boolean, consumed boolean, used_count integer, view_limit integer, reset_at timestamptz, demo_pro boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.accounts%rowtype;
  v_month date := date_trunc('month', now() at time zone 'UTC')::date;
  v_reset timestamptz := (date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC';
  v_used integer;
  v_demo_pro boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_limit < 1 or p_limit > 1000 then
    raise exception using errcode = '22023', message = 'INVALID_DETAIL_LIMIT';
  end if;

  select * into v_account from public.accounts where id = p_investor_id for update;
  if v_account.id is null or v_account.role is distinct from 'investor'::public.account_role or v_account.suspended_at is not null then
    raise exception using errcode = '42501', message = 'INVESTOR_REQUIRED';
  end if;
  if not exists (
    select 1 from public.startups
    where id = p_startup_id
      and publication_status = 'published'::public.startup_publication_status
      and published_revision_id is not null
  ) then
    raise exception using errcode = 'P0002', message = 'STARTUP_NOT_FOUND';
  end if;

  v_demo_pro := p_demo_mode and exists (
    select 1 from public.demo_entitlements
    where account_id = p_investor_id
      and role = 'investor'::public.account_role
      and tier = 'pro'
      and expires_at > now()
  );
  select count(*)::integer into v_used
  from public.investor_detail_views
  where investor_id = p_investor_id and view_month = v_month;

  if v_demo_pro then
    return query select true, false, v_used, p_limit, v_reset, true;
    return;
  end if;
  if exists (
    select 1 from public.investor_detail_views
    where investor_id = p_investor_id and startup_id = p_startup_id and view_month = v_month
  ) then
    return query select true, false, v_used, p_limit, v_reset, false;
    return;
  end if;
  if v_used >= p_limit then
    return query select false, false, v_used, p_limit, v_reset, false;
    return;
  end if;

  insert into public.investor_detail_views (investor_id, startup_id, view_month)
  values (p_investor_id, p_startup_id, v_month);
  return query select true, true, v_used + 1, p_limit, v_reset, false;
end;
$$;

revoke all on function public.reserve_investor_detail_view(uuid, uuid, boolean, integer) from public;
grant execute on function public.reserve_investor_detail_view(uuid, uuid, boolean, integer) to service_role;

commit;
