# Mama Anthem — Automatic Stripe Priority Payments

This upgrades the working pay-what-you-want priority system so **Stripe verifies payments automatically**.

PayPal remains manual.

## What changes

For Stripe priority support:

1. Visitor fills out `prioritize.html`.
2. `submit-priority` saves the request in Supabase.
3. The same Edge Function creates a Stripe Checkout Session for the exact CAD amount entered.
4. The visitor is redirected to Stripe's hosted checkout.
5. Stripe sends a signed webhook to `stripe-priority-webhook`.
6. The webhook verifies Stripe's signature.
7. Supabase automatically changes:
   - Donation status → `Received`
   - Donation method → `Stripe`
   - Stripe payment status → `paid`
   - Donation received timestamp → current time
8. Refund events automatically change the record to `Partially Refunded` or `Refunded`.

The browser never receives your Stripe secret key.

---

# FILES TO UPLOAD TO GITHUB

Replace:

- `prioritize.html`
- `priority-submit.js`
- `admin.html`
- `admin.js`
- `terms.html`

Add:

- `priority-payment-success.html`
- `priority-payment-cancelled.html`

Do **not** replace:

- `supabase-config.js`
- `commission-submit.js`
- `chat.js`

---

# STEP 1 — DATABASE MIGRATION

Supabase → SQL Editor.

Run:

`stripe-auto-priority-migration.sql`

This adds:

- `stripe_checkout_session_id`
- `stripe_payment_intent_id`
- `stripe_payment_status`
- `stripe_amount_total_cad`
- `refunded_amount_cad`

It also adds `Partially Refunded` to the donation statuses.

---

# STEP 2 — ADD YOUR STRIPE SECRET TO SUPABASE

Do not put the Stripe secret in GitHub or any `.js`/`.html` file.

In Stripe, get the **Secret key** for the mode you are testing.

For your first test, use Stripe **test mode**.

In Supabase:

Project → Edge Functions → Secrets / Project secrets

Add:

`STRIPE_SECRET_KEY`

Value:

your Stripe secret key (`sk_test_...` while testing)

Your Edge Function reads it only on the server.

---

# STEP 3 — UPDATE `submit-priority`

In Supabase → Edge Functions → `submit-priority`:

Replace the code with:

`supabase-edge-function-submit-priority/index.ts`

Deploy.

JWT verification must remain **disabled** because this is a public submission endpoint.

This version:

- saves the priority request first
- creates a Stripe Checkout Session when `Stripe` was selected
- uses the amount saved by the form
- enforces Stripe's $0.50 CAD minimum
- returns the secure Stripe Checkout URL
- leaves PayPal on manual verification

---

# STEP 4 — CREATE THE STRIPE WEBHOOK EDGE FUNCTION

Create a new Supabase Edge Function named exactly:

`stripe-priority-webhook`

Paste:

`supabase-edge-function-stripe-priority-webhook/index.ts`

Deploy it.

JWT verification must be **disabled** for this function.

That is required because Stripe does not send a Supabase login token. The function instead authenticates Stripe by verifying Stripe's signed webhook header.

Your webhook URL is:

`https://ydtbmzffqedgbcsbreqj.supabase.co/functions/v1/stripe-priority-webhook`

---

# STEP 5 — CREATE THE WEBHOOK IN STRIPE

In the Stripe Dashboard, while still in the same mode as the secret key you used:

Developers / Workbench → Webhooks → Add destination / endpoint.

Endpoint URL:

`https://ydtbmzffqedgbcsbreqj.supabase.co/functions/v1/stripe-priority-webhook`

Subscribe to these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Save the endpoint.

Stripe will give the endpoint a **Signing secret** beginning with:

`whsec_...`

Do not put that value in GitHub.

---

# STEP 6 — ADD THE WEBHOOK SECRET TO SUPABASE

Supabase → Edge Functions → Secrets / Project secrets.

Add:

`STRIPE_WEBHOOK_SECRET`

Value:

the `whsec_...` value from the Stripe webhook you just created.

Redeploy `stripe-priority-webhook` after adding/changing secrets if Supabase requests it.

---

# STEP 7 — UPLOAD THE WEBSITE FILES

Upload/replace the GitHub files listed at the top of this guide.

The new Stripe flow uses:

- `prioritize.html`
- `priority-submit.js`
- `priority-payment-success.html`
- `priority-payment-cancelled.html`

The updated admin dashboard uses cache version `v=6`.

---

# STEP 8 — TEST IN STRIPE TEST MODE

Use the live GitHub Pages priority form.

Choose:

- Payment method: `Stripe`
- Amount: at least `$0.50 CAD`

Submit.

You should be redirected to Stripe Checkout.

For Stripe's standard successful test card, use:

`4242 4242 4242 4242`

Use any future expiration date, any 3-digit CVC, and any billing postal code.

After successful checkout:

1. Stripe redirects to `priority-payment-success.html`.
2. Open your private admin dashboard.
3. The priority request should automatically show:
   - Donation status: `Received`
   - Stripe verification: `paid`
   - Donation received timestamp
   - Stripe Checkout Session ID
   - Payment Intent ID

You should **not** need to click `Mark received manually`.

---

# STEP 9 — TEST A REFUND

In Stripe test mode, refund the test payment.

The `charge.refunded` webhook should update the priority request automatically.

A partial Stripe refund becomes:

`Partially Refunded`

A full refund becomes:

`Refunded`

---

# STEP 10 — SWITCH TO LIVE MODE

Once the entire flow works in test mode:

1. Stripe → switch to live mode.
2. Copy your live Stripe secret key (`sk_live_...`).
3. Replace the Supabase `STRIPE_SECRET_KEY` secret with the live key.
4. Create the same webhook endpoint in **Stripe live mode**.
5. Copy that live endpoint's new `whsec_...` signing secret.
6. Replace the Supabase `STRIPE_WEBHOOK_SECRET` with the live webhook secret.

Test with a small real payment if desired.

Test-mode webhook secrets and live-mode webhook secrets are different.

---

# SECURITY NOTES

Never place any of these in GitHub:

- `sk_test_...`
- `sk_live_...`
- `whsec_...`
- Supabase service-role key

The browser only gets a Stripe Checkout URL.

The webhook uses Stripe's raw request body and `Stripe-Signature` header for verification before it updates your database.

The database amount is also overwritten with Stripe's `amount_total` when payment succeeds, so Stripe is the final payment source of truth.
