-- Customer request entry points for express parcels and local service discovery.
-- Requests are not orders: no payment is captured and no delivery price is invented.
begin;

-- Publish verified local service providers in the discovery catalogue.
create policy stores_public_service_providers_read on public.stores
for select to anon, authenticated
using (
  is_active
  and store_type = 'service_provider'
  and private.is_merchant_active(merchant_id)
);

-- Idempotent request keys protect customers from accidental duplicate submissions.
alter table public.express_deliveries
  add column idempotency_key text not null default ('legacy-' || gen_random_uuid()::text),
  add column request_fingerprint text not null default 'legacy';
alter table public.express_deliveries
  add constraint express_deliveries_customer_idempotency_unique unique (customer_id, idempotency_key);

create or replace function public.create_express_delivery_request(
  p_pickup_address_id uuid,
  p_dropoff_address_id uuid,
  p_pickup_contact_name text,
  p_pickup_phone text,
  p_dropoff_contact_name text,
  p_dropoff_phone text,
  p_parcel_description text,
  p_parcel_size text,
  p_scheduled_at timestamptz,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid := auth.uid();
  v_pickup public.customer_addresses%rowtype;
  v_dropoff public.customer_addresses%rowtype;
  v_request_id uuid;
  v_fingerprint text;
  v_existing_fingerprint text;
begin
  if v_customer_id is null then raise exception 'authentication_required'; end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 or char_length(p_idempotency_key) > 120 then
    raise exception 'invalid_idempotency_key';
  end if;
  if p_pickup_address_id is null or p_dropoff_address_id is null then
    raise exception 'both_addresses_required';
  end if;
  if char_length(trim(coalesce(p_pickup_contact_name,''))) not between 1 and 120
     or char_length(trim(coalesce(p_dropoff_contact_name,''))) not between 1 and 120 then
    raise exception 'contact_name_required';
  end if;
  if char_length(trim(coalesce(p_pickup_phone,''))) not between 5 and 32
     or char_length(trim(coalesce(p_dropoff_phone,''))) not between 5 and 32 then
    raise exception 'valid_contact_phone_required';
  end if;
  if char_length(trim(coalesce(p_parcel_description,''))) not between 1 and 500 then
    raise exception 'parcel_description_required';
  end if;
  if p_parcel_size is null or p_parcel_size not in ('small','medium','large') then
    raise exception 'invalid_parcel_size';
  end if;
  if p_scheduled_at is not null and p_scheduled_at < now() + interval '30 minutes' then
    raise exception 'scheduled_time_must_be_in_future';
  end if;

  v_fingerprint := md5(jsonb_build_object(
    'pickup_address', p_pickup_address_id,
    'dropoff_address', p_dropoff_address_id,
    'pickup_name', trim(p_pickup_contact_name),
    'pickup_phone', trim(p_pickup_phone),
    'dropoff_name', trim(p_dropoff_contact_name),
    'dropoff_phone', trim(p_dropoff_phone),
    'description', trim(p_parcel_description),
    'size', p_parcel_size,
    'scheduled_at', p_scheduled_at
  )::text);

  select d.id, d.request_fingerprint
    into v_request_id, v_existing_fingerprint
  from public.express_deliveries d
  where d.customer_id = v_customer_id and d.idempotency_key = p_idempotency_key;
  if found then
    if v_existing_fingerprint is distinct from v_fingerprint then
      raise exception 'idempotency_key_reused_with_different_payload';
    end if;
    return v_request_id;
  end if;

  select * into v_pickup
  from public.customer_addresses a
  where a.id = p_pickup_address_id and a.customer_id = v_customer_id;
  if not found then raise exception 'pickup_address_not_owned'; end if;

  select * into v_dropoff
  from public.customer_addresses a
  where a.id = p_dropoff_address_id and a.customer_id = v_customer_id;
  if not found then raise exception 'dropoff_address_not_owned'; end if;

  insert into public.express_deliveries (
    customer_id,
    pickup_contact_name, pickup_phone, pickup_address_snapshot,
    dropoff_contact_name, dropoff_phone, dropoff_address_snapshot,
    parcel_description, parcel_size, scheduled_at, status,
    quoted_fee_cents, currency, accepted_fulfillment_method,
    idempotency_key, request_fingerprint
  ) values (
    v_customer_id,
    trim(p_pickup_contact_name), trim(p_pickup_phone),
    jsonb_build_object(
      'label', v_pickup.label, 'line1', v_pickup.line1, 'line2', v_pickup.line2,
      'city', v_pickup.city, 'region', v_pickup.region, 'postal_code', v_pickup.postal_code,
      'latitude', v_pickup.latitude, 'longitude', v_pickup.longitude,
      'delivery_instructions', v_pickup.delivery_instructions
    ),
    trim(p_dropoff_contact_name), trim(p_dropoff_phone),
    jsonb_build_object(
      'label', v_dropoff.label, 'line1', v_dropoff.line1, 'line2', v_dropoff.line2,
      'city', v_dropoff.city, 'region', v_dropoff.region, 'postal_code', v_dropoff.postal_code,
      'latitude', v_dropoff.latitude, 'longitude', v_dropoff.longitude,
      'delivery_instructions', v_dropoff.delivery_instructions
    ),
    trim(p_parcel_description), p_parcel_size, p_scheduled_at, 'requested',
    null, 'EUR', null,
    p_idempotency_key, v_fingerprint
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_express_delivery_request(
  uuid, uuid, text, text, text, text, text, text, timestamptz, text
) from public, anon;
grant execute on function public.create_express_delivery_request(
  uuid, uuid, text, text, text, text, text, text, timestamptz, text
) to authenticated;

commit;
