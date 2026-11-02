-- Private customer bookmarks for stores in the E-DELIVERY marketplace.
-- Favorites are user-owned and never exposed to anonymous marketplace browsing.
begin;

create table public.customer_favorites (
  customer_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, store_id)
);

create index customer_favorites_store_idx
  on public.customer_favorites (store_id, created_at desc);

alter table public.customer_favorites enable row level security;

grant select, insert, delete on public.customer_favorites to authenticated;

create policy customer_favorites_read_own
on public.customer_favorites
for select
to authenticated
using ((select auth.uid()) = customer_id);

create policy customer_favorites_insert_own
on public.customer_favorites
for insert
to authenticated
with check ((select auth.uid()) = customer_id);

create policy customer_favorites_delete_own
on public.customer_favorites
for delete
to authenticated
using ((select auth.uid()) = customer_id);

comment on table public.customer_favorites is
  'Private customer bookmarks. Rows can only be read, added or removed by their owning customer.';

commit;
