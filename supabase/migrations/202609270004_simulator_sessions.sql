begin;

create type public.simulator_tier as enum ('free', 'pro');
create type public.simulator_session_state as enum (
  'preparing', 'ready', 'pitch_processing', 'pitch_transcribed', 'question_generating',
  'question_ready', 'answer_processing', 'ready_for_feedback', 'feedback_generating',
  'retryable_error', 'completed', 'failed', 'cancelled', 'expired'
);
create type public.simulator_persona_key as enum ('p1', 'p2', 'p3');
create type public.simulator_voice_style as enum ('warm-rigorous', 'direct-analytical', 'calm-strategic');
create type public.usage_reservation_state as enum ('reserved', 'consumed', 'released');

create table public.simulator_sessions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.accounts(id) on delete cascade,
  startup_id uuid not null references public.startups(id) on delete cascade,
  snapshot_revision_id uuid not null references public.profile_revisions(id) on delete restrict,
  tier_at_start public.simulator_tier not null,
  entitlement_source text not null,
  state public.simulator_session_state not null default 'preparing',
  state_version integer not null default 1 check (state_version > 0),
  consent_version text not null,
  expires_at timestamptz not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_code text,
  is_fixture boolean not null default false,
  idempotency_key uuid not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  unique (founder_id, idempotency_key)
);

create unique index simulator_one_active_per_founder_idx
on public.simulator_sessions (founder_id)
where state not in ('completed', 'failed', 'cancelled', 'expired');

create index simulator_sessions_founder_created_idx on public.simulator_sessions (founder_id, started_at desc);

create table public.simulator_personas (
  session_id uuid not null references public.simulator_sessions(id) on delete cascade,
  persona_key public.simulator_persona_key not null,
  name text not null check (char_length(name) between 2 and 80),
  title text not null check (char_length(title) between 5 and 120),
  focus text not null check (char_length(focus) between 20 and 240),
  voice_style public.simulator_voice_style not null,
  primary key (session_id, persona_key)
);

create table public.usage_reservations (
  session_id uuid primary key references public.simulator_sessions(id) on delete restrict,
  founder_id uuid not null references public.accounts(id) on delete cascade,
  state public.usage_reservation_state not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index usage_reservations_founder_state_idx on public.usage_reservations (founder_id, state);

alter table public.simulator_sessions enable row level security;
alter table public.simulator_personas enable row level security;
alter table public.usage_reservations enable row level security;

create policy "founders read own simulator sessions"
on public.simulator_sessions for select to authenticated
using (founder_id = (select auth.uid()));

create policy "founders read own simulator personas"
on public.simulator_personas for select to authenticated
using (
  exists (
    select 1 from public.simulator_sessions
    where simulator_sessions.id = simulator_personas.session_id
      and simulator_sessions.founder_id = (select auth.uid())
  )
);

create policy "founders read own usage reservations"
on public.usage_reservations for select to authenticated
using (founder_id = (select auth.uid()));

revoke all on public.simulator_sessions from anon, authenticated;
revoke all on public.simulator_personas from anon, authenticated;
revoke all on public.usage_reservations from anon, authenticated;
grant select on public.simulator_sessions, public.simulator_personas, public.usage_reservations to authenticated;

create or replace function public.start_simulator_session(
  p_founder_id uuid,
  p_startup_id uuid,
  p_draft_version integer,
  p_content_hash text,
  p_consent_version text,
  p_idempotency_key uuid,
  p_input_hash text
)
returns table (
  session_id uuid,
  session_state public.simulator_session_state,
  state_version integer,
  remaining_free integer,
  reused boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.accounts%rowtype;
  v_startup public.startups%rowtype;
  v_revision public.profile_revisions%rowtype;
  v_session public.simulator_sessions%rowtype;
  v_revision_number integer;
  v_used integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_account from public.accounts where id = p_founder_id for update;
  if v_account.id is null or v_account.role is distinct from 'founder'::public.account_role or v_account.suspended_at is not null then
    raise exception using errcode = '42501', message = 'FOUNDER_REQUIRED';
  end if;

  update public.simulator_sessions
    set state = 'expired', state_version = state_version + 1, failure_code = 'SESSION_EXPIRED'
    where founder_id = p_founder_id
      and state not in ('completed', 'failed', 'cancelled', 'expired')
      and expires_at <= now();
  update public.usage_reservations
    set state = 'released'
    where founder_id = p_founder_id
      and state = 'reserved'
      and expires_at <= now();

  select * into v_session
  from public.simulator_sessions
  where founder_id = p_founder_id and idempotency_key = p_idempotency_key;
  if v_session.id is not null then
    if v_session.input_hash <> p_input_hash then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    select count(*) into v_used from public.usage_reservations
      where founder_id = p_founder_id and state in ('reserved', 'consumed');
    return query select v_session.id, v_session.state, v_session.state_version, greatest(0, 3 - v_used), true;
    return;
  end if;

  if exists (
    select 1 from public.simulator_sessions
    where founder_id = p_founder_id and state not in ('completed', 'failed', 'cancelled', 'expired')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_SESSION_EXISTS';
  end if;

  select count(*) into v_used from public.usage_reservations
  where founder_id = p_founder_id and state in ('reserved', 'consumed');
  if v_used >= 3 then
    raise exception using errcode = 'P0001', message = 'FREE_SESSIONS_EXHAUSTED';
  end if;

  select * into v_startup from public.startups
  where id = p_startup_id and founder_id = p_founder_id
  for update;
  if v_startup.id is null then raise exception using errcode = 'P0002', message = 'STARTUP_NOT_FOUND'; end if;
  if v_startup.draft_version <> p_draft_version then
    raise exception using errcode = 'P0001', message = 'DRAFT_VERSION_CONFLICT';
  end if;

  select * into v_revision from public.profile_revisions
  where startup_id = v_startup.id and content_hash = p_content_hash;
  if v_revision.id is null then
    select coalesce(max(revision_number), 0) + 1 into v_revision_number
    from public.profile_revisions where startup_id = v_startup.id;
    insert into public.profile_revisions (startup_id, revision_number, draft_version, content_hash, payload)
    values (v_startup.id, v_revision_number, v_startup.draft_version, p_content_hash, v_startup.draft_payload)
    returning * into v_revision;
  end if;

  insert into public.simulator_sessions (
    founder_id, startup_id, snapshot_revision_id, tier_at_start, entitlement_source,
    consent_version, expires_at, idempotency_key, input_hash, is_fixture
  ) values (
    p_founder_id, v_startup.id, v_revision.id, 'free', 'free-plan',
    p_consent_version, now() + interval '30 minutes', p_idempotency_key, p_input_hash, false
  ) returning * into v_session;

  insert into public.usage_reservations (session_id, founder_id, state, expires_at)
  values (v_session.id, p_founder_id, 'reserved', v_session.expires_at);

  return query select v_session.id, v_session.state, v_session.state_version, greatest(0, 2 - v_used), false;
end;
$$;

create or replace function public.complete_simulator_preparation(
  p_session_id uuid,
  p_personas jsonb
)
returns table (session_state public.simulator_session_state, state_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.simulator_sessions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  if jsonb_typeof(p_personas) <> 'array' or jsonb_array_length(p_personas) <> 3 then
    raise exception using errcode = '22023', message = 'INVALID_PERSONAS';
  end if;
  select * into v_session from public.simulator_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND'; end if;
  if v_session.state = 'ready' then return query select v_session.state, v_session.state_version; return; end if;
  if v_session.state <> 'preparing' then raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE'; end if;

  insert into public.simulator_personas (session_id, persona_key, name, title, focus, voice_style)
  select p_session_id, x.persona_key::public.simulator_persona_key, x.name, x.title, x.focus, x.voice_style::public.simulator_voice_style
  from jsonb_to_recordset(p_personas) as x(persona_key text, name text, title text, focus text, voice_style text);

  if (select count(*) from public.simulator_personas where session_id = p_session_id) <> 3 then
    raise exception using errcode = '22023', message = 'INVALID_PERSONAS';
  end if;

  update public.simulator_sessions
    set state = 'ready',
        state_version = state_version + 1,
        expires_at = least(started_at + interval '60 minutes', now() + interval '30 minutes')
    where id = p_session_id
    returning * into v_session;
  update public.usage_reservations set expires_at = v_session.expires_at where session_id = p_session_id;
  return query select v_session.state, v_session.state_version;
end;
$$;

create or replace function public.fail_simulator_preparation(
  p_session_id uuid,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  update public.simulator_sessions
    set state = 'failed', state_version = state_version + 1, failure_code = left(p_error_code, 80)
    where id = p_session_id and state = 'preparing';
  update public.usage_reservations set state = 'released'
    where session_id = p_session_id and state = 'reserved';
end;
$$;

create or replace function public.cancel_simulator_session(
  p_founder_id uuid,
  p_session_id uuid,
  p_expected_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  update public.simulator_sessions
    set state = 'cancelled', state_version = state_version + 1, failure_code = null
    where id = p_session_id
      and founder_id = p_founder_id
      and state_version = p_expected_version
      and state not in ('completed', 'failed', 'cancelled', 'expired')
    returning state_version into v_version;
  if v_version is null then raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE'; end if;
  update public.usage_reservations set state = 'released'
    where session_id = p_session_id and state = 'reserved';
  return v_version;
end;
$$;

revoke all on function public.start_simulator_session(uuid, uuid, integer, text, text, uuid, text) from public;
revoke all on function public.complete_simulator_preparation(uuid, jsonb) from public;
revoke all on function public.fail_simulator_preparation(uuid, text) from public;
revoke all on function public.cancel_simulator_session(uuid, uuid, integer) from public;
grant execute on function public.start_simulator_session(uuid, uuid, integer, text, text, uuid, text) to service_role;
grant execute on function public.complete_simulator_preparation(uuid, jsonb) to service_role;
grant execute on function public.fail_simulator_preparation(uuid, text) to service_role;
grant execute on function public.cancel_simulator_session(uuid, uuid, integer) to service_role;

commit;

