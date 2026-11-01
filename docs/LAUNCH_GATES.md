# Launch gates — Greece

Engineering release checklist, not legal advice.

## Product and operations
- [ ] Brand/domain availability and trademark review.
- [ ] Pilot zone selected using demand and courier-density research.
- [ ] Merchant agreements signed and business verification complete.
- [ ] Courier operating model, contracts, safety and insurance reviewed.
- [ ] Customer support, cancellations, refunds and incident response staffed.
- [ ] Food information/allergens workflow verified.
- [ ] Delivery coverage, ETAs and fees tested in the field.

## Legal, tax and privacy
- [ ] Greek lawyer review of marketplace/operator obligations and current platform-work rules.
- [ ] Worker classification and occupational safety review.
- [ ] GDPR controller/processor mapping, privacy notices, retention schedule and DPIA screening.
- [ ] Consumer terms, cancellation, pricing and complaints process reviewed.
- [ ] VAT, e-invoicing and merchant settlements approved by a Greek accountant.
- [ ] Insurance confirmed for the operating model.

## Security
- [ ] RLS tested with at least two unrelated accounts per role.
- [ ] Supabase security and performance advisors reviewed.
- [ ] No service-role/secret keys in browser bundles, mobile bundles, git history or logs.
- [ ] MFA for privileged accounts.
- [ ] Backups and successful restore drill.
- [ ] Incident response, breach notification and deletion workflows tested.

## Payments
- [ ] Marketplace PSP contract and seller onboarding approved.
- [ ] Webhook signatures verified server-side.
- [ ] Duplicate, delayed, reordered and failed webhooks tested.
- [ ] Refunds and settlement reconciliation tested.
- [ ] No card data stored by this platform.
- [ ] COD cash collection and reconciliation defined.

## App stores
- [ ] Privacy declarations match actual SDK/data collection.
- [ ] Permissions are contextual and minimal.
- [ ] Accessibility and physical-device testing passed.
