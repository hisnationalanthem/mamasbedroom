# Mama Anthem — Upcoming Bot Priority Feature

This package adds a third request pathway:

- Paid commissions
- Free requests / Request Graveyard
- **Prioritize an Upcoming Original Bot**

The priority request is **not a commission**. It only tells Anthem which already-planned original bot the visitor wants moved higher in the personal posting queue.

## Files in this package

### Upload to GitHub root

Replace:
- `commissions.html`
- `free-requests.html`
- `admin.html`
- `admin.js`

Add:
- `prioritize.html`
- `priority-submit.js`

Do not replace:
- `supabase-config.js`
- `commission-submit.js`
- `chat.js`
- `graveyard-data.js`
- `graveyard.js`

### Supabase

1. Open **SQL Editor** and run:
   - `priority-requests-setup.sql`

2. Create a new Edge Function named exactly:
   - `submit-priority`

3. Paste the contents of:
   - `supabase-edge-function-submit-priority/index.ts`

4. Deploy the function.

5. In the Edge Function settings, disable JWT verification for `submit-priority`.
   This is a public submission endpoint, just like the existing commission submission function.

## Live URL

After GitHub Pages redeploys:

`https://hisnationalanthem.github.io/mamasbedroom/prioritize.html`

## Test

Submit a fake priority request from the live page.

Expected result:
- public page shows a `PRIORITY-...` request ID
- Supabase `bot_priority_requests` table gets a new row
- Admin dashboard → **Priority Requests** shows the request
- status can be changed to Pending / Accepted / Applied / Declined / Cancelled
- **Mark applied** stamps the `applied_at` date

Delete the fake row after testing if desired.

## Scope shown publicly

The new page explicitly states that priority:
- affects posting order only
- does not create a commission
- includes no concept/POV/scenario changes
- grants no ownership or exclusivity
- does not guarantee an exact posting date
