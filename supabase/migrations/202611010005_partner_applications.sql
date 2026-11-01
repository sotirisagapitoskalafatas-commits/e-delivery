-- Public partner interest intake. Personal data is readable only by OPS admins.
begin;

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  application_type text not null check (application_type in ('merchant','courier')),
  status text not null default 'pending_review'
    check (status in ('pending_review','in_review','contacted','approved','declined')),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 100),
  email text not null check (char_length(email) between 5 and 254),
  phone text not null check (char_length(phone) between 7 and 32),
  city text not null check (char_length(city) between 1 and 100),

  business_name text,
  business_type text,
  address_line text,
  postal_code text,
  fulfillment_interests text[] not null default '{}',

  vehicle_type text,
  courier_network_preference text,
  age_confirmed boolean not null default false,
  has_valid_driver_license boolean not null default false,
  has_smartphone boolean not null default false,

  privacy_notice_acknowledged boolean not null default false
    check (privacy_notice_acknowledged),
  internal_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_applications_email_format check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  constraint partner_applications_postal_format check (
    postal_code is null or postal_code ~ '^\d{5}$'
  ),
  constraint partner_applications_form_shape check (
    (
      application_type = 'merchant'
      and business_name is not null and char_length(business_name) between 2 and 180
      and business_type is not null and business_type in (
        'restaurant','cafe','bakery','supermarket','convenience','retail',
        'pharmacy','flower_shop','pet_shop','service_provider','other'
      )
      and address_line is not null and char_length(address_line) between 2 and 250
      and postal_code is not null
      and cardinality(fulfillment_interests) > 0
      and fulfillment_interests <@ array['merchant','platform','independent']::text[]
      and vehicle_type is null and courier_network_preference is null
    )
    or
    (
      application_type = 'courier'
      and business_name is null and business_type is null
      and address_line is null and postal_code is null
      and cardinality(fulfillment_interests) = 0
      and vehicle_type in ('bicycle','motorcycle','car')
      and courier_network_preference in ('platform','independent_partner','merchant_fleet')
      and age_confirmed
      and has_smartphone
      and (vehicle_type = 'bicycle' or has_valid_driver_license)
    )
  )
);

create index partner_applications_status_created_idx
  on public.partner_applications(status, created_at desc);
create index partner_applications_type_created_idx
  on public.partner_applications(application_type, created_at desc);
create unique index partner_applications_one_open_email_idx
  on public.partner_applications(application_type, lower(email))
  where status in ('pending_review','in_review','contacted');

alter table public.partner_applications enable row level security;

create policy partner_applications_read_ops
  on public.partner_applications
  for select to authenticated
  using (private.is_ops_admin());

revoke all on public.partner_applications from public, anon, authenticated;
grant select on public.partner_applications to authenticated;

create or replace function public.submit_partner_application(
  p_application_type text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_business_name text,
  p_business_type text,
  p_address_line text,
  p_postal_code text,
  p_fulfillment_interests text[],
  p_vehicle_type text,
  p_courier_network_preference text,
  p_age_confirmed boolean,
  p_has_valid_driver_license boolean,
  p_has_smartphone boolean,
  p_privacy_notice_acknowledged boolean,
  p_website text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application_id uuid;
begin
  -- Honeypot: silently ignore automated submissions.
  if nullif(trim(coalesce(p_website,'')), '') is not null then
    return null;
  end if;

  if p_application_type not in ('merchant','courier') then
    raise exception 'invalid_application_type';
  end if;
  if char_length(trim(coalesce(p_first_name,''))) not between 1 and 80
     or char_length(trim(coalesce(p_last_name,''))) not between 1 and 100 then
    raise exception 'valid_name_required';
  end if;
  if trim(coalesce(p_email,'')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'valid_email_required';
  end if;
  if char_length(trim(coalesce(p_phone,''))) not between 7 and 32 then
    raise exception 'valid_phone_required';
  end if;
  if char_length(trim(coalesce(p_city,''))) not between 1 and 100 then
    raise exception 'city_required';
  end if;
  if p_privacy_notice_acknowledged is distinct from true then
    raise exception 'privacy_notice_required';
  end if;

  if p_application_type = 'merchant' then
    if char_length(trim(coalesce(p_business_name,''))) not between 2 and 180
       or p_business_type not in (
        'restaurant','cafe','bakery','supermarket','convenience','retail',
        'pharmacy','flower_shop','pet_shop','service_provider','other'
       )
       or char_length(trim(coalesce(p_address_line,''))) not between 2 and 250
       or trim(coalesce(p_postal_code,'')) !~ '^\d{5}$'
       or coalesce(cardinality(p_fulfillment_interests),0) = 0
       or not (p_fulfillment_interests <@ array['merchant','platform','independent']::text[]) then
      raise exception 'merchant_application_incomplete';
    end if;
  else
    if p_vehicle_type not in ('bicycle','motorcycle','car')
       or p_courier_network_preference not in ('platform','independent_partner','merchant_fleet')
       or p_age_confirmed is distinct from true
       or p_has_smartphone is distinct from true
       or (p_vehicle_type in ('motorcycle','car') and p_has_valid_driver_license is distinct from true) then
      raise exception 'courier_eligibility_fields_incomplete';
    end if;
  end if;

  insert into public.partner_applications (
    application_type, first_name, last_name, email, phone, city,
    business_name, business_type, address_line, postal_code, fulfillment_interests,
    vehicle_type, courier_network_preference, age_confirmed,
    has_valid_driver_license, has_smartphone, privacy_notice_acknowledged
  ) values (
    p_application_type, trim(p_first_name), trim(p_last_name), lower(trim(p_email)),
    trim(p_phone), trim(p_city),
    nullif(trim(coalesce(p_business_name,'')),''), nullif(p_business_type,''),
    nullif(trim(coalesce(p_address_line,'')),''), nullif(trim(coalesce(p_postal_code,'')),''),
    coalesce(p_fulfillment_interests,'{}'::text[]),
    nullif(p_vehicle_type,''), nullif(p_courier_network_preference,''),
    coalesce(p_age_confirmed,false), coalesce(p_has_valid_driver_license,false),
    coalesce(p_has_smartphone,false), true
  )
  returning id into v_application_id;

  return v_application_id;
exception
  when unique_violation then
    raise exception 'application_already_exists';
end;
$$;

revoke all on function public.submit_partner_application(
  text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text
) from public, anon, authenticated;
grant execute on function public.submit_partner_application(
  text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text
) to anon, authenticated;

create or replace function public.review_partner_application(
  p_application_id uuid,
  p_new_status text,
  p_internal_note text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_ops_admin() then
    raise exception 'ops_admin_required';
  end if;
  if p_new_status not in ('pending_review','in_review','contacted','approved','declined') then
    raise exception 'invalid_application_status';
  end if;
  if p_internal_note is not null and char_length(p_internal_note) > 2000 then
    raise exception 'internal_note_too_long';
  end if;

  update public.partner_applications
  set status = p_new_status,
      internal_note = nullif(trim(coalesce(p_internal_note,'')),''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_application_id;

  return found;
end;
$$;

revoke all on function public.review_partner_application(uuid,text,text) from public, anon, authenticated;
grant execute on function public.review_partner_application(uuid,text,text) to authenticated;

commit;
