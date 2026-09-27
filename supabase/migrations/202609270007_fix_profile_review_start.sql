begin;

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
#variable_conflict use_column
declare
  v_startup public.startups%rowtype;
  v_revision public.profile_revisions%rowtype;
  v_review public.profile_reviews%rowtype;
  v_revision_number integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select s.* into v_startup
  from public.startups as s
  where s.id = p_startup_id
    and s.founder_id = p_founder_id
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

  select r.* into v_revision
  from public.profile_revisions as r
  where r.startup_id = v_startup.id
    and r.content_hash = p_content_hash;

  if v_revision.id is null then
    select coalesce(max(r.revision_number), 0) + 1 into v_revision_number
    from public.profile_revisions as r
    where r.startup_id = v_startup.id;

    insert into public.profile_revisions (startup_id, revision_number, draft_version, content_hash, payload)
    values (v_startup.id, v_revision_number, v_startup.draft_version, p_content_hash, v_startup.draft_payload)
    returning * into v_revision;
  end if;

  select pr.* into v_review
  from public.profile_reviews as pr
  where pr.revision_id = v_revision.id
    and pr.rubric_version = p_rubric_version;

  if v_review.id is not null and v_review.state = 'review_failed' then
    update public.profile_reviews as pr
      set state = 'reviewing', error_code = null, completed_at = null
      where pr.id = v_review.id
      returning pr.* into v_review;
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

revoke all on function public.begin_profile_review(uuid, uuid, integer, text, text, text) from public;
grant execute on function public.begin_profile_review(uuid, uuid, integer, text, text, text) to service_role;

commit;
