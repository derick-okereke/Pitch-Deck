begin;

-- These functions return a column named state_version. In PL/pgSQL that name is
-- also an output variable, so every unqualified state_version reference inside
-- the function is ambiguous. Qualify the table-side references explicitly.

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

  update public.simulator_sessions as s
    set state = 'expired', state_version = s.state_version + 1, failure_code = 'SESSION_EXPIRED'
    where s.founder_id = p_founder_id
      and s.state not in ('completed', 'failed', 'cancelled', 'expired')
      and s.expires_at <= now();
  update public.usage_reservations as r
    set state = 'released'
    where r.founder_id = p_founder_id
      and r.state = 'reserved'
      and r.expires_at <= now();

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
  if v_used >= 3 then
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
  select * into v_session from public.simulator_sessions as s where s.id = p_session_id for update;
  if v_session.id is null then raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND'; end if;
  if v_session.state = 'ready' then return query select v_session.state, v_session.state_version; return; end if;
  if v_session.state <> 'preparing' then raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE'; end if;

  insert into public.simulator_personas (session_id, persona_key, name, title, focus, voice_style)
  select p_session_id, x.persona_key::public.simulator_persona_key, x.name, x.title, x.focus, x.voice_style::public.simulator_voice_style
  from jsonb_to_recordset(p_personas) as x(persona_key text, name text, title text, focus text, voice_style text);

  if (select count(*) from public.simulator_personas as p where p.session_id = p_session_id) <> 3 then
    raise exception using errcode = '22023', message = 'INVALID_PERSONAS';
  end if;

  update public.simulator_sessions as s
    set state = 'ready',
        state_version = s.state_version + 1,
        expires_at = least(s.started_at + interval '60 minutes', now() + interval '30 minutes')
    where s.id = p_session_id
    returning * into v_session;
  update public.usage_reservations as r set expires_at = v_session.expires_at where r.session_id = p_session_id;
  return query select v_session.state, v_session.state_version;
end;
$$;

create or replace function public.complete_simulator_answer(
  p_session_id uuid,
  p_question_index smallint,
  p_transcript text,
  p_words jsonb,
  p_segments jsonb,
  p_word_count integer,
  p_wpm integer,
  p_filler_matches integer,
  p_filler_token_count integer,
  p_filler_percent numeric
)
returns table (session_state public.simulator_session_state, state_version integer, answered_question_count smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.simulator_sessions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_session from public.simulator_sessions as s where s.id = p_session_id for update;
  if v_session.id is null then raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND'; end if;
  if v_session.state <> 'answer_processing' or p_question_index <> v_session.answered_question_count + 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE';
  end if;

  update public.simulator_recordings as r set
    transcript = p_transcript, word_timestamps = p_words, segment_timestamps = p_segments,
    word_count = p_word_count, words_per_minute = p_wpm, filler_matches = p_filler_matches,
    filler_token_count = p_filler_token_count, filler_percent = p_filler_percent, accepted_at = now()
  where r.session_id = p_session_id and r.segment_kind = 'answer' and r.question_index = p_question_index and r.accepted_at is null;
  if not found then raise exception using errcode = 'P0001', message = 'ANSWER_RECORDING_NOT_PENDING'; end if;

  update public.simulator_sessions as s set
    answered_question_count = p_question_index,
    state = case when p_question_index = 2 then 'ready_for_feedback'::public.simulator_session_state else 'question_ready'::public.simulator_session_state end,
    state_version = s.state_version + 1,
    retry_stage = null,
    failure_code = null
  where s.id = p_session_id returning * into v_session;
  return query select v_session.state, v_session.state_version, v_session.answered_question_count;
end;
$$;

revoke all on function public.start_simulator_session(uuid, uuid, integer, text, text, uuid, text) from public;
revoke all on function public.complete_simulator_preparation(uuid, jsonb) from public;
revoke all on function public.complete_simulator_answer(uuid, smallint, text, jsonb, jsonb, integer, integer, integer, integer, numeric) from public;
grant execute on function public.start_simulator_session(uuid, uuid, integer, text, text, uuid, text) to service_role;
grant execute on function public.complete_simulator_preparation(uuid, jsonb) to service_role;
grant execute on function public.complete_simulator_answer(uuid, smallint, text, jsonb, jsonb, integer, integer, integer, integer, numeric) to service_role;

commit;
