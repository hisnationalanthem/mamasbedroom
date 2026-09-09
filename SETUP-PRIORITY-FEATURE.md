# Mama Anthem — Donation-Based Upcoming Bot Priority

This version replaces the earlier free priority-request idea.

## What the visitor does

1. Identifies any upcoming original Mama Anthem bot.
2. Enters **whatever positive amount they want in CAD**.
3. Chooses Stripe or PayPal as their preferred donation/payment route.
4. Submits the request.
5. Receives a `PRIORITY-...` request ID.

**Important:** the form does not charge them automatically.

The request enters the admin dashboard as:

- Priority status: `Pending`
- Donation status: `Awaiting Donation`

Anthem then confirms the donation route separately. After the contribution is actually received, use **Mark donation received** in the admin dashboard.

## Meaning of the contribution

The public pages make clear that the amount:

- can influence priority weight
- does not purchase an exact queue position
- does not guarantee an exact posting date
- does not turn the bot into a commission
- does not grant custom changes, ownership, exclusivity, or creative control
- is creator support, not a charitable/tax-deductible donation

## Files to upload to GitHub root

Replace:
- `commissions.html`
- `free-requests.html`
- `terms.html`
- `admin.html`
- `admin.js`

Add:
- `prioritize.html`
- `priority-submit.js`

Do NOT replace:
- `supabase-config.js`
- `commission-submit.js`
- `chat.js`
- `graveyard-data.js`
- `graveyard.js`

## Supabase — SQL

Open Supabase → SQL Editor and run:

- `priority-requests-setup.sql`

This file is migration-safe. If you already ran the earlier non-donation version, it adds the donation fields.

The table will track:

- request ID
- requester name/contact
- bot identifier
- source/reference
- requester note
- donation amount CAD
- Stripe / PayPal
- donation status
- priority status
- private admin notes
- donation received / refunded / accepted / applied timestamps

## Supabase — Edge Function

Create or update the Edge Function named exactly:

`submit-priority`

Replace its code with:

`supabase-edge-function-submit-priority/index.ts`

Deploy it.

JWT verification should remain disabled because this is a public submission endpoint, just like your existing commission submission function.

## Admin dashboard

The updated dashboard has:

- `Commissions`
- `Priority Requests`

Priority requests can be:

- searched
- filtered by priority status
- sorted newest / highest donation / lowest donation
- edited
- marked donation received
- marked applied
- refunded/declined/cancelled through the dropdowns

Donation statuses:

- `Awaiting Donation`
- `Received`
- `Refunded`

Priority statuses:

- `Pending`
- `Accepted`
- `Applied`
- `Declined`
- `Cancelled`

## Test

After GitHub Pages redeploys, open:

`https://hisnationalanthem.github.io/mamasbedroom/prioritize.html`

Submit a fake request with a small fake amount.

Expected result:

1. Public page gives a `PRIORITY-...` ID.
2. Row appears in `bot_priority_requests`.
3. Admin → Priority Requests shows the amount and selected method.
4. `Mark donation received` changes donation status to `Received`.
5. `Mark applied` changes priority status to `Applied`.

Delete the fake row afterward if desired.

## Payment behavior in this version

This is intentionally **manual verification**.

The form records the intended contribution amount and preferred payment method, but does not create a Stripe or PayPal charge. This avoids using a fixed commission checkout link for a pay-what-you-want contribution.

A future version can automate variable-amount Stripe Checkout with a separate Stripe secret + webhook without changing the public meaning of the feature.
