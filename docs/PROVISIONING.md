# Trusted account and merchant provisioning

There is intentionally no public role selector. Every new Auth account is created as a customer. Do not let users set `profiles.role` or merchant/courier approval using signup metadata.

Use the Supabase SQL editor as a trusted project operator after the user has registered and completed any required identity/business checks. Replace example email addresses and business details with verified real values.

## Promote the initial operations account

```sql
update public.profiles
set role = 'ops_admin'
where id = (
  select id from auth.users where email = 'ops@example.gr'
);
```

Run this only for the verified internal operator account. Enable MFA for privileged accounts.

## Create a merchant, store and first membership

```sql
update public.profiles
set role = 'merchant_admin'
where id = (select id from auth.users where email = 'verified-owner@example.gr');

with new_merchant as (
  insert into public.merchants (legal_name, display_name, status)
  values ('VERIFIED LEGAL ENTITY', 'VERIFIED STORE BRAND', 'pending')
  returning id
),
new_membership as (
  insert into public.merchant_memberships (merchant_id, user_id, role)
  select new_merchant.id, p.id, 'owner'
  from new_merchant
  join public.profiles p on p.id = (
    select id from auth.users where email = 'verified-owner@example.gr'
  )
  returning merchant_id
)
insert into public.stores (
  merchant_id, name, store_type, address_line, city, region, postal_code,
  service_postal_codes, is_active, accepts_orders,
  platform_delivery_enabled, merchant_delivery_enabled,
  minimum_order_cents, base_delivery_fee_cents
)
select merchant_id, 'VERIFIED STORE NAME', 'restaurant', 'VERIFIED ADDRESS',
       'Athens', 'Attica', '10500', array['10500'], false, false,
       true, false, 0, 0
from new_membership;
```

The postcode above is a placeholder format only; replace it with the real service postcodes verified in field operations. A store is intentionally inactive and cannot receive orders until the operator completes catalogue, legal, food-information, payment and service-area checks.

## Add a courier account

After the courier has registered and the operating model/contract, identity and safety checks are complete:

```sql
update public.profiles
set role = 'courier'
where id = (select id from auth.users where email = 'verified-courier@example.gr');

insert into public.courier_profiles (user_id, status, vehicle_type)
select id, 'pending', 'bicycle'
from public.profiles
where id = (select id from auth.users where email = 'verified-courier@example.gr');
```

Change courier status to `approved` only after all applicable checks. Keep evidence in an approved records system; do not upload identity documents into public storage.

## Add catalogue data

Use the trusted database operator or the forthcoming merchant catalogue UI to add categories and products. Product prices are integer cents, currency is EUR, tax rate must be reviewed by the accountant, and allergen data must be accurate. Do not invent product data.

## Activate a store

Only after the service postcode list, real menu, legal details, opening hours, fee, merchant agreement and fulfilment capability have been verified:

```sql
update public.stores
set is_active = true, accepts_orders = true
where id = 'VERIFIED_STORE_UUID';
```

RLS controls access to the catalogue and the checkout RPC checks that the customer's saved postcode is in the store service list.


## Register an independent delivery partner and affiliate couriers

Only after the partner's legal entity, commercial agreement, insurance/safety process and operational coverage have been verified:

```sql
-- First ensure the verified partner contact has an account.
update public.profiles
set role = 'courier'
where id = (select id from auth.users where email = 'verified-partner-courier@example.gr');

with partner as (
  insert into public.independent_partners (legal_name, display_name, status)
  values ('VERIFIED PARTNER LEGAL NAME', 'VERIFIED PARTNER BRAND', 'pending')
  returning id
),
membership as (
  insert into public.independent_partner_memberships (partner_id, user_id, role)
  select partner.id, p.id, 'owner'
  from partner
  join public.profiles p on p.id = (
    select id from auth.users where email = 'verified-partner-owner@example.gr'
  )
  returning partner_id
)
insert into public.courier_profiles (
  user_id, status, vehicle_type, network_type, independent_partner_id
)
select p.id, 'pending', 'bicycle', 'independent_partner', partner.id
from partner
join public.profiles p on p.id = (
  select id from auth.users where email = 'verified-partner-courier@example.gr'
);
```

The owner and courier can be different users. Add one membership per verified partner operator and one courier profile per verified courier. Set partner status to `active` and courier status to `approved` only after all required checks and agreements are complete. The technical network type does not decide the courier's legal worker classification.

A store may enable `independent_delivery_enabled` only after its commercial arrangement and the partner's service coverage are verified. The checkout RPC rejects an independent delivery selection when the store has not enabled it.
