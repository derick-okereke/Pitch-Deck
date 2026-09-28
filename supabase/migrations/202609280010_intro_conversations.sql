begin;

create table public.demo_entitlements (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  role public.account_role not null check (role = 'investor'::public.account_role),
  tier text not null check (tier = 'pro'),
  expires_at timestamptz not null,
  granted_by text not null check (char_length(granted_by) between 2 and 120),
  reason text not null check (char_length(reason) between 2 and 240),
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.accounts(id) on delete cascade,
  startup_id uuid not null references public.startups(id) on delete cascade,
  founder_id uuid not null references public.accounts(id) on delete cascade,
  next_sequence bigint not null default 1 check (next_sequence > 0),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (investor_id, startup_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.accounts(id) on delete cascade,
  client_message_id uuid not null,
  sequence bigint not null check (sequence > 0),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (sender_id, client_message_id),
  unique (conversation_id, sequence)
);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.accounts(id) on delete cascade,
  last_read_sequence bigint not null default 0 check (last_read_sequence >= 0),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.conversation_blocks (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  blocker_id uuid not null references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, blocker_id)
);

create table public.intro_request_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique check (char_length(event_key) between 3 and 160),
  event_type text not null check (event_type in ('intro_requested', 'intro_responded')),
  actor_id uuid references public.accounts(id) on delete set null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  schema_version text not null default '1',
  is_demo boolean not null default false
);

create index conversations_investor_activity_idx on public.conversations (investor_id, last_message_at desc, id);
create index conversations_founder_activity_idx on public.conversations (founder_id, last_message_at desc, id);
create index messages_conversation_sequence_idx on public.messages (conversation_id, sequence);
create index messages_sender_created_idx on public.messages (sender_id, created_at desc);
create index intro_request_events_created_idx on public.intro_request_events (created_at, id);

alter table public.demo_entitlements enable row level security;
alter table public.demo_entitlements force row level security;
alter table public.conversations enable row level security;
alter table public.conversations force row level security;
alter table public.messages enable row level security;
alter table public.messages force row level security;
alter table public.conversation_reads enable row level security;
alter table public.conversation_reads force row level security;
alter table public.conversation_blocks enable row level security;
alter table public.conversation_blocks force row level security;
alter table public.intro_request_events enable row level security;
alter table public.intro_request_events force row level security;

create policy "participants read conversations"
on public.conversations for select to authenticated
using ((select auth.uid()) = investor_id or (select auth.uid()) = founder_id);

create policy "participants read messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations
    where conversations.id = messages.conversation_id
      and ((select auth.uid()) = conversations.investor_id or (select auth.uid()) = conversations.founder_id)
  )
);

create policy "participants read own cursor"
on public.conversation_reads for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.conversations
    where conversations.id = conversation_reads.conversation_id
      and ((select auth.uid()) = conversations.investor_id or (select auth.uid()) = conversations.founder_id)
  )
);

revoke all on public.demo_entitlements from anon, authenticated;
revoke all on public.conversations from anon, authenticated;
revoke all on public.messages from anon, authenticated;
revoke all on public.conversation_reads from anon, authenticated;
revoke all on public.conversation_blocks from anon, authenticated;
revoke all on public.intro_request_events from anon, authenticated;
grant select on public.conversations, public.messages, public.conversation_reads to authenticated;

create or replace function public.create_intro_request(
  p_investor_id uuid,
  p_startup_id uuid,
  p_body text,
  p_client_message_id uuid,
  p_demo_mode boolean
)
returns table (conversation_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.accounts%rowtype;
  v_startup public.startups%rowtype;
  v_conversation public.conversations%rowtype;
  v_body text := trim(p_body);
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  select * into v_account from public.accounts where id = p_investor_id;
  if v_account.id is null or v_account.role is distinct from 'investor'::public.account_role or v_account.suspended_at is not null then
    raise exception using errcode = '42501', message = 'INVESTOR_REQUIRED';
  end if;
  if not exists (select 1 from public.investor_profiles where user_id = p_investor_id) then
    raise exception using errcode = '42501', message = 'INVESTOR_PROFILE_REQUIRED';
  end if;
  if char_length(v_body) < 20 or char_length(v_body) > 1000 then
    raise exception using errcode = '22023', message = 'INVALID_INTRO_NOTE';
  end if;

  select * into v_startup
  from public.startups
  where id = p_startup_id
    and publication_status = 'published'::public.startup_publication_status
    and published_revision_id is not null;
  if v_startup.id is null then
    raise exception using errcode = 'P0002', message = 'STARTUP_NOT_FOUND';
  end if;

  select * into v_conversation
  from public.conversations
  where investor_id = p_investor_id and startup_id = p_startup_id;
  if v_conversation.id is not null then
    return query select v_conversation.id, false;
    return;
  end if;

  if not p_demo_mode or not exists (
    select 1 from public.demo_entitlements
    where account_id = p_investor_id
      and role = 'investor'::public.account_role
      and tier = 'pro'
      and expires_at > now()
  ) then
    raise exception using errcode = '42501', message = 'INVESTOR_PRO_REQUIRED';
  end if;

  if (select count(*) from public.conversations where investor_id = p_investor_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception using errcode = 'P0001', message = 'INTRO_RATE_LIMITED';
  end if;

  begin
    insert into public.conversations (investor_id, startup_id, founder_id, next_sequence)
    values (p_investor_id, p_startup_id, v_startup.founder_id, 2)
    returning * into v_conversation;
  exception when unique_violation then
    select * into v_conversation
    from public.conversations
    where investor_id = p_investor_id and startup_id = p_startup_id;
    return query select v_conversation.id, false;
    return;
  end;

  insert into public.messages (conversation_id, sender_id, client_message_id, sequence, body)
  values (v_conversation.id, p_investor_id, p_client_message_id, 1, v_body);
  insert into public.conversation_reads (conversation_id, user_id, last_read_sequence)
  values (v_conversation.id, p_investor_id, 1), (v_conversation.id, v_startup.founder_id, 0);
  insert into public.intro_request_events (event_key, event_type, actor_id, conversation_id, is_demo)
  values ('intro_requested:' || v_conversation.id::text, 'intro_requested', p_investor_id, v_conversation.id, v_account.is_demo);

  return query select v_conversation.id, true;
end;
$$;

create or replace function public.send_conversation_message(
  p_sender_id uuid,
  p_conversation_id uuid,
  p_body text,
  p_client_message_id uuid
)
returns table (message_id uuid, message_sequence bigint, message_body text, message_created_at timestamptz, reused boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.accounts%rowtype;
  v_conversation public.conversations%rowtype;
  v_existing public.messages%rowtype;
  v_message public.messages%rowtype;
  v_body text := trim(p_body);
  v_is_demo boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception using errcode = '22023', message = 'INVALID_MESSAGE';
  end if;

  select * into v_account from public.accounts where id = p_sender_id;
  if v_account.id is null or v_account.suspended_at is not null then
    raise exception using errcode = '42501', message = 'ACCOUNT_REQUIRED';
  end if;

  select * into v_conversation from public.conversations where id = p_conversation_id for update;
  if v_conversation.id is null or p_sender_id not in (v_conversation.investor_id, v_conversation.founder_id) then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_NOT_FOUND';
  end if;

  select * into v_existing
  from public.messages
  where sender_id = p_sender_id and client_message_id = p_client_message_id;
  if v_existing.id is not null then
    if v_existing.conversation_id <> p_conversation_id or v_existing.body <> v_body then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select v_existing.id, v_existing.sequence, v_existing.body, v_existing.created_at, true;
    return;
  end if;

  if exists (select 1 from public.conversation_blocks where conversation_id = p_conversation_id) then
    raise exception using errcode = '42501', message = 'CONVERSATION_BLOCKED';
  end if;
  if (select count(*) from public.messages where sender_id = p_sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception using errcode = 'P0001', message = 'MESSAGE_RATE_LIMITED';
  end if;

  insert into public.messages (conversation_id, sender_id, client_message_id, sequence, body)
  values (p_conversation_id, p_sender_id, p_client_message_id, v_conversation.next_sequence, v_body)
  returning * into v_message;

  update public.conversations
  set next_sequence = next_sequence + 1, last_message_at = v_message.created_at
  where id = p_conversation_id;

  if p_sender_id = v_conversation.founder_id then
    select is_demo into v_is_demo from public.accounts where id = v_conversation.founder_id;
    insert into public.intro_request_events (event_key, event_type, actor_id, conversation_id, is_demo)
    values ('intro_responded:' || v_conversation.id::text, 'intro_responded', p_sender_id, v_conversation.id, coalesce(v_is_demo, false))
    on conflict (event_key) do nothing;
  end if;

  return query select v_message.id, v_message.sequence, v_message.body, v_message.created_at, false;
end;
$$;

create or replace function public.set_conversation_read(
  p_user_id uuid,
  p_conversation_id uuid,
  p_last_read_sequence bigint
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
  v_highest bigint;
  v_result bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_conversation from public.conversations where id = p_conversation_id;
  if v_conversation.id is null or p_user_id not in (v_conversation.investor_id, v_conversation.founder_id) then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_NOT_FOUND';
  end if;
  select coalesce(max(sequence), 0) into v_highest from public.messages where conversation_id = p_conversation_id;
  if p_last_read_sequence < 0 or p_last_read_sequence > v_highest then
    raise exception using errcode = '22023', message = 'INVALID_READ_SEQUENCE';
  end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_sequence)
  values (p_conversation_id, p_user_id, p_last_read_sequence)
  on conflict (conversation_id, user_id) do update
    set last_read_sequence = greatest(public.conversation_reads.last_read_sequence, excluded.last_read_sequence),
        updated_at = now()
  returning last_read_sequence into v_result;
  return v_result;
end;
$$;

create or replace function public.set_conversation_block(
  p_user_id uuid,
  p_conversation_id uuid,
  p_blocked boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;
  select * into v_conversation from public.conversations where id = p_conversation_id;
  if v_conversation.id is null or p_user_id not in (v_conversation.investor_id, v_conversation.founder_id) then
    raise exception using errcode = 'P0002', message = 'CONVERSATION_NOT_FOUND';
  end if;
  if p_blocked then
    insert into public.conversation_blocks (conversation_id, blocker_id)
    values (p_conversation_id, p_user_id)
    on conflict do nothing;
  else
    delete from public.conversation_blocks where conversation_id = p_conversation_id and blocker_id = p_user_id;
  end if;
  return exists (select 1 from public.conversation_blocks where conversation_id = p_conversation_id);
end;
$$;

revoke all on function public.create_intro_request(uuid, uuid, text, uuid, boolean) from public;
revoke all on function public.send_conversation_message(uuid, uuid, text, uuid) from public;
revoke all on function public.set_conversation_read(uuid, uuid, bigint) from public;
revoke all on function public.set_conversation_block(uuid, uuid, boolean) from public;
grant execute on function public.create_intro_request(uuid, uuid, text, uuid, boolean) to service_role;
grant execute on function public.send_conversation_message(uuid, uuid, text, uuid) to service_role;
grant execute on function public.set_conversation_read(uuid, uuid, bigint) to service_role;
grant execute on function public.set_conversation_block(uuid, uuid, boolean) to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
    ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

commit;
