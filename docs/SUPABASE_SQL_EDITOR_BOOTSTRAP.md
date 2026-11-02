# E-DELIVERY — Supabase SQL Editor bootstrap runbook

Use this only for the dedicated E-DELIVERY Supabase project.

- Expected project reference: `jaemcwsyhmgcjbudhlma`
- Dashboard: https://supabase.com/dashboard/project/jaemcwsyhmgcjbudhlma
- SQL Editor: https://supabase.com/dashboard/project/jaemcwsyhmgcjbudhlma/sql/new

Do not run these migrations against either Hlektrismos project. Confirm the project reference in the dashboard URL before every execution.

## Important recovery note

The first migration previously failed because two SQL function bodies used `AS $` / `$;` instead of `AS $$` / `$$;`. This has been corrected on `main` (merge commit `73a48bcd190a8035810f2a2d0cc81b7641fd78b6`). The CI pipeline now also rejects that malformed delimiter pattern.

Migration 001 starts an explicit transaction. A SQL error should abort that transaction, but verify the actual database state before retrying. Do not manually create missing tables or enums.

## 1. Inspect the current database first

Run this read-only query:

```sql
select
  to_regclass('public.profiles') as profiles,
  to_regclass('public.merchants') as merchants,
  to_regclass('public.merchant_memberships') as merchant_memberships,
  to_regclass('public.stores') as stores,
  to_regclass('public.categories') as categories,
  to_regclass('public.products') as products,
  to_regclass('public.orders') as orders,
  to_regtype('public.fulfillment_method') as fulfillment_method,
  to_regtype('public.store_type') as store_type;
```

If some of these objects already exist, stop and inspect which migrations were previously applied. Do not rerun non-idempotent migrations blindly. If all are null, proceed with the sequence below.

## 2. Apply migrations one at a time

In Supabase SQL Editor, create a new query for each migration, paste the complete contents of the linked file from the `main` branch, click Run, and wait for a successful result before moving on.

1. [001 — Initial marketplace](../supabase/migrations/202611010001_initial_marketplace.sql)
   Creates core roles, helper functions, merchants, stores, products, customer addresses, orders, RLS and supporting objects.
2. [002 — Independent fulfilment enum values](../supabase/migrations/202611010002_add_independent_fulfilment.sql)
   Adds enum values. **Run this as a separate query and let it commit before running 003.**
3. [003 — Multi-network and non-basket jobs](../supabase/migrations/202611010003_multi_network_and_non_basket_jobs.sql)
4. [004 — Express customer requests](../supabase/migrations/202611010004_express_customer_request.sql)
5. [005 — Partner applications](../supabase/migrations/202611010005_partner_applications.sql)
6. [006 — Partner application RPC server-only permissions](../supabase/migrations/202611020006_partner_application_rpc_server_only.sql)
7. [007 — Merchant media and storage policies](../supabase/migrations/202611020007_merchant_media.sql)
8. [008 — Weekly merchant opening hours](../supabase/migrations/202611020008_store_hours.sql)
9. [009 — Private customer store favourites](../supabase/migrations/202611020009_customer_favorites.sql)
10. [010 — Private customer support tickets and conversations](../supabase/migrations/202611020010_support_tickets.sql)
11. [011 — Support ticket activity timestamp permission](../supabase/migrations/202611020011_support_ticket_updated_at_grant.sql)

Do not paste all seven files into one SQL Editor execution. In particular, migration 002 must commit before migration 003 uses the enum value it adds.

If any migration fails, stop at that migration. Copy the complete error (including the line number) and inspect the database before retrying. Do not continue with later migrations.

## 3. Verify the core schema after 001

```sql
select
  to_regclass('public.profiles') is not null as profiles_created,
  to_regclass('public.merchants') is not null as merchants_created,
  to_regclass('public.merchant_memberships') is not null as memberships_created,
  to_regclass('public.stores') is not null as stores_created,
  to_regclass('public.categories') is not null as categories_created,
  to_regclass('public.products') is not null as products_created,
  to_regclass('public.orders') is not null as orders_created,
  to_regtype('public.fulfillment_method') is not null as fulfillment_type_created;
```

Every result should be `true` before continuing.

## 4. Verify the media schema after 007

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'stores'
  and column_name in ('logo_image_path', 'cover_image_path')
order by column_name;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'e-delivery-merchant-media';
```

Expected: both store-image columns are present, and the `e-delivery-merchant-media` bucket is public with a 5 MB upload limit and JPEG/PNG/WebP MIME types.

After migration 008, verify configured schedules with:

```sql
select store_id, count(*) as configured_weekday_slots
from public.store_hours
group by store_id
order by store_id;
```

A fully saved weekly schedule contains 14 rows per store (seven weekdays and two slots per day). A store with no rows has not configured its hours and must not be labelled open or closed.

After migration 009, verify that the private favorites table and its row-level security are enabled:

```sql
select
  to_regclass('public.customer_favorites') as customer_favorites_table,
  coalesce((
    select relrowsecurity
    from pg_class
    where oid = 'public.customer_favorites'::regclass
  ), false) as row_level_security_enabled;
```

The table must exist and RLS must be `true`. Favorites must only be readable, insertable and deletable by the matching signed-in customer.

After migration 010, verify support tables, RLS and the support helper:

```sql
select
  to_regclass('public.support_tickets') as support_tickets_table,
  to_regclass('public.support_ticket_messages') as support_messages_table,
  coalesce((select relrowsecurity from pg_class where oid = 'public.support_tickets'::regclass), false) as tickets_rls,
  coalesce((select relrowsecurity from pg_class where oid = 'public.support_ticket_messages'::regclass), false) as messages_rls,
  to_regprocedure('private.is_support_staff()') as support_role_helper,
  to_regprocedure('public.create_support_ticket(uuid,text,text,text)') as ticket_create_rpc,
  has_column_privilege('authenticated', 'public.support_tickets', 'updated_at', 'UPDATE') as support_can_refresh_activity;
```

Both tables must exist with RLS enabled, both functions must resolve, and `support_can_refresh_activity` must be `true`. Test with two separate customer accounts that each can only see their own ticket/messages, plus one `support` account that can only operate through the protected support inbox.

## 5. Finish with real-account verification

After migrations succeed:

- Sign in with a merchant owner/manager account and upload a store logo, cover image and product photo.
- Confirm a public customer session can view those images.
- Confirm a different merchant cannot upload into the first merchant's storage path.
- Confirm the customer app can browse stores and products.
- Run the Supabase Security and Performance Advisors and review any findings before public launch.

A green application build does not prove database migrations, RLS, storage permissions, payments or mobile-device flows are operational. Production launch requires those checks in the configured E-DELIVERY project.
