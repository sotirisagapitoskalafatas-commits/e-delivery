# Roadmap

## Foundation in this repository
- Monorepo, pinned dependency baseline and CI.
- Expo customer and courier clients.
- Next.js operations/merchant workspace.
- Shared money/order lifecycle rules and tests.
- Initial PostgreSQL schema, RLS, idempotent COD checkout and explicit order/courier RPCs.

## Next increments
### Merchant operations
- Merchant onboarding and document review.
- Menu/category/product CRUD, stock controls and opening schedules.
- Tablet notifications and acknowledgement SLA.
- Commission statements and merchant settlement exports.

### Delivery operations
- Map provider, geocoding and address validation.
- Service area/postcode coverage and distance-aware quotes.
- Courier onboarding, safety and insurance workflow.
- Dispatch board, availability, proof of delivery and incident handling.
- Limited location streaming for active jobs only.

### Payments and growth
- Contracted marketplace PSP, KYB, signed webhooks, idempotent refunds and settlement reconciliation.
- Search, favourites, reorder, ratings, support, referral and loyalty wallet.
- Greek/English localisation and accessibility.
- Subscription only after per-order contribution economics work.

### Reliability
- Transactional outbox and durable queue.
- Rate limits, fraud controls, alerting and audit trails.
- Load tests, backups/restore drills, disaster recovery and incident response.

## Pilot exit criteria
- Critical end-to-end tests pass on real iOS and Android devices.
- RLS tests prove cross-customer, cross-merchant and cross-courier isolation.
- COD reconciliation is auditable.
- Delivery times and coverage are measured in the field.
- Customer support, refunds, incidents and courier safety are staffed.
- Per-order contribution margin is viable before opening another zone.
