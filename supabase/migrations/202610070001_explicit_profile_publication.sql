begin;

-- Completing a review never grants permission to publish a private profile.
create or replace function public.complete_profile_review(
  p_review_id uuid, p_model_id text, p_ratings jsonb, p_evidence jsonb,
  p_flags jsonb, p_content_points numeric
)
returns table (published boolean, reviewed_earlier_draft boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  v_review public.profile_reviews%rowtype;
  v_revision public.profile_revisions%rowtype;
  v_startup public.startups%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if p_content_points is null or p_content_points < 0 or p_content_points > 90 then
    raise exception using errcode = '22023', message = 'INVALID_CONTENT_POINTS';
  end if;
  select * into v_review from public.profile_reviews where id = p_review_id for update;
  if v_review.id is null then
    raise exception using errcode = 'P0002', message = 'REVIEW_NOT_FOUND';
  end if;
  select * into v_revision from public.profile_revisions where id = v_review.revision_id;
  select * into v_startup from public.startups where id = v_revision.startup_id;
  if v_review.state = 'reviewing' then
    update public.profile_reviews set
      model_id = p_model_id,
      state = case when p_content_points >= 50 then 'passed'::public.profile_review_state
        else 'needs_improvement'::public.profile_review_state end,
      ratings = p_ratings, evidence = p_evidence, flags = p_flags,
      content_points = p_content_points, error_code = null, completed_at = now()
    where id = v_review.id;
  end if;
  return query select
    coalesce(v_startup.publication_status = 'published' and v_startup.published_revision_id = v_revision.id, false),
    v_startup.draft_payload is distinct from v_revision.payload;
end;
$$;

create or replace function public.publish_founder_review(p_founder_id uuid, p_review_id uuid)
returns table (startup_id uuid, revision_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_review public.profile_reviews%rowtype;
  v_revision public.profile_revisions%rowtype;
  v_startup public.startups%rowtype;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_review from public.profile_reviews where id = p_review_id for update;
  if v_review.id is null or v_review.state <> 'passed' or v_review.rubric_version <> 'readiness-v1'
     or v_review.content_points is null or v_review.content_points < 50 or v_review.content_points > 90 then
    raise exception using errcode = '22023', message = 'PASSED_REVIEW_REQUIRED';
  end if;
  select * into v_revision from public.profile_revisions where id = v_review.revision_id;
  select * into v_startup from public.startups where id = v_revision.startup_id for update;
  if v_startup.id is null or p_founder_id is null or v_startup.founder_id <> p_founder_id then
    raise exception using errcode = '42501', message = 'PROFILE_OWNER_REQUIRED';
  end if;
  update public.startups set
    selected_audio_session_id = case when published_revision_id = v_revision.id then selected_audio_session_id else null end,
    published_revision_id = v_revision.id, publication_status = 'published', updated_at = now()
  where id = v_startup.id;
  return query select v_startup.id, v_revision.id;
end;
$$;

revoke all on function public.publish_founder_review(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_founder_review(uuid, uuid) to service_role;

commit;
