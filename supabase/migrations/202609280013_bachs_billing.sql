begin;

create type public.billing_checkout_state as enum ('creating', 'open', 'pending_verification', 'completed', 'expired', 'cancelled', 'failed');
create type public.billing_subscription_state as enum ('pending', 'active', 'past_due', 'unpaid', 'cancelled', 'expired');
create type public.billing_webhook_state as enum ('received', 'processed', 'ignored', 'quarantined', 'failed');

create table public.billing_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  idempotency_key uuid not null,
  reference text not null unique check (char_length(reference) between 8 and 128),
  provider_checkout_id text unique,
  provider_customer_id text,
  provider_subscription_id text,
  state public.billing_checkout_state not null default 'creating',
  environment text not null check (environment = 'sandbox'),
  product_id text not null,
  currency text not null check (currency = 'USD'),
  amount_minor integer not null check (amount_minor = 300),
  checkout_url text,
  expires_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, idempotency_key)
);

create table public.billing_subscriptions (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  provider_subscription_id text not null unique,
  provider_customer_id text not null,
  source_checkout_id text not null unique,
  environment text not null check (environment = 'sandbox'),
  product_id text not null,
  currency text not null check (currency = 'USD'),
  amount_minor integer not null check (amount_minor = 300),
  status public.billing_subscription_state not null,
  current_period_start timestamptz,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  revoked_at timestamptz,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_webhook_receipts (
  provider_event_id text primary key,
  event_type text not null,
  environment text not null check (environment = 'sandbox'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  state public.billing_webhook_state not null default 'received',
  error_code text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index billing_checkout_account_created_idx on public.billing_checkout_attempts (account_id, created_at desc);
create index billing_subscription_period_idx on public.billing_subscriptions (status, current_period_end);
create index billing_webhook_state_received_idx on public.billing_webhook_receipts (state, received_at);

create trigger billing_checkout_set_updated_at
before update on public.billing_checkout_attempts
for each row execute function public.set_updated_at();

create trigger billing_subscription_set_updated_at
before update on public.billing_subscriptions
for each row execute function public.set_updated_at();

alter table public.billing_checkout_attempts enable row level security;
alter table public.billing_checkout_attempts force row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_subscriptions force row level security;
alter table public.billing_webhook_receipts enable row level security;
alter table public.billing_webhook_receipts force row level security;

create policy "founders read own checkout attempts"
on public.billing_checkout_attempts for select to authenticated
using ((select auth.uid()) = account_id);

create policy "founders read own subscription"
on public.billing_subscriptions for select to authenticated
using ((select auth.uid()) = account_id);

revoke all on public.billing_checkout_attempts, public.billing_subscriptions, public.billing_webhook_receipts from anon, authenticated;
grant select on public.billing_checkout_attempts, public.billing_subscriptions to authenticated;

create or replace function public.founder_has_active_pro(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.billing_subscriptions as s
    join public.accounts as a on a.id = s.account_id
    where s.account_id = p_account_id
      and a.role = 'founder'::public.account_role
      and a.suspended_at is null
      and s.environment = 'sandbox'
      and s.status in ('active'::public.billing_subscription_state, 'past_due'::public.billing_subscription_state)
      and s.current_period_end > now()
      and s.revoked_at is null
  );
$$;

create or replace function public.activate_bachs_founder_subscription(
  p_event_id text,
  p_checkout_id text,
  p_customer_id text,
  p_subscription_id text,
  p_product_id text,
  p_currency text,
  p_amount_minor integer,
  p_status public.billing_subscription_state,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.billing_checkout_attempts%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_attempt
  from public.billing_checkout_attempts as c
  where c.provider_checkout_id = p_checkout_id
  for update;

  if v_attempt.id is null then
    raise exception using errcode = 'P0002', message = 'CHECKOUT_NOT_FOUND';
  end if;
  if v_attempt.environment <> 'sandbox'
     or v_attempt.product_id <> p_product_id
     or v_attempt.currency <> p_currency
     or v_attempt.amount_minor <> p_amount_minor then
    raise exception using errcode = 'P0001', message = 'CHECKOUT_BINDING_MISMATCH';
  end if;
  if p_period_end <= now() or p_period_end <= coalesce(p_period_start, '-infinity'::timestamptz) then
    raise exception using errcode = '22023', message = 'INVALID_PAID_PERIOD';
  end if;

  insert into public.billing_subscriptions (
    account_id, provider_subscription_id, provider_customer_id, source_checkout_id,
    environment, product_id, currency, amount_minor, status, current_period_start,
    current_period_end, cancel_at_period_end, revoked_at, verified_at
  ) values (
    v_attempt.account_id, p_subscription_id, p_customer_id, p_checkout_id,
    'sandbox', p_product_id, p_currency, p_amount_minor, p_status, p_period_start,
    p_period_end, p_cancel_at_period_end,
    case when p_status in ('cancelled'::public.billing_subscription_state, 'expired'::public.billing_subscription_state) then now() else null end,
    now()
  )
  on conflict (account_id) do update set
    provider_subscription_id = excluded.provider_subscription_id,
    provider_customer_id = excluded.provider_customer_id,
    source_checkout_id = excluded.source_checkout_id,
    product_id = excluded.product_id,
    currency = excluded.currency,
    amount_minor = excluded.amount_minor,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = greatest(public.billing_subscriptions.current_period_end, excluded.current_period_end),
    cancel_at_period_end = excluded.cancel_at_period_end,
    revoked_at = excluded.revoked_at,
    verified_at = now();

  update public.billing_checkout_attempts
  set state = 'completed', provider_customer_id = p_customer_id,
      provider_subscription_id = p_subscription_id, checkout_url = null, error_code = null
  where id = v_attempt.id;

  update public.billing_webhook_receipts
  set state = 'processed', error_code = null, processed_at = now()
  where provider_event_id = p_event_id;

  return v_attempt.account_id;
end;
$$;

create or replace function public.update_bachs_founder_subscription(
  p_event_id text,
  p_subscription_id text,
  p_status public.billing_subscription_state,
  p_period_start timestamptz,
  p_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  update public.billing_subscriptions as s
  set status = p_status,
      current_period_start = coalesce(p_period_start, s.current_period_start),
      current_period_end = case
        when p_period_end is null then s.current_period_end
        else greatest(s.current_period_end, p_period_end)
      end,
      cancel_at_period_end = p_cancel_at_period_end,
      revoked_at = case
        when p_status in ('cancelled'::public.billing_subscription_state, 'expired'::public.billing_subscription_state) then now()
        else null
      end,
      verified_at = now()
  where s.provider_subscription_id = p_subscription_id
  returning s.account_id into v_account_id;

  if v_account_id is null then
    raise exception using errcode = 'P0002', message = 'SUBSCRIPTION_NOT_FOUND';
  end if;

  update public.billing_webhook_receipts
  set state = 'processed', error_code = null, processed_at = now()
  where provider_event_id = p_event_id;
  return v_account_id;
end;
$$;

revoke all on function public.founder_has_active_pro(uuid) from public;
revoke all on function public.activate_bachs_founder_subscription(text, text, text, text, text, text, integer, public.billing_subscription_state, timestamptz, timestamptz, boolean) from public;
revoke all on function public.update_bachs_founder_subscription(text, text, public.billing_subscription_state, timestamptz, timestamptz, boolean) from public;
grant execute on function public.founder_has_active_pro(uuid) to service_role;
grant execute on function public.activate_bachs_founder_subscription(text, text, text, text, text, text, integer, public.billing_subscription_state, timestamptz, timestamptz, boolean) to service_role;
grant execute on function public.update_bachs_founder_subscription(text, text, public.billing_subscription_state, timestamptz, timestamptz, boolean) to service_role;

commit;
