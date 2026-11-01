-- E-DELIVERY multi-network and non-basket transaction foundations.
-- Apply only after 202611010002_add_independent_fulfilment.sql.
begin;

create type public.independent_partner_status as enum ('pending', 'active', 'suspended', 'closed');
create type public.courier_network_type as enum ('platform', 'independent_partner');

create table public.independent_partners (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  status public.independent_partner_status not null default 'pending',
  support_email text,
  support_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.independent_partner_memberships (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.independent_partners(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'dispatcher', 'support')),
  created_at timestamptz not null default now(),
  unique (partner_id, user_id)
);

alter table public.stores
  add column independent_delivery_enabled boolean not null default false;

alter table public.courier_profiles
  add column network_type public.courier_network_type not null default 'platform',
  add column independent_partner_id uuid references public.independent_partners(id) on delete restrict,
  add constraint courier_network_partner_consistency check (
    (network_type = 'platform' and independent_partner_id is null)
    or (network_type = 'independent_partner' and independent_partner_id is not null)
  );

alter table public.courier_assignments
  add column network_type public.courier_network_type not null default 'platform',
  add column independent_partner_id uuid references public.independent_partners(id) on delete restrict,
  add constraint assignment_network_partner_consistency check (
    (network_type = 'platform' and independent_partner_id is null)
    or (network_type = 'independent_partner' and independent_partner_id is not null)
  );

create index independent_memberships_user_idx
  on public.independent_partner_memberships(user_id, partner_id);
create index partner_couriers_idx
  on public.courier_profiles(independent_partner_id, status)
  where network_type = 'independent_partner';

create trigger independent_partners_touch before update on public.independent_partners
  for each row execute function private.touch_updated_at();

create or replace function private.is_independent_partner_member(
  p_partner_id uuid,
  p_roles text[] default null
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.independent_partner_memberships m
    where m.partner_id = p_partner_id
      and m.user_id = (select auth.uid())
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

create or replace function private.is_independent_partner_active(p_partner_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.independent_partners p
    where p.id = p_partner_id and p.status = 'active'
  );
$$;

revoke all on function private.is_independent_partner_member(uuid, text[]) from public, anon;
revoke all on function private.is_independent_partner_active(uuid) from public, anon;
grant execute on function private.is_independent_partner_member(uuid, text[]) to authenticated;
grant execute on function private.is_independent_partner_active(uuid) to authenticated;

alter table public.independent_partners enable row level security;
alter table public.independent_partner_memberships enable row level security;

create policy independent_partners_read_authorized on public.independent_partners
for select to authenticated
using (
  private.is_ops_admin()
  or private.is_independent_partner_member(id, array['owner','dispatcher','support'])
);

create policy independent_partner_members_read_self_or_ops on public.independent_partner_memberships
for select to authenticated
using (user_id = (select auth.uid()) or private.is_ops_admin());

create policy courier_profiles_read_partner_members on public.courier_profiles
for select to authenticated
using (
  network_type = 'independent_partner'
  and private.is_independent_partner_member(independent_partner_id, array['owner','dispatcher','support'])
);

create policy courier_assignments_read_partner_members on public.courier_assignments
for select to authenticated
using (
  network_type = 'independent_partner'
  and private.is_independent_partner_member(independent_partner_id, array['owner','dispatcher','support'])
);

revoke all on public.independent_partners, public.independent_partner_memberships from anon, authenticated;
grant select on public.independent_partners, public.independent_partner_memberships to authenticated;
grant select on public.courier_profiles, public.courier_assignments to authenticated;

-- Replace checkout to validate all three fulfilment choices server-side.
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
  where s.id = p_store_id
    and s.is_active and s.accepts_orders
    and private.is_merchant_active(s.merchant_id)
  for share;
  if not found then raise exception 'store_unavailable'; end if;

  if cardinality(v_store.service_postal_codes) = 0 then raise exception 'store_service_area_not_configured'; end if;

  if p_fulfillment_method = 'platform' and not v_store.platform_delivery_enabled then
    raise exception 'platform_delivery_unavailable';
  elsif p_fulfillment_method = 'merchant' and not v_store.merchant_delivery_enabled then
    raise exception 'merchant_delivery_unavailable';
  elsif p_fulfillment_method = 'independent' and not v_store.independent_delivery_enabled then
    raise exception 'independent_delivery_unavailable';
  elsif p_fulfillment_method not in ('platform', 'merchant', 'independent') then
    raise exception 'unsupported_fulfillment_method';
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
      or coalesce(x.value ->> 'quantity', '') not in (
        '1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20',
        '21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40',
        '41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59','60',
        '61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80',
        '81','82','83','84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99'
      )
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

-- Dispatch may offer a platform-fleet courier or a courier belonging to an active independent partner.
create or replace function public.dispatch_order_to_courier(p_order_id uuid, p_courier_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_assignment_id uuid;
  v_network public.courier_network_type;
  v_partner_id uuid;
begin
  if auth.uid() is null or not private.is_ops_admin() then raise exception 'ops_admin_required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status <> 'ready_for_pickup' or v_order.fulfillment_method not in ('platform', 'independent') then
    raise exception 'order_not_ready_for_network_dispatch';
  end if;

  select cp.network_type, cp.independent_partner_id
    into v_network, v_partner_id
  from public.courier_profiles cp
  where cp.user_id = p_courier_user_id and cp.status = 'approved'
  for update;
  if not found then raise exception 'courier_not_approved'; end if;

  if v_order.fulfillment_method = 'platform' and v_network <> 'platform' then
    raise exception 'courier_network_mismatch';
  elsif v_order.fulfillment_method = 'independent' and v_network <> 'independent_partner' then
    raise exception 'courier_network_mismatch';
  elsif v_order.fulfillment_method = 'independent' and not private.is_independent_partner_active(v_partner_id) then
    raise exception 'independent_partner_not_active';
  end if;

  insert into public.courier_assignments (
    order_id, courier_user_id, status, network_type, independent_partner_id
  ) values (
    p_order_id, p_courier_user_id, 'offered', v_network, v_partner_id
  )
  returning id into v_assignment_id;

  update public.orders set status = 'courier_assigned' where id = p_order_id;
  insert into public.order_events (order_id, actor_user_id, from_status, to_status, reason)
  values (
    p_order_id, auth.uid(), v_order.status, 'courier_assigned',
    case when v_network = 'platform' then 'Platform courier offer created' else 'Independent partner courier offer created' end
  );
  return v_assignment_id;
end;
$$;
revoke all on function public.dispatch_order_to_courier(uuid, uuid) from public, anon;
grant execute on function public.dispatch_order_to_courier(uuid, uuid) to authenticated;

-- Express parcel requests have their own quote and job lifecycle; they are not fake restaurant orders.
create type public.express_delivery_status as enum ('requested', 'quoted', 'accepted', 'courier_assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled');

create table public.express_deliveries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  pickup_contact_name text not null,
  pickup_phone text not null,
  pickup_address_snapshot jsonb not null,
  dropoff_contact_name text not null,
  dropoff_phone text not null,
  dropoff_address_snapshot jsonb not null,
  parcel_description text not null check (char_length(parcel_description) between 1 and 500),
  parcel_size text not null check (parcel_size in ('small','medium','large')),
  scheduled_at timestamptz,
  status public.express_delivery_status not null default 'requested',
  quoted_fee_cents integer check (quoted_fee_cents is null or quoted_fee_cents >= 0),
  currency char(3) not null default 'EUR' check (currency = 'EUR'),
  accepted_fulfillment_method public.fulfillment_method,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.express_delivery_assignments (
  id uuid primary key default gen_random_uuid(),
  express_delivery_id uuid not null references public.express_deliveries(id) on delete cascade,
  courier_user_id uuid not null references public.courier_profiles(user_id) on delete restrict,
  network_type public.courier_network_type not null,
  independent_partner_id uuid references public.independent_partners(id) on delete restrict,
  status public.courier_assignment_status not null default 'offered',
  offered_at timestamptz not null default now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (network_type = 'platform' and independent_partner_id is null)
    or (network_type = 'independent_partner' and independent_partner_id is not null)
  )
);

create index express_deliveries_customer_created_idx on public.express_deliveries(customer_id, created_at desc);
create unique index express_delivery_one_active_assignment_idx
  on public.express_delivery_assignments(express_delivery_id)
  where status in ('offered','accepted','picked_up');

create trigger express_deliveries_touch before update on public.express_deliveries
  for each row execute function private.touch_updated_at();

create trigger express_delivery_assignments_touch before update on public.express_delivery_assignments
  for each row execute function private.touch_updated_at();

alter table public.express_deliveries enable row level security;
alter table public.express_delivery_assignments enable row level security;

create policy express_deliveries_read_authorized on public.express_deliveries
for select to authenticated
using (
  customer_id = (select auth.uid())
  or private.is_ops_admin()
  or exists (
    select 1 from public.express_delivery_assignments a
    where a.express_delivery_id = id
      and (a.courier_user_id = (select auth.uid())
        or private.is_independent_partner_member(a.independent_partner_id, array['owner','dispatcher','support']))
  )
);

create policy express_assignments_read_authorized on public.express_delivery_assignments
for select to authenticated
using (
  courier_user_id = (select auth.uid())
  or private.is_ops_admin()
  or private.is_independent_partner_member(independent_partner_id, array['owner','dispatcher','support'])
);

revoke all on public.express_deliveries, public.express_delivery_assignments from anon, authenticated;
grant select on public.express_deliveries, public.express_delivery_assignments to authenticated;

-- Service bookings are requests to a verified provider, not deliveries of a basket.
create type public.service_booking_status as enum ('requested', 'quoted', 'confirmed', 'scheduled', 'completed', 'rejected', 'cancelled');

create table public.service_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  service_title text not null check (char_length(service_title) between 1 and 160),
  request_description text not null check (char_length(request_description) between 1 and 1500),
  requested_start timestamptz,
  service_address_snapshot jsonb,
  status public.service_booking_status not null default 'requested',
  quoted_price_cents integer check (quoted_price_cents is null or quoted_price_cents >= 0),
  currency char(3) not null default 'EUR' check (currency = 'EUR'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_bookings_customer_created_idx on public.service_bookings(customer_id, created_at desc);
create index service_bookings_store_status_idx on public.service_bookings(store_id, status, created_at desc);
create trigger service_bookings_touch before update on public.service_bookings
  for each row execute function private.touch_updated_at();

alter table public.service_bookings enable row level security;
create policy service_bookings_read_authorized on public.service_bookings
for select to authenticated
using (
  customer_id = (select auth.uid())
  or private.is_ops_admin()
  or private.is_merchant_member(store_id, array['owner','manager','staff'])
);
create policy service_bookings_insert_customer on public.service_bookings
for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and exists (
    select 1 from public.stores s
    where s.id = store_id and s.store_type = 'service_provider'
      and s.is_active
  )
);
revoke all on public.service_bookings from anon, authenticated;
grant select on public.service_bookings to authenticated;
grant insert (customer_id, store_id, service_title, request_description, requested_start, service_address_snapshot)
  on public.service_bookings to authenticated;

commit;
