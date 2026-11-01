# E-DELIVERY — Everything you need. Delivered.

A nationwide, multi-category local-commerce and delivery ecosystem for Greece.

**Brand:** E-DELIVERY  
**Promise:** Everything you need, delivered.  
**Visual identity:** Red `#E31E24`, yellow `#FFC928`, charcoal `#171717`, white and light grey.  
**Geographic ambition:** Nationwide product architecture and prepared-region public launch. Coverage is activated only where verified merchants, eligible fulfilment capacity and support exist.

## One connected ecosystem, four experiences

| Product | Workspace | Technology |
| --- | --- | --- |
| Customer application | `apps/customer` | React Native + Expo |
| Merchant platform | `apps/ops` | Next.js + TypeScript |
| Central administration | `apps/ops` | Next.js + TypeScript, role-scoped |
| Courier application | `apps/courier` | React Native + Expo |
| Shared domain | `packages/domain` | TypeScript |
| Backend | `supabase` | PostgreSQL, Auth, RLS and transactional RPC |

The merchant and operations experiences currently share one web application with role-scoped navigation and permissions.

## Marketplace scope

- Food: restaurants, cafés and bakeries.
- Groceries: supermarkets, mini markets and convenience stores.
- Local commerce: pharmacies, pet shops, flowers and retail.
- Express: local parcels and same-day delivery.
- Local services: discoverable providers and bookable services.

## Three fulfilment networks

1. Merchant-owned delivery fleets.
2. E-DELIVERY's platform courier fleet.
3. Approved independent courier and delivery partners.

Customers see only eligible options for the selected merchant and address. Nationwide architecture is not a claim that every Greek postcode is already serviceable.

## Implementation status

This repository is an evolving foundation, **not MVP 1.0 and not yet approved for public launch**. It contains early customer/courier apps, a Next.js operations workspace, an initial marketplace schema, protected order/dispatch RPCs and a basic merchant catalogue. Initial checkout is cash on delivery only.

Production card processing, refunds, live map tracking, push delivery, courier earnings ledger, independent partner settlements, service-booking workflows and nationwide operational coverage are not yet complete. See [MVP 1.0 checklist](docs/MVP_1_0_CHECKLIST.md) and [product strategy](docs/PRODUCT_STRATEGY.md).

## Start here

1. [Getting started](docs/GETTING_STARTED.md)
2. [Architecture and trust boundaries](docs/ARCHITECTURE.md)
3. [Trusted account provisioning](docs/PROVISIONING.md)
4. [Product strategy](docs/PRODUCT_STRATEGY.md)
5. [MVP 1.0 acceptance checklist](docs/MVP_1_0_CHECKLIST.md)
6. [Launch gates](docs/LAUNCH_GATES.md)

Use a **dedicated Supabase project**. Do not apply these migrations to an unrelated CRM. Do not seed invented merchants, prices, coverage areas, courier capacity or business metrics.

## Business principle

Win through a better customer experience, a fairer merchant relationship, transparent courier economics and strong local delivery density. Measure contribution margin per completed order—not gross order value alone.
