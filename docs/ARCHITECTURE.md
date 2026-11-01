# Architecture

## Product surfaces
1. `apps/customer`: Expo / React Native customer application.
2. `apps/courier`: Expo / React Native courier application.
3. `apps/ops`: Next.js merchant and operations workspace.
4. `packages/domain`: framework-independent money and order lifecycle rules.
5. `supabase`: PostgreSQL schema, RLS and transactional RPC functions.

The web workspace is role-aware. A dedicated merchant tablet surface can be split out later without changing the domain or database contract.

## Trust boundaries
- Browser and mobile clients use only the Supabase publishable key.
- Authenticated identity comes from Supabase Auth; user metadata is not authorization.
- `profiles.role` is provisioned by a trusted operator. Signups always default to customer.
- Every exposed table has RLS. Merchant access is restricted to store membership.
- Order totals are recalculated server-side from database product prices and store delivery settings. Client totals are never accepted.
- The order function is SECURITY DEFINER because it writes the order, line snapshots and initial event atomically while direct client writes stay revoked. It checks `auth.uid()`, validates ownership and inputs, has an empty search_path and is executable only by authenticated users. Helper SECURITY DEFINER functions stay in the non-exposed private schema.
- PSP credentials and webhook secrets belong only in server-side secret storage.

## Order lifecycle
`pending_merchant -> accepted -> preparing -> ready_for_pickup -> courier_assigned -> picked_up -> delivered`
Terminal alternatives: `rejected`, `cancelled`.

Merchant delivery may be marked delivered by an authorized store member. Platform delivery is dispatched by operations to an approved courier; the courier accepts, confirms pickup and confirms delivery. Every state transition creates an order event.

## Money and payment
- Currency is EUR and amounts are integer cents.
- Customer sends product IDs, quantities, fulfilment method, an owned address ID and an idempotency key.
- Database validates store/fulfilment availability, address ownership, product availability, quantities and minimum basket.
- Price snapshots and totals come from database rows, not the app.
- Initial payment is cash on delivery. State remains due-on-delivery until an authorized cash reconciliation flow records collection.
- Card acceptance needs a contracted marketplace PSP, seller onboarding, signed webhooks, an idempotent ledger, refunds and settlement reconciliation. A browser redirect is not proof of payment.

## Reliability and privacy
- Unique `(customer_id, idempotency_key)` plus transactional order creation prevents duplicate order writes.
- Lock target order/assignment rows before validating transitions.
- Future notifications must use an outbox and durable queue; Realtime is a UI update channel, not a job queue.
- Do not request continuous courier location in this foundation. Future location processing must be disclosed, limited to active work and retained for a reviewed period.
