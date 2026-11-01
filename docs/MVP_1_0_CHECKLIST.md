# E-DELIVERY — MVP 1.0 public-release checklist

This status reflects committed code, not the product wish list. A screen, table or placeholder button is not an end-to-end feature.

**Partial** means a limited foundation exists but essential workflows, integrations or tests remain. **Not started** means no usable end-to-end implementation exists. **Complete** requires implementation and acceptance verification in a configured environment.

No item is marked Complete yet. Production credentials, provider contracts, RLS test users and real-device verification have not been supplied or verified.

## 1. Customer application

| # | Requirement | Status | Remaining acceptance work |
|---:|---|---|---|
| 1 | Registration and account management | Partial | Email signup/sign-in exists; add phone/OTP, verification, recovery, profile editing, deletion and consent records. |
| 2 | Address and location selection | Partial | Saved address create/select exists; add map pin, geocoding, validation, multiple labels and coverage feedback. |
| 3 | Restaurant and local-shop discovery | Partial | Basic active-store list exists; add all categories, search, filters, ranking, distance, opening status and zone discovery. |
| 4 | Menus, products and modifiers | Partial | Product list and basic add/hide/delete exist; add editing, option groups, modifiers, images, stock and verified food/allergen fields. |
| 5 | Cart and checkout | Partial | Basic basket and server-priced COD checkout exist; add modifier pricing, full fee/discount validation, quote expiry and cancellation rules. |
| 6 | Payment integration | Not started | Contract a marketplace PSP; implement payment intents, signed webhooks, idempotency, refunds and reconciliation. COD is not card integration. |
| 7 | Live order tracking | Not started | Realtime events, active courier location, ETA, map and reconnect/privacy controls. |
| 8 | Push notifications | Not started | Device registration, durable outbox/queue, APNs/FCM delivery, preferences, retries and observability. |
| 9 | Order history and ratings | Partial | Basic order history exists; add detail/receipt, reorder, review moderation and merchant response. |
| 10 | Customer support | Not started | In-app cases, order context, attachments, response SLA and escalation. |

## 2. Merchant platform

| # | Requirement | Status | Remaining acceptance work |
|---:|---|---|---|
| 11 | Merchant registration and approval | Partial | Trusted manual provisioning exists; add application, document review, business verification and approval workflow. |
| 12 | Store profile and operating hours | Partial | Basic schema exists; add editor, multi-branch, weekly schedule, holiday exceptions and availability automation. |
| 13 | Menu/product management | Partial | Basic product add/hide/delete exists; add full CRUD, categories, modifiers, inventory, media and allergen controls. |
| 14 | Order acceptance and rejection | Partial | Protected status RPC exists; add merchant UI, rejection-reason flow, timers, timeout policy and notifications. |
| 15 | Preparation time management | Not started | Per-store defaults, per-order adjustments and performance reporting. |
| 16 | Order history and financial statements | Partial | Recent order list exists; add full history, commission detail, statements, settlements and exports. |

## 3. Courier application

| # | Requirement | Status | Remaining acceptance work |
|---:|---|---|---|
| 17 | Courier registration and approval | Partial | Sign-in and trusted provisioning exist; add application, eligibility/document workflow and partner affiliation. |
| 18 | Availability and online status | Not started | Online/offline, capacity, schedule, location permission and eligibility controls. |
| 19 | Delivery task offers | Partial | Admin can create a basic offer and courier can accept; add expiry, decline, reassignment and dispatch policies. |
| 20 | Task details and earnings | Partial | Order/address appears; add expected payout, relevant distance/time and confirmed earnings. |
| 21 | Navigation and delivery status | Partial | Pickup/delivered actions exist; add map navigation, arrival check-in, GPS/ETA and exception flows. |
| 22 | Proof of delivery | Not started | PIN/photo/signature, secure storage, retention and dispute workflow. |
| 23 | Earnings history and support | Not started | Courier ledger, payout schedule, statements, adjustments, support and safety incidents. |

## 4. Administration platform

| # | Requirement | Status | Remaining acceptance work |
|---:|---|---|---|
| 24 | Business-wide dashboard | Partial | Basic role-aware summary exists; add verified KPIs across orders, finance, coverage and service health. |
| 25 | Customer and merchant management | Partial | Membership and role foundation exists; add searchable records, applications, verification, suspension and support. |
| 26 | Courier management | Partial | Courier approval records exist; add applications, independent partners, affiliations, availability, payouts and incidents. |
| 27 | Order monitoring and manual dispatch | Partial | Recent orders, merchant transitions and platform assignment exist; add three networks, dispatch board, exceptions and reassignment. |
| 28 | Commission and settlement management | Not started | Versioned commercial rules, immutable ledger, merchant/partner statements, payouts and reconciliation. |
| 29 | Refunds and disputes | Not started | PSP-backed full/partial refunds, evidence, reason codes, communication and audit. |
| 30 | Promotions and discount controls | Not started | Funding source, eligibility, limits, stacking, abuse controls and reporting. |
| 31 | Security and audit logs | Partial | RLS and order events exist; add complete actor/action audit, MFA, role-isolation tests, alerting and retention. |
| 32 | Operational analytics | Not started | Verified category, zone, merchant, courier, fulfilment, retention, cancellations and contribution-margin analytics. |

## Public launch gate

Do not label MVP 1.0 launch-ready until every requirement has an acceptance test, blocking features are implemented, payment/notification providers are verified, cross-role RLS tests pass, both mobile platforms pass physical-device tests, backups are restored in a drill, support and operations are staffed, and Greek legal/accounting/privacy reviews are signed off.

Nationwide launch means every advertised zone is genuinely prepared. Do not enable postcodes merely to meet a launch headline.
