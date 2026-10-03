begin;

create or replace function public.confirmed_signup_email_exists(p_email text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  return exists (
    select 1
    from auth.users as u
    where lower(btrim(u.email)) = lower(btrim(p_email))
      and u.email_confirmed_at is not null
  );
end;
$$;

revoke all on function public.confirmed_signup_email_exists(text) from public, anon, authenticated;
grant execute on function public.confirmed_signup_email_exists(text) to service_role;

commit;
