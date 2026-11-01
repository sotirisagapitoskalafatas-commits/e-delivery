# Partner application rollout

## Routes
- `/partners`: partner entry hub
- `/merchant`: merchant acquisition page and application form
- `/courier`: courier recruitment page and application form
- `/ops/applications`: OPS-admin-only review queue

Applications do not create user accounts, provision merchant memberships, approve a courier, or promise a commercial/employment relationship. OPS review is a separate step.

## 1. Apply the database migration
In the E-DELIVERY Supabase project, open **SQL Editor**, create a new query, paste the full contents of `supabase/migrations/202611010005_partner_applications.sql`, and run it. Confirm that the `partner_applications` table and the two RPC functions exist.

The table has RLS enabled. Only OPS administrators can read application records. Public submissions go through a security-definer function with field validation; direct anonymous table reads and writes are revoked. OPS status changes use a second function that checks `private.is_ops_admin()`.

## 2. Complete the privacy notice before opening applications
The current `/privacy` page is intentionally marked as a draft. Before public collection, complete and obtain legal review for:
- Controller's full legal identity and contact details.
- Correct legal basis for each applicant/collaboration model.
- Retention period and deletion schedule.
- Applicant data-rights contact and process.
- Any notices required for the intended employment/contractor structure.

Do not turn the application switches on before this is finished.

## 3. Configure Cloudflare Turnstile
Create a Turnstile widget and restrict its allowed hostnames to the real E-DELIVERY domains you intend to accept. Add the site key and secret to Vercel:
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — public site key.
- `TURNSTILE_SECRET_KEY` — secret; never add the `NEXT_PUBLIC_` prefix.

The form sends the token to `/api/partner-applications`. The server validates it with Cloudflare Siteverify before calling Supabase.

## 4. Open submissions deliberately
After migration, privacy/legal review and Turnstile testing, set both Vercel Production variables:
- `NEXT_PUBLIC_PARTNER_APPLICATIONS_ENABLED=true`
- `PARTNER_APPLICATIONS_ENABLED=true`

Both are false in `.env.example`. Set them to false to close new applications. Preview environments should use separate Turnstile hostnames/keys and should not automatically accept production applicant data.

## 5. Review applications
Sign in with an OPS-admin account and open `/ops/applications`. OPS can filter by status, add internal notes and set a status to in review, contacted, approved or declined. Approval here does not create an Auth user or grant a merchant/courier role; account provisioning and any required agreement/document checks remain a separate controlled process.

## 6. What the forms currently collect
Merchant: contact name, email, phone, city, business name/type/address/postcode and preferred fulfillment modes.

Courier: contact name, email, phone, city, vehicle, preferred network, confirmation of age 18+ and smartphone availability, and a driving-licence declaration where applicable. Do not collect ID scans, bank details or other sensitive documents in this initial public form.
