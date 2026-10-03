begin;

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
  v_is_pro boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_account from public.accounts where id = p_founder_id for update;
  if v_account.id is null or v_account.role is distinct from 'founder'::public.account_role or v_account.suspended_at is not null then
    raise exception using errcode = '42501', message = 'FOUNDER_REQUIRED';
  end if;
  v_is_pro := public.founder_has_active_pro(p_founder_id);

  update public.simulator_sessions as s
    set state = 'expired', state_version = s.state_version + 1, failure_code = 'SESSION_EXPIRED'
    where s.founder_id = p_founder_id
      and s.state not in ('completed', 'failed', 'cancelled', 'expired')
      and s.expires_at <= now();
  update public.usage_reservations as r
    set state = 'released'
    where r.founder_id = p_founder_id and r.state = 'reserved' and r.expires_at <= now();

  select * into v_session
  from public.simulator_sessions as s
  where s.founder_id = p_founder_id and s.idempotency_key = p_idempotency_key;
  if v_session.id is not null then
    if v_session.input_hash <> p_input_hash then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    select count(*) into v_used from public.usage_reservations as r
      where r.founder_id = p_founder_id and r.state in ('reserved', 'consumed');
    return query select v_session.id, v_session.state, v_session.state_version, greatest(0, 3 - v_used), true;
    return;
  end if;

  if exists (
    select 1 from public.simulator_sessions as s
    where s.founder_id = p_founder_id and s.state not in ('completed', 'failed', 'cancelled', 'expired')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_SESSION_EXISTS';
  end if;

  select count(*) into v_used from public.usage_reservations as r
  where r.founder_id = p_founder_id and r.state in ('reserved', 'consumed');
  if not v_is_pro and v_used >= 3 then
    raise exception using errcode = 'P0001', message = 'FREE_SESSIONS_EXHAUSTED';
  end if;

  select * into v_startup from public.startups as s
  where s.id = p_startup_id and s.founder_id = p_founder_id
  for update;
  if v_startup.id is null then raise exception using errcode = 'P0002', message = 'STARTUP_NOT_FOUND'; end if;
  if v_startup.draft_version <> p_draft_version then
    raise exception using errcode = 'P0001', message = 'DRAFT_VERSION_CONFLICT';
  end if;

  select * into v_revision from public.profile_revisions as r
  where r.startup_id = v_startup.id and r.content_hash = p_content_hash;
  if v_revision.id is null then
    select coalesce(max(r.revision_number), 0) + 1 into v_revision_number
    from public.profile_revisions as r where r.startup_id = v_startup.id;
    insert into public.profile_revisions (startup_id, revision_number, draft_version, content_hash, payload)
    values (v_startup.id, v_revision_number, v_startup.draft_version, p_content_hash, v_startup.draft_payload)
    returning * into v_revision;
  end if;

  insert into public.simulator_sessions (
    founder_id, startup_id, snapshot_revision_id, tier_at_start, entitlement_source,
    consent_version, expires_at, idempotency_key, input_hash, is_fixture
  ) values (
    p_founder_id, v_startup.id, v_revision.id,
    case when v_is_pro then 'pro'::public.simulator_tier else 'free'::public.simulator_tier end,
    case when v_is_pro then 'bachs-sandbox' else 'free-plan' end,
    p_consent_version, now() + interval '30 minutes', p_idempotency_key, p_input_hash, false
  ) returning * into v_session;

  if not v_is_pro then
    insert into public.usage_reservations (session_id, founder_id, state, expires_at)
    values (v_session.id, p_founder_id, 'reserved', v_session.expires_at);
  end if;

  return query select v_session.id, v_session.state, v_session.state_version, greatest(0, 3 - v_used - case when v_is_pro then 0 else 1 end), false;
end;
$$;

revoke all on function public.start_simulator_session(uuid, uuid, integer, text, text, uuid, text) from public;
grant execute on function public.start_simulator_session(uuid, uuid, integer, text, text, uuid, text) to service_role;

commit;
