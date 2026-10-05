create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role public.account_role;
  selected_name text;
begin
  selected_role := case
    when new.raw_user_meta_data ->> 'role' in ('founder', 'investor')
      then (new.raw_user_meta_data ->> 'role')::public.account_role
    else null
  end;
  selected_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.accounts (id, role, display_name, onboarding_completed_at)
  values (
    new.id,
    selected_role,
    left(coalesce(selected_name, 'Peekytoe member'), 80),
    case when selected_role is null then null else now() end
  );
  return new;
end;
$$;
