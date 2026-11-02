-- Weekly merchant opening hours for the E-DELIVERY marketplace.
-- Weekday numbering: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
-- Two service windows per day are supported. Overnight windows are allowed.
-- Apply only after migrations 001-007 on the dedicated E-DELIVERY project.
begin;

create table public.store_hours (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  slot_order smallint not null check (slot_order in (0, 1)),
  opens_at time without time zone,
  closes_at time without time zone,
  is_closed boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint store_hours_state_check check (
    (is_closed and opens_at is null and closes_at is null)
    or
    (not is_closed and opens_at is not null and closes_at is not null and opens_at <> closes_at)
  ),
  constraint store_hours_store_day_slot_unique unique (store_id, weekday, slot_order)
);

create index store_hours_store_weekday_idx
  on public.store_hours (store_id, weekday, slot_order);

alter table public.store_hours enable row level security;

grant select on public.store_hours to anon, authenticated;
grant insert, update, delete on public.store_hours to authenticated;

create policy store_hours_public_catalog_read
on public.store_hours
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = store_hours.store_id
      and s.is_active
      and s.accepts_orders
      and private.is_merchant_active(s.merchant_id)
  )
);

create policy store_hours_merchant_member_read
on public.store_hours
for select
to authenticated
using (
  private.is_ops_admin()
  or private.is_merchant_member(store_id, array['owner', 'manager', 'staff'])
);

create policy store_hours_manager_write
on public.store_hours
for all
to authenticated
using (
  private.is_ops_admin()
  or private.is_merchant_member(store_id, array['owner', 'manager'])
)
with check (
  private.is_ops_admin()
  or private.is_merchant_member(store_id, array['owner', 'manager'])
);

comment on table public.store_hours is
  'Merchant-configured weekly opening windows. Two windows per weekday; overnight windows are supported.';

comment on column public.store_hours.weekday is
  '0 = Sunday through 6 = Saturday.';

comment on column public.store_hours.slot_order is
  '0 = first service window, 1 = second service window.';

commit;
