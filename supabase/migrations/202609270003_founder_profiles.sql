begin;

create type public.startup_publication_status as enum ('draft', 'published', 'unpublished');
create type public.profile_review_state as enum ('reviewing', 'needs_improvement', 'passed', 'review_failed');

create table public.startups (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null unique references public.accounts(id) on delete cascade,
  draft_payload jsonb not null,
  draft_version integer not null default 1 check (draft_version > 0),
  published_revision_id uuid,
  publication_status public.startup_publication_status not null default 'draft',
  selected_audio_session_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(draft_payload) = 'object')
);

create table public.profile_revisions (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups(id) on delete cascade,
  revision_number integer not null check (revision_number > 0),
  draft_version integer not null check (draft_version > 0),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (startup_id, revision_number),
  unique (startup_id, content_hash),
  check (jsonb_typeof(payload) = 'object')
);

alter table public.startups
  add constraint startups_published_revision_fk
  foreign key (published_revision_id) references public.profile_revisions(id) on delete set null;

create table public.profile_reviews (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.profile_revisions(id) on delete cascade,
  rubric_version text not null,
  model_id text,
  prompt_version text not null,
  operation_id uuid not null default gen_random_uuid(),
  state public.profile_review_state not null default 'reviewing',
  ratings jsonb,
  evidence jsonb,
  flags jsonb,
  content_points numeric(5,2) check (content_points between 0 and 90),
  error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (revision_id, rubric_version),
  check (ratings is null or jsonb_typeof(ratings) = 'array'),
  check (evidence is null or jsonb_typeof(evidence) = 'array'),
  check (flags is null or jsonb_typeof(flags) = 'array')
);

create index profile_revisions_startup_created_idx on public.profile_revisions (startup_id, created_at desc);
create index profile_reviews_revision_idx on public.profile_reviews (revision_id);

create trigger startups_set_updated_at
before update on public.startups
for each row execute function public.set_updated_at();

alter table public.startups enable row level security;
alter table public.profile_revisions enable row level security;
alter table public.profile_reviews enable row level security;

create policy "founders read own startup"
on public.startups for select
to authenticated
using (founder_id = (select auth.uid()));

create policy "founders read own revisions"
on public.profile_revisions for select
to authenticated
using (
  exists (
    select 1 from public.startups
    where startups.id = profile_revisions.startup_id
      and startups.founder_id = (select auth.uid())
  )
);

create policy "founders read own reviews"
on public.profile_reviews for select
to authenticated
using (
  exists (
    select 1
    from public.profile_revisions
    join public.startups on startups.id = profile_revisions.startup_id
    where profile_revisions.id = profile_reviews.revision_id
      and startups.founder_id = (select auth.uid())
  )
);

revoke all on public.startups from anon, authenticated;
revoke all on public.profile_revisions from anon, authenticated;
revoke all on public.profile_reviews from anon, authenticated;
grant select on public.startups to authenticated;
grant select on public.profile_revisions to authenticated;
grant select on public.profile_reviews to authenticated;

create or replace function public.save_founder_draft(
  p_founder_id uuid,
  p_expected_version integer,
  p_payload jsonb
)
returns table (startup_id uuid, draft_version integer, saved_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.accounts%rowtype;
  v_startup public.startups%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_account
  from public.accounts
  where id = p_founder_id;

  if v_account.id is null or v_account.role is distinct from 'founder'::public.account_role or v_account.suspended_at is not null then
    raise exception using errcode = '42501', message = 'FOUNDER_REQUIRED';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_PROFILE';
  end if;

  if p_expected_version = 0 then
    begin
      insert into public.startups (founder_id, draft_payload, draft_version, is_demo)
      values (v_account.id, p_payload, 1, v_account.is_demo)
      returning * into v_startup;
    exception when unique_violation then
      raise exception using errcode = 'P0001', message = 'DRAFT_VERSION_CONFLICT';
    end;
  else
    update public.startups
      set draft_payload = p_payload,
          draft_version = draft_version + 1,
          updated_at = now()
      where founder_id = v_account.id
        and draft_version = p_expected_version
      returning * into v_startup;

    if v_startup.id is null then
      raise exception using errcode = 'P0001', message = 'DRAFT_VERSION_CONFLICT';
    end if;
  end if;

  return query select v_startup.id, v_startup.draft_version, v_startup.updated_at;
end;
$$;

create or replace function public.begin_profile_review(
  p_founder_id uuid,
  p_startup_id uuid,
  p_draft_version integer,
  p_content_hash text,
  p_rubric_version text,
  p_prompt_version text
)
returns table (review_id uuid, revision_id uuid, review_state public.profile_review_state, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_startup public.startups%rowtype;
  v_revision public.profile_revisions%rowtype;
  v_review public.profile_reviews%rowtype;
  v_revision_number integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_startup
  from public.startups
  where id = p_startup_id
    and founder_id = p_founder_id
  for update;

  if v_startup.id is null then
    raise exception using errcode = 'P0002', message = 'STARTUP_NOT_FOUND';
  end if;
  if v_startup.draft_version <> p_draft_version then
    raise exception using errcode = 'P0001', message = 'DRAFT_VERSION_CONFLICT';
  end if;
  if p_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_CONTENT_HASH';
  end if;

  select * into v_revision
  from public.profile_revisions
  where startup_id = v_startup.id and content_hash = p_content_hash;

  if v_revision.id is null then
    select coalesce(max(revision_number), 0) + 1 into v_revision_number
    from public.profile_revisions where startup_id = v_startup.id;

    insert into public.profile_revisions (startup_id, revision_number, draft_version, content_hash, payload)
    values (v_startup.id, v_revision_number, v_startup.draft_version, p_content_hash, v_startup.draft_payload)
    returning * into v_revision;
  end if;

  select * into v_review
  from public.profile_reviews
  where revision_id = v_revision.id and rubric_version = p_rubric_version;

  if v_review.id is not null and v_review.state = 'review_failed' then
    update public.profile_reviews
      set state = 'reviewing', error_code = null, completed_at = null
      where id = v_review.id
      returning * into v_review;
    return query select v_review.id, v_revision.id, v_review.state, false;
    return;
  end if;

  if v_review.id is not null then
    return query select v_review.id, v_revision.id, v_review.state, true;
    return;
  end if;

  insert into public.profile_reviews (revision_id, rubric_version, prompt_version)
  values (v_revision.id, p_rubric_version, p_prompt_version)
  returning * into v_review;

  return query select v_review.id, v_revision.id, v_review.state, false;
end;
$$;

create or replace function public.complete_profile_review(
  p_review_id uuid,
  p_model_id text,
  p_ratings jsonb,
  p_evidence jsonb,
  p_flags jsonb,
  p_content_points numeric
)
returns table (published boolean, reviewed_earlier_draft boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.profile_reviews%rowtype;
  v_revision public.profile_revisions%rowtype;
  v_startup public.startups%rowtype;
  v_passed boolean;
  v_current boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_content_points < 0 or p_content_points > 90 then
    raise exception using errcode = '22023', message = 'INVALID_CONTENT_POINTS';
  end if;

  select * into v_review from public.profile_reviews where id = p_review_id for update;
  if v_review.id is null then raise exception using errcode = 'P0002', message = 'REVIEW_NOT_FOUND'; end if;
  if v_review.state <> 'reviewing' then
    select * into v_revision from public.profile_revisions where id = v_review.revision_id;
    select * into v_startup from public.startups where id = v_revision.startup_id;
    return query select v_startup.published_revision_id = v_revision.id, v_startup.draft_version <> v_revision.draft_version;
    return;
  end if;

  select * into v_revision from public.profile_revisions where id = v_review.revision_id;
  select * into v_startup from public.startups where id = v_revision.startup_id for update;
  v_passed := p_content_points >= 50;
  v_current := v_startup.draft_version = v_revision.draft_version;

  update public.profile_reviews
    set model_id = p_model_id,
        state = case when v_passed then 'passed'::public.profile_review_state else 'needs_improvement'::public.profile_review_state end,
        ratings = p_ratings,
        evidence = p_evidence,
        flags = p_flags,
        content_points = p_content_points,
        error_code = null,
        completed_at = now()
    where id = v_review.id;

  if v_passed and v_current then
    update public.startups
      set published_revision_id = v_revision.id,
          publication_status = 'published',
          selected_audio_session_id = null,
          updated_at = now()
      where id = v_startup.id;
  end if;

  return query select v_passed and v_current, not v_current;
end;
$$;

create or replace function public.fail_profile_review(
  p_review_id uuid,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  update public.profile_reviews
    set state = 'review_failed',
        error_code = left(p_error_code, 80),
        completed_at = now()
    where id = p_review_id and state = 'reviewing';
end;
$$;

revoke all on function public.save_founder_draft(uuid, integer, jsonb) from public;
revoke all on function public.begin_profile_review(uuid, uuid, integer, text, text, text) from public;
revoke all on function public.complete_profile_review(uuid, text, jsonb, jsonb, jsonb, numeric) from public;
revoke all on function public.fail_profile_review(uuid, text) from public;
grant execute on function public.save_founder_draft(uuid, integer, jsonb) to service_role;
grant execute on function public.begin_profile_review(uuid, uuid, integer, text, text, text) to service_role;
grant execute on function public.complete_profile_review(uuid, text, jsonb, jsonb, jsonb, numeric) to service_role;
grant execute on function public.fail_profile_review(uuid, text) to service_role;

commit;

