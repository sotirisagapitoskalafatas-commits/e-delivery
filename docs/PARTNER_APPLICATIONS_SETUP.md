# Partner application rollout

## Routes
- \`/partners\`: partner entry hub
- \`/merchant\`: merchant acquisition page and application form
- \`/courier\`: courier recruitment page and application form
- \`/ops/applications\`: OPS-admin-only review queue

Applications do not create user accounts, provision merchant memberships, approve a courier, or promise a commercial/employment relationship. OPS review is a separate step.

## 1. Apply the database migrations
In the E-DELIVERY Supabase project, open **SQL Editor** and run both migrations in order:
1. \`supabase/migrations/202611010005_partner_applications.sql\`
2. \`supabase/migrations/202611020006_partner_application_rpc_server_only.sql\`

If the first migration has already been applied, run only the second migration. It removes direct execution rights from \`anon\` and \`authenticated\` and gives execution rights only to \`service_role\`.

Verify the effective permissions in SQL Editor:

\`\`\`sql
select
  has_function_privilege('anon', 'public.submit_partner_application(text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text)', 'EXECUTE') as anon_can_submit,
  has_function_privilege('authenticated', 'public.submit_partner_application(text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text)', 'EXECUTE') as authenticated_can_submit,
  has_function_privilege('service_role', 'public.submit_partner_application(text,text,text,text,text,text,text,text,text,text,text[],text,text,boolean,boolean,boolean,boolean,text)', 'EXECUTE') as server_can_submit;
\`\`\`

Expected result: \`false\`, \`false\`, \`true\`. The table has RLS enabled. Only OPS administrators can read application records. The public website calls the RPC from its server route only, after Turnstile verification, using a server-only Supabase secret. Never expose \`SUPABASE_SECRET_KEY\` or \`SUPABASE_SERVICE_ROLE_KEY\` through a \`NEXT_PUBLIC_\` variable or browser code. OPS status changes use a separate function that checks \`private.is_ops_admin()\`.

## 2. Complete the privacy notice before opening applications
The current \`/privacy\` page is intentionally marked as a draft. Before public collection, complete and obtain legal review for:
- Controller's full legal identity and contact details.
- Correct legal basis for each applicant/collaboration model.
- Retention period and deletion schedule.
- Applicant data-rights contact and process.
- Any notices required for the intended employment/contractor structure.
- Cloudflare Turnstile disclosure and relevant provider/privacy terms.

Do not turn the application switches on before this is finished.

## 3. Configure Cloudflare Turnstile
Create a Turnstile widget and restrict its allowed hostnames to the exact E-DELIVERY domains you intend to accept. The current production canonical hostname is \`e-delivery-nine.vercel.app\`; add any custom production hostname only after it has been attached to the Vercel project and verified. Add these variables to Vercel Production:
- \`NEXT_PUBLIC_TURNSTILE_SITE_KEY\` — public site key.
- \`TURNSTILE_SECRET_KEY\` — secret; never add the \`NEXT_PUBLIC_\` prefix.
- \`PARTNER_APPLICATION_ALLOWED_HOSTNAMES\` — comma-separated exact hostnames, for example \`e-delivery-nine.vercel.app\`.

The widget sends the action \`partner_application\`. The server validates the token with Cloudflare Siteverify and checks both the returned hostname and action before calling Supabase. Keep Preview on separate keys/hostnames and do not use production applicant data for preview testing.

## 4. Keep submissions closed until every prerequisite is complete
After both database migrations, privacy/legal review, Turnstile configuration and an end-to-end test on a controlled environment, set both Vercel Production variables:
- \`NEXT_PUBLIC_PARTNER_APPLICATIONS_ENABLED=true\`
- \`PARTNER_APPLICATIONS_ENABLED=true\`

Both are false in \`.env.example\`. Set them to false to close new applications. The \`NEXT_PUBLIC_\` switch is compiled into the deployment, so redeploy after changing it. The server-side switch is checked on every POST request.

## 5. Review applications
Sign in with an OPS-admin account and open \`/ops/applications\`. OPS can filter by status, add internal notes and set a status to in review, contacted, approved or declined. Approval here does not create an Auth user or grant a merchant/courier role; account provisioning and any required agreement/document checks remain a separate controlled process.

## 6. What the forms currently collect
Merchant: contact name, email, phone, city, business name/type/address/postcode and preferred fulfillment modes.

Courier: contact name, email, phone, city, vehicle, preferred network, confirmation of age 18+ and smartphone availability, and a driving-licence declaration where applicable. Do not collect ID scans, bank details or other sensitive documents in this initial public form.
