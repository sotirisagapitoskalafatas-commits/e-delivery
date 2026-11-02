-- Customer support tickets and private conversation threads.
-- Only the ticket owner and support staff/ops admins can read a conversation.
begin;

create or replace function private.is_support_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('ops_admin'::public.app_role, 'support'::public.app_role)
  );
$$;

revoke all on function private.is_support_staff() from public, anon;
grant execute on function private.is_support_staff() to authenticated;

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  category text not null check (category in ('order','delivery','payment','account','other')),
  subject text not null check (char_length(trim(subject)) between 3 and 140),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_customer','resolved','closed')),
  priority text not null default 'normal'
    check (priority in ('normal','urgent')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_customer_updated_idx
  on public.support_tickets(customer_id, updated_at desc);
create index support_tickets_status_priority_updated_idx
  on public.support_tickets(status, priority, updated_at desc);
create index support_tickets_order_idx
  on public.support_tickets(order_id)
  where order_id is not null;

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete restrict,
  message text not null check (char_length(trim(message)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index support_ticket_messages_thread_idx
  on public.support_ticket_messages(ticket_id, created_at);

-- Support agents can see only the basic profile of customers who have an actual support case.
create policy profiles_read_support_ticket_customer
on public.profiles
for select
to authenticated
using (
  private.is_support_staff()
  and exists (
    select 1
    from public.support_tickets t
    where t.customer_id = profiles.id
  )
);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

revoke all on public.support_tickets, public.support_ticket_messages from anon, authenticated;
grant select on public.support_tickets, public.support_ticket_messages to authenticated;
grant update (status, priority, assigned_to) on public.support_tickets to authenticated;
grant insert (ticket_id, author_user_id, message) on public.support_ticket_messages to authenticated;

create policy support_tickets_read_owner_or_staff
on public.support_tickets
for select
to authenticated
using (
  customer_id = (select auth.uid())
  or private.is_support_staff()
);

create policy support_tickets_update_staff
on public.support_tickets
for update
to authenticated
using (private.is_support_staff())
with check (private.is_support_staff());

create policy support_ticket_messages_read_authorized
on public.support_ticket_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (t.customer_id = (select auth.uid()) or private.is_support_staff())
  )
);

create policy support_ticket_messages_insert_authorized
on public.support_ticket_messages
for insert
to authenticated
with check (
  author_user_id = (select auth.uid())
  and exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        (t.customer_id = (select auth.uid()) and t.status in ('open','in_progress','waiting_customer'))
        or (private.is_support_staff() and t.status in ('open','in_progress','waiting_customer'))
      )
  )
);

-- Creating a ticket and its first message must be atomic.
create or replace function public.create_support_ticket(
  p_order_id uuid,
  p_category text,
  p_subject text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_ticket_id uuid;
begin
  if v_customer_id is null then
    raise exception 'authentication_required';
  end if;
  if p_category is null or p_category not in ('order','delivery','payment','account','other') then
    raise exception 'invalid_support_category';
  end if;
  if char_length(trim(coalesce(p_subject, ''))) not between 3 and 140 then
    raise exception 'invalid_support_subject';
  end if;
  if char_length(trim(coalesce(p_message, ''))) not between 10 and 4000 then
    raise exception 'invalid_support_message';
  end if;
  if p_order_id is not null and not exists (
    select 1 from public.orders o
    where o.id = p_order_id and o.customer_id = v_customer_id
  ) then
    raise exception 'support_order_not_owned';
  end if;

  insert into public.support_tickets(customer_id, order_id, category, subject)
  values (v_customer_id, p_order_id, p_category, trim(p_subject))
  returning id into v_ticket_id;

  insert into public.support_ticket_messages(ticket_id, author_user_id, message)
  values (v_ticket_id, v_customer_id, trim(p_message));

  return v_ticket_id;
end;
$$;

revoke all on function public.create_support_ticket(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_support_ticket(uuid, text, text, text) to authenticated;

-- Every reply refreshes the ticket timestamp. A customer reply reopens a waiting ticket.
create or replace function private.touch_support_ticket_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets
  set
    status = case
      when customer_id = new.author_user_id and status = 'waiting_customer' then 'open'
      else status
    end,
    updated_at = now()
  where id = new.ticket_id;
  return new;
end;
$$;

revoke all on function private.touch_support_ticket_after_message() from public, anon, authenticated;

create trigger support_ticket_message_touch
after insert on public.support_ticket_messages
for each row execute function private.touch_support_ticket_after_message();

comment on table public.support_tickets is
  'Private customer support cases linked optionally to a customer-owned order.';
comment on table public.support_ticket_messages is
  'Private support conversation messages visible only to the ticket owner and support staff.';

commit;
