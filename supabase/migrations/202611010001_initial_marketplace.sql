-- Greek-first delivery marketplace foundation.
-- Apply only to a dedicated delivery-platform Supabase project after reviewing this migration.
begin;

create type public.app_role as enum ('customer', 'merchant_admin', 'merchant_staff', 'courier', 'ops_admin', 'support');
create type public.merchant_status as enum ('pending', 'active', 'suspended', 'closed');
create type public.store_type as enum ('restaurant', 'cafe', 'bakery', 'supermarket', 'convenience', 'retail', 'pharmacy', 'other');
create type public.fulfillment_method as enum ('platform', 'merchant');
create type public.order_status as enum ('pending_merchant', 'accepted', 'preparing', 'ready_for_pickup', 'courier_assigned', 'picked_up', 'delivered', 'rejected', 'cancelled');
create type public.payment_method as enum ('cash_on_delivery');
create type public.payment_status as enum ('due_on_delivery', 'paid', 'failed', 'refunded');
create type public.courier_account_status as enum ('pending', 'approved', 'suspended');
create type public.courier_assignment_status as enum ('offered', 'accepted', 'rejected', 'picked_up', 'delivered', 'cancelled');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  phone text check (phone is null or char_length(phone) <= 32),
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  status public.merchant_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.merchant_memberships (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  unique (merchant_id, user_id)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  description text,
  store_type public.store_type not null default 'restaurant',
  address_line text not null,
  city text not null,
  region text not null default 'Attica',
  postal_code text not null,
  service_postal_codes text[] not null default '{}',
  latitude double precision,
  longitude double precision,
  phone text,
  timezone text not null default 'Europe/Athens',
  is_active boolean not null default false,
  accepts_orders boolean not null default false,
  platform_delivery_enabled boolean not null default true,
  merchant_delivery_enabled boolean not null default false,
  minimum_order_cents integer not null default 0 check (minimum_order_cents >= 0),
  base_delivery_fee_cents integer not null default 0 check (base_delivery_fee_cents >= 0),
  prep_time_minutes integer not null default 25 check (prep_time_minutes between 0 and 240),
  max_delivery_distance_meters integer not null default 5000 check (max_delivery_distance_meters > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency char(3) not null default 'EUR' check (currency = 'EUR'),
  tax_rate numeric(5,4) not null default 0 check (tax_rate between 0 and 1),
  allergens text[] not null default '{}',
  image_path text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home' check (char_length(label) <= 60),
  line1 text not null check (char_length(line1) <= 250),
  line2 text check (line2 is null or char_length(line2) <= 250),
  city text not null check (char_length(city) <= 100),
  region text,
  postal_code text not null check (char_length(postal_code) <= 16),
  latitude double precision,
  longitude double precision,
  delivery_instructions text check (delivery_instructions is null or char_length(delivery_instructions) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null and longitude is null) or (latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  store_id uuid not null references public.stores(id),
  status public.order_status not null default 'pending_merchant',
  fulfillment_method public.fulfillment_method not null,
  payment_method public.payment_method not null default 'cash_on_delivery',
  payment_status public.payment_status not null default 'due_on_delivery',
  currency char(3) not null default 'EUR' check (currency = 'EUR'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null check (delivery_fee_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  delivery_address_snapshot jsonb not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 120),
  request_fingerprint text not null,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, idempotency_key),
  check (total_cents = subtotal_cents + delivery_fee_cents + service_fee_cents - discount_cents)
);

create index orders_store_created_idx on public.orders(store_id, created_at desc);
create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 99),
  tax_rate_snapshot numeric(5,4) not null default 0 check (tax_rate_snapshot between 0 and 1),
  allergens_snapshot text[] not null default '{}',
  line_total_cents integer not null check (line_total_cents >= 0),
  notes text check (notes is null or char_length(notes) <= 300),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items(order_id);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  from_status public.order_status,
  to_status public.order_status not null,
  reason text,
  created_at timestamptz not null default now()
);
create index order_events_order_created_idx on public.order_events(order_id, created_at);

create table public.courier_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status public.courier_account_status not null default 'pending',
  vehicle_type text check (vehicle_type is null or char_length(vehicle_type) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courier_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_user_id uuid not null references public.courier_profiles(user_id),
  status public.courier_assignment_status not null default 'offered',
  offered_at timestamptz not null default now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index courier_assignments_one_active_order_idx
  on public.courier_assignments(order_id)
  where status in ('offered', 'accepted', 'picked_up');
create index courier_assignments_courier_status_idx
  on public.courier_assignments(courier_user_id, status, created_at desc);

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_reference text,
  transaction_type text not null check (transaction_type in ('authorization', 'capture', 'refund', 'cash_collection', 'adjustment')),
  amount_cents integer not null check (amount_cents >= 0),
  currency char(3) not null default 'EUR' check (currency = 'EUR'),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'reversed')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);
create index payment_transactions_order_idx on public.payment_transactions(order_id, created_at);

-- SECURITY DEFINER helpers live in a non-exposed schema and read server-managed membership rows only.
create or replace function private.is_ops_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'ops_admin'::public.app_role
  );
$$;

create or replace function private.is_merchant_member(p_store_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.stores s
    join public.merchant_memberships mm on mm.merchant_id = s.merchant_id
    where s.id = p_store_id
      and mm.user_id = (select auth.uid())
      and (p_roles is null or mm.role = any(p_roles))
  );
$$;

create or replace function private.is_assigned_courier(p_order_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.courier_assignments ca
    where ca.order_id = p_order_id
      and ca.courier_user_id = (select auth.uid())
      and ca.status in ('offered', 'accepted', 'picked_up')
  );
$$;

create or replace function private.can_view_order(p_order_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (
        o.customer_id = (select auth.uid())
        or private.is_ops_admin()
        or private.is_merchant_member(o.store_id, array['owner','manager','staff'])
        or private.is_assigned_courier(o.id)
      )
  );
$$;

revoke all on function private.is_ops_admin() from public, anon;
revoke all on function private.is_merchant_member(uuid, text[]) from public, anon;
revoke all on function private.is_assigned_courier(uuid) from public, anon;
revoke all on function private.can_view_order(uuid) from public, anon;
grant execute on function private.is_ops_admin() to authenticated;
grant execute on function private.is_merchant_member(uuid, text[]) to authenticated;
grant execute on function private.is_assigned_courier(uuid) to authenticated;
grant execute on function private.can_view_order(uuid) to authenticated;

-- All new accounts begin as customers; user metadata never grants an authorization role.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'customer'::public.app_role)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger merchants_touch before update on public.merchants for each row execute function private.touch_updated_at();
create trigger stores_touch before update on public.stores for each row execute function private.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();
create trigger addresses_touch before update on public.customer_addresses for each row execute function private.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function private.touch_updated_at();
create trigger courier_profiles_touch before update on public.courier_profiles for each row execute function private.touch_updated_at();
create trigger courier_assignments_touch before update on public.courier_assignments for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.merchant_memberships enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.courier_profiles enable row level security;
alter table public.courier_assignments enable row level security;
alter table public.payment_transactions enable row level security;

create policy profiles_read_self_or_ops on public.profiles
for select to authenticated using (id = (select auth.uid()) or private.is_ops_admin());
create policy profiles_update_self on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy merchants_read_member_or_ops on public.merchants
for select to authenticated
using (
  private.is_ops_admin()
  or exists (select 1 from public.merchant_memberships mm where mm.merchant_id = id and mm.user_id = (select auth.uid()))
);
create policy memberships_read_self_or_ops on public.merchant_memberships
for select to authenticated using (user_id = (select auth.uid()) or private.is_ops_admin());

create policy stores_public_catalog_read on public.stores
for select to anon, authenticated using (is_active and accepts_orders);
create policy stores_member_or_ops_read on public.stores
for select to authenticated using (private.is_ops_admin() or private.is_merchant_member(id, array['owner','manager','staff']));

create policy categories_public_catalog_read on public.categories
for select to anon, authenticated
using (is_active and exists (
  select 1 from public.stores s where s.id = store_id and s.is_active and s.accepts_orders
));
create policy categories_member_read on public.categories
for select to authenticated
using (private.is_ops_admin() or private.is_merchant_member(store_id, array['owner','manager','staff']));

create policy products_public_catalog_read on public.products
for select to anon, authenticated
using (is_available and exists (
  select 1 from public.stores s where s.id = store_id and s.is_active and s.accepts_orders
));
create policy products_member_read on public.products
for select to authenticated
using (private.is_ops_admin() or private.is_merchant_member(store_id, array['owner','manager','staff']));

create policy addresses_read_own on public.customer_addresses
for select to authenticated using (customer_id = (select auth.uid()) or private.is_ops_admin());
create policy addresses_insert_own on public.customer_addresses
for insert to authenticated with check (customer_id = (select auth.uid()));
create policy addresses_update_own on public.customer_addresses
for update to authenticated using (customer_id = (select auth.uid())) with check (customer_id = (select auth.uid()));
create policy addresses_delete_own on public.customer_addresses
for delete to authenticated using (customer_id = (select auth.uid()));

create policy orders_read_authorized on public.orders
for select to authenticated
using (
  customer_id = (select auth.uid())
  or private.is_ops_admin()
  or private.is_merchant_member(store_id, array['owner','manager','staff'])
  or private.is_assigned_courier(id)
);
create policy order_items_read_authorized on public.order_items
for select to authenticated using (private.can_view_order(order_id));
create policy order_events_read_authorized on public.order_events
for select to authenticated using (private.can_view_order(order_id));

create policy courier_profiles_read_self_or_ops on public.courier_profiles
for select to authenticated using (user_id = (select auth.uid()) or private.is_ops_admin());
create policy courier_assignments_read_authorized on public.courier_assignments
for select to authenticated
using (
  courier_user_id = (select auth.uid())
  or private.is_ops_admin()
  or exists (
    select 1 from public.orders o where o.id = order_id
    and private.is_merchant_member(o.store_id, array['owner','manager','staff'])
  )
);
create policy payment_transactions_read_ops on public.payment_transactions
for select to authenticated using (private.is_ops_admin());

-- Direct writes to order, payment, merchant, product and courier-control tables are deliberately unavailable.
revoke all on public.profiles, public.merchants, public.merchant_memberships, public.stores,
  public.categories, public.products, public.customer_addresses, public.orders,
  public.order_items, public.order_events, public.courier_profiles,
  public.courier_assignments, public.payment_transactions from anon, authenticated;

grant select on public.stores, public.categories, public.products to anon, authenticated;
grant select on public.profiles, public.merchants, public.merchant_memberships,
  public.customer_addresses, public.orders, public.order_items, public.order_events,
  public.courier_profiles, public.courier_assignments to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant insert (customer_id, label, line1, line2, city, region, postal_code, latitude, longitude, delivery_instructions)
  on public.customer_addresses to authenticated;
grant update (label, line1, line2, city, region, postal_code, latitude, longitude, delivery_instructions)
  on public.customer_addresses to authenticated;
grant delete on public.customer_addresses to authenticated;

-- Atomic and idempotent COD checkout. Prices and delivery fees are read from the database.
create or replace function public.create_marketplace_order(
  p_store_id uuid,
  p_address_id uuid,
  p_fulfillment_method public.fulfillment_method,
  p_items jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_store public.stores%rowtype;
  v_address public.customer_addresses%rowtype;
  v_item_count integer;
  v_product_count integer;
  v_subtotal bigint;
  v_total bigint;
  v_fingerprint text;
  v_order_id uuid;
  v_existing_fingerprint text;
  v_address_snapshot jsonb;
begin
  if v_customer_id is null then raise exception 'authentication_required'; end if;
  if p_store_id is null or p_address_id is null or p_fulfillment_method is null then
    raise exception 'missing_checkout_reference';
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 or char_length(p_idempotency_key) > 120 then
    raise exception 'invalid_idempotency_key';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_order_items';
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'store', p_store_id,
    'address', p_address_id,
    'fulfillment', p_fulfillment_method,
    'items', p_items
  )::text);

  -- A retry of an already committed request returns the original order even if a menu item changed later.
  select o.id, o.request_fingerprint into v_order_id, v_existing_fingerprint
  from public.orders o
  where o.customer_id = v_customer_id and o.idempotency_key = p_idempotency_key;
  if found then
    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'idempotency_key_reused_with_different_payload';
    end if;
    return v_order_id;
  end if;

  select * into v_store
  from public.stores s
  where s.id = p_store_id and s.is_active and s.accepts_orders
  for share;
  if not found then raise exception 'store_unavailable'; end if;

  if cardinality(v_store.service_postal_codes) = 0 then raise exception 'store_service_area_not_configured'; end if;

  if p_fulfillment_method = 'platform' and not v_store.platform_delivery_enabled then
    raise exception 'platform_delivery_unavailable';
  elsif p_fulfillment_method = 'merchant' and not v_store.merchant_delivery_enabled then
    raise exception 'merchant_delivery_unavailable';
  end if;

  select * into v_address
  from public.customer_addresses a
  where a.id = p_address_id and a.customer_id = v_customer_id;
  if not found then raise exception 'address_not_owned'; end if;
  if not (v_address.postal_code = any(v_store.service_postal_codes)) then
    raise exception 'outside_store_service_area';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_items) x
    where jsonb_typeof(x.value) <> 'object'
      or coalesce(x.value ->> 'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(x.value ->> 'quantity', '') !~ '^[0-9]+$'
      or case when coalesce(x.value ->> 'quantity', '') ~ '^[0-9]+
      or char_length(coalesce(x.value ->> 'notes', '')) > 300
  ) then raise exception 'invalid_order_item'; end if;

  select count(*) into v_item_count from jsonb_array_elements(p_items);
  select count(*), coalesce(sum(p.price_cents::bigint * (x.value ->> 'quantity')::integer), 0)
    into v_product_count, v_subtotal
  from jsonb_array_elements(p_items) x
  join public.products p
    on p.id = (x.value ->> 'product_id')::uuid
   and p.store_id = p_store_id
   and p.is_available;
  if v_product_count <> v_item_count then raise exception 'product_unavailable_or_wrong_store'; end if;
  if v_subtotal < v_store.minimum_order_cents then raise exception 'minimum_order_not_met'; end if;
  if v_subtotal > 2147483647 then raise exception 'order_total_too_large'; end if;

  v_address_snapshot := jsonb_build_object(
    'label', v_address.label,
    'line1', v_address.line1,
    'line2', v_address.line2,
    'city', v_address.city,
    'region', v_address.region,
    'postal_code', v_address.postal_code,
    'delivery_instructions', v_address.delivery_instructions
  );
  v_total := v_subtotal + v_store.base_delivery_fee_cents;
  if v_total > 2147483647 then raise exception 'order_total_too_large'; end if;

  insert into public.orders (
    customer_id, store_id, status, fulfillment_method, payment_method, payment_status,
    subtotal_cents, delivery_fee_cents, service_fee_cents, discount_cents, total_cents,
    delivery_address_snapshot, idempotency_key, request_fingerprint
  ) values (
    v_customer_id, p_store_id, 'pending_merchant', p_fulfillment_method, 'cash_on_delivery', 'due_on_delivery',
    v_subtotal::integer, v_store.base_delivery_fee_cents, 0, 0, v_total::integer,
    v_address_snapshot, p_idempotency_key, v_fingerprint
  )
  on conflict (customer_id, idempotency_key) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select o.id, o.request_fingerprint into v_order_id, v_existing_fingerprint
    from public.orders o
    where o.customer_id = v_customer_id and o.idempotency_key = p_idempotency_key;
    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'idempotency_key_reused_with_different_payload';
    end if;
    return v_order_id;
  end if;

  insert into public.order_items (
    order_id, product_id, product_name_snapshot, unit_price_cents, quantity,
    tax_rate_snapshot, allergens_snapshot, line_total_cents, notes
  )
  select
    v_order_id, p.id, p.name, p.price_cents, (x.value ->> 'quantity')::integer,
    p.tax_rate, p.allergens, (p.price_cents * (x.value ->> 'quantity')::integer),
    nullif(x.value ->> 'notes', '')
  from jsonb_array_elements(p_items) x
  join public.products p
    on p.id = (x.value ->> 'product_id')::uuid
   and p.store_id = p_store_id and p.is_available;

  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (v_order_id, v_customer_id, null, 'pending_merchant', 'Order placed');
  return v_order_id;
end;
$$;
revoke all on function public.create_marketplace_order(uuid, uuid, public.fulfillment_method, jsonb, text) from public, anon;
grant execute on function public.create_marketplace_order(uuid, uuid, public.fulfillment_method, jsonb, text) to authenticated;

create or replace function public.set_merchant_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if not (private.is_ops_admin() or private.is_merchant_member(v_order.store_id, array['owner','manager','staff'])) then
    raise exception 'not_authorized_for_store';
  end if;

  v_allowed :=
    (v_order.status = 'pending_merchant' and p_new_status in ('accepted','rejected'))
    or (v_order.status = 'accepted' and p_new_status = 'preparing')
    or (v_order.status = 'preparing' and p_new_status = 'ready_for_pickup')
    or (v_order.status = 'ready_for_pickup' and p_new_status = 'delivered' and v_order.fulfillment_method = 'merchant');
  if not v_allowed then raise exception 'invalid_order_transition'; end if;
  if p_new_status = 'rejected' and nullif(trim(coalesce(p_reason,'')), '') is null then
    raise exception 'rejection_reason_required';
  end if;

  update public.orders set status = p_new_status where id = p_order_id;
  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (p_order_id, auth.uid(), v_order.status, p_new_status, left(p_reason, 300));
end;
$$;
revoke all on function public.set_merchant_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.set_merchant_order_status(uuid, public.order_status, text) to authenticated;

create or replace function public.dispatch_order_to_courier(p_order_id uuid, p_courier_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_assignment_id uuid;
begin
  if auth.uid() is null or not private.is_ops_admin() then raise exception 'ops_admin_required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'ready_for_pickup' or v_order.fulfillment_method <> 'platform' then
    raise exception 'order_not_ready_for_platform_dispatch';
  end if;
  if not exists (select 1 from public.courier_profiles cp where cp.user_id = p_courier_user_id and cp.status = 'approved') then
    raise exception 'courier_not_approved';
  end if;

  insert into public.courier_assignments (order_id, courier_user_id, status)
  values (p_order_id, p_courier_user_id, 'offered')
  returning id into v_assignment_id;
  update public.orders set status = 'courier_assigned' where id = p_order_id;
  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (p_order_id, auth.uid(), v_order.status, 'courier_assigned', 'Courier offer created');
  return v_assignment_id;
end;
$$;
revoke all on function public.dispatch_order_to_courier(uuid, uuid) from public, anon;
grant execute on function public.dispatch_order_to_courier(uuid, uuid) to authenticated;

create or replace function public.accept_courier_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_assignment public.courier_assignments%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_assignment from public.courier_assignments
  where id = p_assignment_id and courier_user_id = auth.uid()
  for update;
  if not found then raise exception 'assignment_not_found'; end if;
  if v_assignment.status <> 'offered' then raise exception 'assignment_not_offered'; end if;
  update public.courier_assignments set status = 'accepted', accepted_at = now() where id = p_assignment_id;
end;
$$;
revoke all on function public.accept_courier_assignment(uuid) from public, anon;
grant execute on function public.accept_courier_assignment(uuid) to authenticated;

create or replace function public.set_courier_delivery_status(p_assignment_id uuid, p_new_status text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_assignment public.courier_assignments%rowtype;
  v_order public.orders%rowtype;
  v_next_status public.order_status;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_new_status not in ('picked_up','delivered') then raise exception 'invalid_courier_action'; end if;

  select * into v_assignment from public.courier_assignments
  where id = p_assignment_id and courier_user_id = auth.uid()
  for update;
  if not found then raise exception 'assignment_not_found'; end if;
  select * into v_order from public.orders where id = v_assignment.order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if p_new_status = 'picked_up' then
    if v_assignment.status <> 'accepted' or v_order.status <> 'courier_assigned' then
      raise exception 'assignment_not_ready_for_pickup';
    end if;
    update public.courier_assignments set status = 'picked_up', picked_up_at = now() where id = p_assignment_id;
    v_next_status := 'picked_up';
  else
    if v_assignment.status <> 'picked_up' or v_order.status <> 'picked_up' then
      raise exception 'assignment_not_ready_for_delivery';
    end if;
    update public.courier_assignments set status = 'delivered', delivered_at = now() where id = p_assignment_id;
    v_next_status := 'delivered';
  end if;

  update public.orders set status = v_next_status where id = v_order.id;
  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (v_order.id, auth.uid(), v_order.status, v_next_status, 'Courier status update');
end;
$$;
revoke all on function public.set_courier_delivery_status(uuid, text) from public, anon;
grant execute on function public.set_courier_delivery_status(uuid, text) to authenticated;

commit;
 then (x.value ->> 'quantity')::integer not between 1 and 99 else true end
      or char_length(coalesce(x.value ->> 'notes', '')) > 300
  ) then raise exception 'invalid_order_item'; end if;

  select count(*) into v_item_count from jsonb_array_elements(p_items);
  select count(*), coalesce(sum(p.price_cents::bigint * (x.value ->> 'quantity')::integer), 0)
    into v_product_count, v_subtotal
  from jsonb_array_elements(p_items) x
  join public.products p
    on p.id = (x.value ->> 'product_id')::uuid
   and p.store_id = p_store_id
   and p.is_available;
  if v_product_count <> v_item_count then raise exception 'product_unavailable_or_wrong_store'; end if;
  if v_subtotal < v_store.minimum_order_cents then raise exception 'minimum_order_not_met'; end if;
  if v_subtotal > 2147483647 then raise exception 'order_total_too_large'; end if;

  v_address_snapshot := jsonb_build_object(
    'label', v_address.label,
    'line1', v_address.line1,
    'line2', v_address.line2,
    'city', v_address.city,
    'region', v_address.region,
    'postal_code', v_address.postal_code,
    'delivery_instructions', v_address.delivery_instructions
  );
  v_total := v_subtotal + v_store.base_delivery_fee_cents;
  if v_total > 2147483647 then raise exception 'order_total_too_large'; end if;

  v_fingerprint := md5(jsonb_build_object(
    'store', p_store_id,
    'address', p_address_id,
    'fulfillment', p_fulfillment_method,
    'items', p_items
  )::text);

  insert into public.orders (
    customer_id, store_id, status, fulfillment_method, payment_method, payment_status,
    subtotal_cents, delivery_fee_cents, service_fee_cents, discount_cents, total_cents,
    delivery_address_snapshot, idempotency_key, request_fingerprint
  ) values (
    v_customer_id, p_store_id, 'pending_merchant', p_fulfillment_method, 'cash_on_delivery', 'due_on_delivery',
    v_subtotal::integer, v_store.base_delivery_fee_cents, 0, 0, v_total::integer,
    v_address_snapshot, p_idempotency_key, v_fingerprint
  )
  on conflict (customer_id, idempotency_key) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    select o.id, o.request_fingerprint into v_order_id, v_existing_fingerprint
    from public.orders o
    where o.customer_id = v_customer_id and o.idempotency_key = p_idempotency_key;
    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'idempotency_key_reused_with_different_payload';
    end if;
    return v_order_id;
  end if;

  insert into public.order_items (
    order_id, product_id, product_name_snapshot, unit_price_cents, quantity,
    tax_rate_snapshot, allergens_snapshot, line_total_cents, notes
  )
  select
    v_order_id, p.id, p.name, p.price_cents, (x.value ->> 'quantity')::integer,
    p.tax_rate, p.allergens, (p.price_cents * (x.value ->> 'quantity')::integer),
    nullif(x.value ->> 'notes', '')
  from jsonb_array_elements(p_items) x
  join public.products p
    on p.id = (x.value ->> 'product_id')::uuid
   and p.store_id = p_store_id and p.is_available;

  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (v_order_id, v_customer_id, null, 'pending_merchant', 'Order placed');
  return v_order_id;
end;
$$;
revoke all on function public.create_marketplace_order(uuid, uuid, public.fulfillment_method, jsonb, text) from public, anon;
grant execute on function public.create_marketplace_order(uuid, uuid, public.fulfillment_method, jsonb, text) to authenticated;

create or replace function public.set_merchant_order_status(
  p_order_id uuid,
  p_new_status public.order_status,
  p_reason text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if not (private.is_ops_admin() or private.is_merchant_member(v_order.store_id, array['owner','manager','staff'])) then
    raise exception 'not_authorized_for_store';
  end if;

  v_allowed :=
    (v_order.status = 'pending_merchant' and p_new_status in ('accepted','rejected'))
    or (v_order.status = 'accepted' and p_new_status = 'preparing')
    or (v_order.status = 'preparing' and p_new_status = 'ready_for_pickup')
    or (v_order.status = 'ready_for_pickup' and p_new_status = 'delivered' and v_order.fulfillment_method = 'merchant');
  if not v_allowed then raise exception 'invalid_order_transition'; end if;
  if p_new_status = 'rejected' and nullif(trim(coalesce(p_reason,'')), '') is null then
    raise exception 'rejection_reason_required';
  end if;

  update public.orders set status = p_new_status where id = p_order_id;
  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (p_order_id, auth.uid(), v_order.status, p_new_status, left(p_reason, 300));
end;
$$;
revoke all on function public.set_merchant_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.set_merchant_order_status(uuid, public.order_status, text) to authenticated;

create or replace function public.dispatch_order_to_courier(p_order_id uuid, p_courier_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_assignment_id uuid;
begin
  if auth.uid() is null or not private.is_ops_admin() then raise exception 'ops_admin_required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'ready_for_pickup' or v_order.fulfillment_method <> 'platform' then
    raise exception 'order_not_ready_for_platform_dispatch';
  end if;
  if not exists (select 1 from public.courier_profiles cp where cp.user_id = p_courier_user_id and cp.status = 'approved') then
    raise exception 'courier_not_approved';
  end if;

  insert into public.courier_assignments (order_id, courier_user_id, status)
  values (p_order_id, p_courier_user_id, 'offered')
  returning id into v_assignment_id;
  update public.orders set status = 'courier_assigned' where id = p_order_id;
  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (p_order_id, auth.uid(), v_order.status, 'courier_assigned', 'Courier offer created');
  return v_assignment_id;
end;
$$;
revoke all on function public.dispatch_order_to_courier(uuid, uuid) from public, anon;
grant execute on function public.dispatch_order_to_courier(uuid, uuid) to authenticated;

create or replace function public.accept_courier_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_assignment public.courier_assignments%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into v_assignment from public.courier_assignments
  where id = p_assignment_id and courier_user_id = auth.uid()
  for update;
  if not found then raise exception 'assignment_not_found'; end if;
  if v_assignment.status <> 'offered' then raise exception 'assignment_not_offered'; end if;
  update public.courier_assignments set status = 'accepted', accepted_at = now() where id = p_assignment_id;
end;
$$;
revoke all on function public.accept_courier_assignment(uuid) from public, anon;
grant execute on function public.accept_courier_assignment(uuid) to authenticated;

create or replace function public.set_courier_delivery_status(p_assignment_id uuid, p_new_status text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_assignment public.courier_assignments%rowtype;
  v_order public.orders%rowtype;
  v_next_status public.order_status;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if p_new_status not in ('picked_up','delivered') then raise exception 'invalid_courier_action'; end if;

  select * into v_assignment from public.courier_assignments
  where id = p_assignment_id and courier_user_id = auth.uid()
  for update;
  if not found then raise exception 'assignment_not_found'; end if;
  select * into v_order from public.orders where id = v_assignment.order_id for update;
  if not found then raise exception 'order_not_found'; end if;

  if p_new_status = 'picked_up' then
    if v_assignment.status <> 'accepted' or v_order.status <> 'courier_assigned' then
      raise exception 'assignment_not_ready_for_pickup';
    end if;
    update public.courier_assignments set status = 'picked_up', picked_up_at = now() where id = p_assignment_id;
    v_next_status := 'picked_up';
  else
    if v_assignment.status <> 'picked_up' or v_order.status <> 'picked_up' then
      raise exception 'assignment_not_ready_for_delivery';
    end if;
    update public.courier_assignments set status = 'delivered', delivered_at = now() where id = p_assignment_id;
    v_next_status := 'delivered';
  end if;

  update public.orders set status = v_next_status where id = v_order.id;
  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (v_order.id, auth.uid(), v_order.status, v_next_status, 'Courier status update');
end;
$$;
revoke all on function public.set_courier_delivery_status(uuid, text) from public, anon;
grant execute on function public.set_courier_delivery_status(uuid, text) to authenticated;

commit;
