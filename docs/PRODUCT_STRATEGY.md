# E-DELIVERY — Product and business strategy

## Product vision

Build one connected marketplace for everyday needs across Greece: food, groceries, local shops, express parcels and bookable local services. E-DELIVERY is not a restaurant-only ordering clone. It is a shared local-commerce, fulfilment and merchant-services ecosystem.

**Brand:** E-DELIVERY  
**Promise:** Everything you need. Delivered.  
**Visual identity:** Red `#E31E24`, yellow `#FFC928`, charcoal `#171717`, white and light grey.

## Product categories

- **Food:** restaurants, cafés, bakeries and takeaway.
- **Groceries:** supermarkets, mini markets and convenience.
- **Local commerce:** pharmacies, pet shops, florists and eligible retail.
- **Express:** parcels, local delivery and same-day delivery.
- **Local services:** discoverable providers, service requests and appointment bookings.

A retail basket, parcel shipment and appointment booking are different domain workflows. Do not force every transaction into a restaurant-cart schema. Reuse identity, payments, support, fulfilment and audit services while preserving category-specific data and lifecycles.

## Fulfilment strategy — three networks

1. **Merchant fleet:** the merchant accepts and fulfils the order using its own approved delivery operation.
2. **E-DELIVERY fleet:** an eligible courier approved for the platform fleet receives and accepts a task.
3. **Independent partner network:** a verified courier or delivery partner receives eligible tasks under the partner's active agreement.

A technical network assignment does not determine a courier's legal employment status. Greek legal advice must review the real working relationship, contracts, insurance, algorithmic management, occupational safety and tax treatment.

Record fulfilment source, partner/merchant relationship, task offer, acceptance, payout basis and full status history. Customers see only options actually available for the store, destination, category and time. Operations intervention must be authorized and audited.

## Nationwide strategy

The data model supports Greek regions, cities, postcodes and service zones. Do not hard-code Athens as the only service location. The public launch may be coordinated nationwide across **prepared regions**, but each region is enabled only after verifying:
- participating merchants and accurate catalogues;
- operating hours and service postcodes/zones;
- merchant, platform and independent fulfilment capacity;
- realistic ETAs, fees and traffic/weather contingencies;
- support coverage, safety and incident response;
- positive or improving contribution economics.

Unsupported postcodes must show unavailable or coming soon. Never accept an order without a credible fulfilment path.

## Four connected experiences

### Customer application
Discovery, address selection, category search, merchant/product/service details, transparent cart/quote, payment, tracking, support, order history, reviews and account controls.

### Merchant platform
Application and verification, multi-store profile, opening schedule, catalogue and modifiers, inventory, order acceptance, preparation and handover, own-fleet configuration, performance, statements and support.

### Courier application
Eligibility and onboarding, online/availability controls, task offers with compensation shown up front, pickup, navigation, proof of delivery, exceptions, earnings statement, support and safety.

### Central administration
Business overview, customer/merchant/courier/partner management, service zones, live orders, manual and assisted dispatch, commissions, partner/merchant settlements, refunds, disputes, promotions, support, audit, risk and analytics.

Merchant and operations UI may share a web codebase, but require separate role-scoped navigation and server-enforced permissions.

## Commercial model

Potential revenue streams:
- merchant commission on eligible transactions;
- transparent delivery charges;
- optional premium merchant software;
- clearly labelled promoted placements;
- customer membership only when unit economics support its benefits;
- corporate accounts and scheduled business delivery.

Keep merchant gross sales, platform revenue, customer fees, courier compensation, partner payable, tax, refunds, discounts and payment fees as separate ledger entries. Gross order value is not platform revenue.

### Contribution margin

`Net platform contribution = commission revenue + retained delivery revenue + allocated subscription/advertising revenue − courier/partner payouts − payment costs − platform-funded discounts/refunds − variable support/operations costs.`

Track margin by order, merchant, fulfilment network, category, city and zone. Fixed staff, technology, insurance, marketing and administration sit below contribution margin.

## Competitive principles

**Consumers:** transparent total price, accurate availability, clear ETAs, reliable status, easy support and repeat ordering.

**Merchants:** fair terms, control of own delivery, catalogue tools, reliable operations, transparent statements and useful business insights.

**Couriers/partners:** compensation and relevant distance/time before acceptance, safe workflows, clear task history, reliable payout statements, appeals and minimal location collection.

**Platform:** fraud controls, human review for consequential decisions, measurable service quality, sustainable local density and accurate financial records.

## Nationwide rollout gates

Build nationwide capability in the data model. Activate only verified zones. Expansion depends on completed-order quality, merchant acceptance, courier availability, support capacity, repeat demand and contribution margin. Do not buy growth with permanent discounts or over-promise coverage.

## Future differentiators

Assisted dispatch, POS/KDS integrations, shared loyalty, scheduled orders, corporate accounts, merchant marketing, AI-assisted forecasts with human review, unified support, offline-safe courier synchronization and auditable recovery.
