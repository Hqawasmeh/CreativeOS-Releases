# Qanteak PayPal Sandbox checkout

This integration is test-only. It does not collect real money or grant desktop access. `PAYPAL_ENV` must be `sandbox`; other values are rejected. API secrets remain in Supabase Edge Function secrets.

## Deployment

1. Apply `supabase/schema/paypal-sandbox.sql` through a reviewed Supabase migration.
2. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_ENV=sandbox` in the project's Edge Function secrets.
3. Deploy `qanteak-paypal` with gateway JWT verification disabled. The handler validates user bearer tokens through Supabase Auth and independently verifies PayPal webhook signatures. Administrative setup requires the actual server secret key.
4. Invoke `{ "action": "setup" }` using the Supabase dashboard's secret-key test header. This creates six Sandbox plans and the signed-event webhook. Repeating setup reuses stored IDs.
5. Run `python scripts/build-website.py`, `python scripts/check-website.py`, `node scripts/check-paypal.mjs`, and publish `docs/` through GitHub Pages.

## Test flow

Open pricing, choose monthly/yearly and a plan, sign in or confirm a new account, review the total, then continue to PayPal. Use a separate **Sandbox personal/buyer account**, not the Sandbox business/seller account. After approving, the return page asks the backend for the signed-in user's saved subscription; URL parameters cannot activate access. My account shows the test subscription separately. Cancellation or suspension can be managed from the Sandbox PayPal autopay link.

Basic is $18/month or $180/year; Pro $29/month or $288/year; Teams $38/seat/month or $384/seat/year. Teams accepts 1–100 seats. The server chooses PayPal plan IDs; the browser cannot set prices or ownership. One open checkout per account prevents duplicate subscriptions. A pending different plan must be reconciled before switching; automatic upgrades/downgrades are not implemented.

## Security and operations

`paypal_sandbox_config` intentionally has RLS and no client policies: only the service role can access it. `paypal_sandbox_checkouts` allows authenticated users to read only their own records; all writes are privileged. Neither table grants paid entitlements. PayPal creation uses the checkout UUID as its idempotency key. Unresolved creation older than 70 hours requires manual reconciliation rather than risking a second charge.

Webhook signatures are verified with PayPal before re-fetching subscription state. Each returned subscription must match the stored plan ID, checkout ID and quantity. Only an HTTPS Sandbox PayPal approval URL is allowed. Logs must never contain tokens or credentials.

Before enabling live sales, implement a separate live environment and production entitlement lifecycle, including payment failures, refunds/reversals, cancellations and plan changes. Complete a buyer approval/return and cancellation test first. Merely changing `PAYPAL_ENV` will not enable live payments.

Verification on 2026-09-19: Sandbox OAuth accepted, six plans and webhook registered, database RLS verified, local security tests and 20-page link checks passed. End-to-end buyer approval still requires an authenticated Sandbox buyer test.
