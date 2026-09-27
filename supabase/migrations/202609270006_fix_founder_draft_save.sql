begin;

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
#variable_conflict use_column
declare
  v_account public.accounts%rowtype;
  v_startup public.startups%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_account
  from public.accounts as a
  where a.id = p_founder_id;

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
    update public.startups as s
      set draft_payload = p_payload,
          draft_version = s.draft_version + 1,
          updated_at = now()
      where s.founder_id = v_account.id
        and s.draft_version = p_expected_version
      returning s.* into v_startup;

    if v_startup.id is null then
      raise exception using errcode = 'P0001', message = 'DRAFT_VERSION_CONFLICT';
    end if;
  end if;

  update public.accounts as a
    set organization_name = nullif(trim(p_payload ->> 'name'), '')
    where a.id = v_account.id;

  return query select v_startup.id, v_startup.draft_version, v_startup.updated_at;
end;
$$;

revoke all on function public.save_founder_draft(uuid, integer, jsonb) from public;
grant execute on function public.save_founder_draft(uuid, integer, jsonb) to service_role;

commit;
