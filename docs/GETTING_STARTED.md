# Getting started

## Prerequisites
- Node.js 22.13+ (Expo SDK 58 baseline).
- pnpm 10.x and Git.
- A new Supabase project dedicated to this delivery platform.
- Xcode for local iOS builds or Android Studio for Android builds.
- Expo development builds for device testing.

## Install
```bash
corepack enable
pnpm install
cp .env.example .env.local
```
Fill in the Supabase URL and publishable key. Copy the Expo-prefixed variables into the environment for each mobile app. Publishable keys are designed for client use; secret/service-role keys are not.

## Database
Create a new Supabase project for this product. Do not point the migration at another live CRM or unrelated project. Review `supabase/migrations/202611010001_initial_marketplace.sql`, then apply it using the Supabase CLI or SQL editor. Run the Supabase security and performance advisors afterwards. Test policies with separate customer, merchant, courier and operations accounts.

## Run
```bash
pnpm dev:ops
pnpm dev:customer
pnpm dev:courier
```
The web workspace is at http://localhost:3000. Mobile apps use Expo development builds. SDK 58 Expo Go availability can lag SDK releases.

## Checks
```bash
pnpm test
pnpm typecheck
pnpm --filter @delivery/ops build
```
Run `npx expo-doctor` in each mobile app after installing dependencies and test on real iOS and Android devices.

## Launch limitations
- First payment method: cash on delivery. No card acquiring is implemented.
- No PSP, seller settlement, refunds or payout integration is configured.
- No map provider, geocoding or background courier location tracking is configured.
- Dispatch is operations-controlled, not an automated fleet optimizer.
- Greek legal, employment, tax, invoicing, insurance, food-information and GDPR review is required before launch.
- Do not enter production customer, merchant or courier data until access policies, retention, backups and incident response are reviewed.
