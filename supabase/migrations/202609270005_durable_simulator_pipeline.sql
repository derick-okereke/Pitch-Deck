begin;

create type public.simulator_segment_kind as enum ('pitch', 'answer');

alter table public.simulator_sessions
  add column answered_question_count smallint not null default 0 check (answered_question_count between 0 and 2),
  add column retry_stage text,
  add column retry_count integer not null default 0 check (retry_count >= 0);

create table public.simulator_recordings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.simulator_sessions(id) on delete cascade,
  segment_kind public.simulator_segment_kind not null,
  question_index smallint,
  segment_slot smallint generated always as (coalesce(question_index, 0)) stored,
  storage_path text not null unique,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 20971520),
  duration_ms integer not null check (duration_ms > 0),
  transcript text,
  word_timestamps jsonb,
  segment_timestamps jsonb,
  word_count integer check (word_count >= 0),
  words_per_minute integer check (words_per_minute >= 0),
  filler_matches integer check (filler_matches >= 0),
  filler_token_count integer check (filler_token_count >= 0),
  filler_percent numeric(5,1) check (filler_percent between 0 and 100),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (segment_kind = 'pitch' and question_index is null and duration_ms between 30000 and 300000)
    or (segment_kind = 'answer' and question_index between 1 and 2 and duration_ms between 5000 and 90000)
  ),
  check (word_timestamps is null or jsonb_typeof(word_timestamps) = 'array'),
  check (segment_timestamps is null or jsonb_typeof(segment_timestamps) = 'array')
);

alter table public.simulator_recordings
  add constraint simulator_recordings_segment_unique unique (session_id, segment_kind, segment_slot);

create table public.simulator_questions (
  session_id uuid not null references public.simulator_sessions(id) on delete cascade,
  question_index smallint not null check (question_index between 1 and 2),
  persona_key public.simulator_persona_key not null,
  question text not null check (char_length(question) between 20 and 400),
  source_quote text not null check (char_length(source_quote) between 1 and 240),
  focus_category text not null check (focus_category in ('problem', 'solution', 'market', 'traction', 'business_model', 'ask')),
  prompt_version text not null,
  model_id text not null,
  created_at timestamptz not null default now(),
  primary key (session_id, question_index),
  unique (session_id, persona_key)
);

create table public.simulator_reports (
  session_id uuid primary key references public.simulator_sessions(id) on delete cascade,
  schema_version text not null,
  rubric_version text not null,
  prompt_version text not null,
  model_id text not null,
  categories jsonb not null check (jsonb_typeof(categories) = 'array'),
  persona_feedback jsonb not null check (jsonb_typeof(persona_feedback) = 'array'),
  session_points numeric(6,2) not null check (session_points between 0 and 100),
  delivery_points numeric(4,2) not null check (delivery_points between 0 and 10),
  created_at timestamptz not null default now()
);

alter table public.simulator_recordings enable row level security;
alter table public.simulator_questions enable row level security;
alter table public.simulator_reports enable row level security;

create policy "founders read own simulator recordings"
on public.simulator_recordings for select to authenticated
using (exists (select 1 from public.simulator_sessions s where s.id = session_id and s.founder_id = (select auth.uid())));

create policy "founders read own simulator questions"
on public.simulator_questions for select to authenticated
using (exists (select 1 from public.simulator_sessions s where s.id = session_id and s.founder_id = (select auth.uid())));

create policy "founders read own simulator reports"
on public.simulator_reports for select to authenticated
using (exists (select 1 from public.simulator_sessions s where s.id = session_id and s.founder_id = (select auth.uid())));

revoke all on public.simulator_recordings, public.simulator_questions, public.simulator_reports from anon, authenticated;
grant select on public.simulator_recordings, public.simulator_questions, public.simulator_reports to authenticated;

create or replace function public.begin_simulator_segment(
  p_founder_id uuid,
  p_session_id uuid,
  p_expected_version integer,
  p_segment_kind public.simulator_segment_kind,
  p_question_index smallint,
  p_storage_path text,
  p_mime_type text,
  p_byte_size integer,
  p_duration_ms integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.simulator_sessions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  select * into v_session from public.simulator_sessions where id = p_session_id and founder_id = p_founder_id for update;
  if v_session.id is null then raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND'; end if;
  if v_session.state_version <> p_expected_version then raise exception using errcode = 'P0001', message = 'SESSION_VERSION_CONFLICT'; end if;

  if p_segment_kind = 'pitch' then
    if not (v_session.state = 'ready' or (v_session.state = 'retryable_error' and v_session.retry_stage = 'pitch_processing')) then
      raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE';
    end if;
    if p_question_index is not null or p_duration_ms not between 30000 and 300000 then
      raise exception using errcode = '22023', message = 'INVALID_PITCH_RECORDING';
    end if;
  else
    if not (v_session.state = 'question_ready' or (v_session.state = 'retryable_error' and v_session.retry_stage = 'answer_processing')) then
      raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE';
    end if;
    if p_question_index <> v_session.answered_question_count + 1 or p_duration_ms not between 5000 and 90000 then
      raise exception using errcode = '22023', message = 'INVALID_ANSWER_RECORDING';
    end if;
  end if;

  insert into public.simulator_recordings (session_id, segment_kind, question_index, storage_path, mime_type, byte_size, duration_ms)
  values (p_session_id, p_segment_kind, p_question_index, p_storage_path, p_mime_type, p_byte_size, p_duration_ms)
  on conflict (session_id, segment_kind, segment_slot) do update
    set storage_path = excluded.storage_path,
        mime_type = excluded.mime_type,
        byte_size = excluded.byte_size,
        duration_ms = excluded.duration_ms
    where simulator_recordings.accepted_at is null;

  update public.simulator_sessions
    set state = case when p_segment_kind = 'pitch' then 'pitch_processing'::public.simulator_session_state else 'answer_processing'::public.simulator_session_state end,
        state_version = state_version + 1,
        retry_stage = null,
        failure_code = null
    where id = p_session_id
    returning state_version into v_session.state_version;
  return v_session.state_version;
end;
$$;

create or replace function public.complete_pitch_and_questions(
  p_session_id uuid,
  p_transcript text,
  p_words jsonb,
  p_segments jsonb,
  p_word_count integer,
  p_wpm integer,
  p_filler_matches integer,
  p_filler_token_count integer,
  p_filler_percent numeric,
  p_questions jsonb,
  p_prompt_version text,
  p_model_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.simulator_sessions%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> 2 then
    raise exception using errcode = '22023', message = 'TWO_QUESTIONS_REQUIRED';
  end if;
  select * into v_session from public.simulator_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND'; end if;
  if v_session.state <> 'pitch_processing' then raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE'; end if;

  update public.simulator_recordings set
    transcript = p_transcript, word_timestamps = p_words, segment_timestamps = p_segments,
    word_count = p_word_count, words_per_minute = p_wpm, filler_matches = p_filler_matches,
    filler_token_count = p_filler_token_count, filler_percent = p_filler_percent, accepted_at = now()
  where session_id = p_session_id and segment_kind = 'pitch' and question_index is null and accepted_at is null;
  if not found then raise exception using errcode = 'P0001', message = 'PITCH_RECORDING_NOT_PENDING'; end if;

  insert into public.simulator_questions (session_id, question_index, persona_key, question, source_quote, focus_category, prompt_version, model_id)
  select p_session_id, x.question_index, x.persona_key::public.simulator_persona_key, x.question, x.source_quote, x.focus_category, p_prompt_version, p_model_id
  from jsonb_to_recordset(p_questions) as x(question_index smallint, persona_key text, question text, source_quote text, focus_category text);
  if (select count(*) from public.simulator_questions where session_id = p_session_id) <> 2 then
    raise exception using errcode = '22023', message = 'TWO_QUESTIONS_REQUIRED';
  end if;

  update public.simulator_sessions
    set state = 'question_ready', state_version = state_version + 1, retry_stage = null, failure_code = null
    where id = p_session_id returning state_version into v_session.state_version;
  return v_session.state_version;
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
  select * into v_session from public.simulator_sessions where id = p_session_id for update;
  if v_session.id is null then raise exception using errcode = 'P0002', message = 'SESSION_NOT_FOUND'; end if;
  if v_session.state <> 'answer_processing' or p_question_index <> v_session.answered_question_count + 1 then
    raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE';
  end if;

  update public.simulator_recordings set
    transcript = p_transcript, word_timestamps = p_words, segment_timestamps = p_segments,
    word_count = p_word_count, words_per_minute = p_wpm, filler_matches = p_filler_matches,
    filler_token_count = p_filler_token_count, filler_percent = p_filler_percent, accepted_at = now()
  where session_id = p_session_id and segment_kind = 'answer' and question_index = p_question_index and accepted_at is null;
  if not found then raise exception using errcode = 'P0001', message = 'ANSWER_RECORDING_NOT_PENDING'; end if;

  update public.simulator_sessions set
    answered_question_count = p_question_index,
    state = case when p_question_index = 2 then 'ready_for_feedback'::public.simulator_session_state else 'question_ready'::public.simulator_session_state end,
    state_version = state_version + 1,
    retry_stage = null,
    failure_code = null
  where id = p_session_id returning * into v_session;
  return query select v_session.state, v_session.state_version, v_session.answered_question_count;
end;
$$;

create or replace function public.begin_simulator_feedback(p_founder_id uuid, p_session_id uuid, p_expected_version integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_version integer;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  update public.simulator_sessions set state = 'feedback_generating', state_version = state_version + 1, retry_stage = null, failure_code = null
  where id = p_session_id and founder_id = p_founder_id and state_version = p_expected_version
    and (state = 'ready_for_feedback' or (state = 'retryable_error' and retry_stage = 'feedback_generating'))
  returning state_version into v_version;
  if v_version is null then raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE'; end if;
  return v_version;
end;
$$;

create or replace function public.complete_simulator_feedback(
  p_session_id uuid,
  p_schema_version text,
  p_rubric_version text,
  p_prompt_version text,
  p_model_id text,
  p_categories jsonb,
  p_persona_feedback jsonb,
  p_session_points numeric,
  p_delivery_points numeric
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_version integer;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  perform 1 from public.simulator_sessions where id = p_session_id and state = 'feedback_generating' for update;
  if not found then raise exception using errcode = 'P0001', message = 'INVALID_SESSION_STATE'; end if;
  insert into public.simulator_reports (session_id, schema_version, rubric_version, prompt_version, model_id, categories, persona_feedback, session_points, delivery_points)
  values (p_session_id, p_schema_version, p_rubric_version, p_prompt_version, p_model_id, p_categories, p_persona_feedback, p_session_points, p_delivery_points)
  on conflict (session_id) do nothing;
  update public.usage_reservations set state = 'consumed' where session_id = p_session_id and state = 'reserved';
  update public.simulator_sessions set state = 'completed', state_version = state_version + 1, completed_at = now(), retry_stage = null, failure_code = null
  where id = p_session_id returning state_version into v_version;
  return v_version;
end;
$$;

create or replace function public.fail_simulator_stage(p_session_id uuid, p_expected_state public.simulator_session_state, p_error_code text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_version integer;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED'; end if;
  update public.simulator_sessions set
    state = 'retryable_error', state_version = state_version + 1, retry_stage = p_expected_state::text,
    retry_count = retry_count + 1, failure_code = left(p_error_code, 80)
  where id = p_session_id and state = p_expected_state and expires_at > now()
  returning state_version into v_version;
  return v_version;
end;
$$;

revoke all on function public.begin_simulator_segment(uuid, uuid, integer, public.simulator_segment_kind, smallint, text, text, integer, integer) from public;
revoke all on function public.complete_pitch_and_questions(uuid, text, jsonb, jsonb, integer, integer, integer, integer, numeric, jsonb, text, text) from public;
revoke all on function public.complete_simulator_answer(uuid, smallint, text, jsonb, jsonb, integer, integer, integer, integer, numeric) from public;
revoke all on function public.begin_simulator_feedback(uuid, uuid, integer) from public;
revoke all on function public.complete_simulator_feedback(uuid, text, text, text, text, jsonb, jsonb, numeric, numeric) from public;
revoke all on function public.fail_simulator_stage(uuid, public.simulator_session_state, text) from public;
grant execute on function public.begin_simulator_segment(uuid, uuid, integer, public.simulator_segment_kind, smallint, text, text, integer, integer) to service_role;
grant execute on function public.complete_pitch_and_questions(uuid, text, jsonb, jsonb, integer, integer, integer, integer, numeric, jsonb, text, text) to service_role;
grant execute on function public.complete_simulator_answer(uuid, smallint, text, jsonb, jsonb, integer, integer, integer, integer, numeric) to service_role;
grant execute on function public.begin_simulator_feedback(uuid, uuid, integer) to service_role;
grant execute on function public.complete_simulator_feedback(uuid, text, text, text, text, jsonb, jsonb, numeric, numeric) to service_role;
grant execute on function public.fail_simulator_stage(uuid, public.simulator_session_state, text) to service_role;

commit;
