# API and RPC contract

The initial Supabase Data API is the application API. Exposed tables are protected by RLS; sensitive workflows use transactional RPC functions.

## Customer
Read active stores and catalogues, own addresses and own orders.

Write own `customer_addresses`. Checkout calls `rpc/create_marketplace_order` with:
- `p_store_id: uuid`
- `p_address_id: uuid`
- `p_fulfillment_method: 'platform' | 'merchant' | 'independent'`
- `p_items: [{ product_id: uuid, quantity: integer, notes?: string }]`
- `p_idempotency_key: string`
- Returns an order UUID. Payment is fixed to cash on delivery in the first release; price is read from the database.

## Merchant / operations
Read orders visible through membership or operations role.
- `rpc/set_merchant_order_status(p_order_id, p_new_status, p_reason)` applies the permitted merchant workflow and records an order event.
- `rpc/dispatch_order_to_courier(p_order_id, p_courier_user_id)` is operations-admin-only and creates an offer for an approved courier whose network matches the order: platform fleet for `platform`, or an active independent partner for `independent`.
- User roles, merchant activation, refunds, payment reconciliation and settlement are privileged procedures, not self-service.

## Courier
Read own assignments and permitted order details. Independent partner managers can read only their own partner and affiliated courier/assignment records.

## Express and local services
The schema now separates `express_deliveries` (parcel requests) from `orders` and adds `service_bookings` for bookable service providers. The parcel quote/checkout/assignment APIs and full service-provider status UI are not implemented yet; do not expose direct parcel table writes or present these as launch-ready flows.
- `rpc/accept_courier_assignment(p_assignment_id)`
- `rpc/set_courier_delivery_status(p_assignment_id, p_new_status)`, where new status is `picked_up` or `delivered` in sequence.

RPC exceptions should be mapped to friendly UI messages. Log correlation/order IDs, not access tokens or full delivery addresses.
