# Mama Anthem — Full Commission Website

This site uses the uploaded preferred homepage design as the master visual system.

## Pages

- `index.html`
- `commissions.html`
- `portfolio.html`
- `terms.html`
- `faq.html`
- `payment.html`
- `payment-success.html`
- `payment-cancelled.html`
- `PAYMENT_SETUP.md`

## Commission pricing

- Build a New Bot — $20 CAD
- Create an Alt — $14 CAD
- Media-Inspired Bot — $25 CAD
- Resurrect a Request — $12 CAD
- Bot Remaster — $15 CAD

## Scenario rule

For commissioned bots using a fresh scenario set:
- 9 written scenarios
- 1 intentionally open scenario slot
- 10 scenario slots maximum
- no paid scenario add-ons

## Add-ons

- 1 extra image — +$3 CAD
- 3 extra images — +$7 CAD
- extra graphic — +$3 CAD
- rush commission — +30%
- major post-approval change — requote

## Publish

Upload these files directly to the root of the GitHub repository.

Then:
Settings → Pages → Deploy from a branch → main → / (root)

- `currency.html` — live CAD currency converter

## Currency converter

The converter is visible:
- in the main navigation as **Currency**
- on `currency.html`
- near the bottom of `commissions.html`, immediately before the request form
- on `payment.html`

It retrieves the latest available exchange rate from Frankfurter's public API.
No exchange-rate API key is stored in GitHub.


## Visual build

Included in this version:
- journal-writing homepage hero
- Cupcake + Bunny homepage feature
- faded floral section texture
- dried flower decorations
- Anthem's Journal request-form graphic
- 9 + 1 scenario image
- Request Graveyard image
- Cupcake + Bunny FAQ image
- church image on the TOS page
- image-backed Portfolio cards
- Cupcake payment success/cancel imagery
- custom 404 page
- favicon + Apple touch icon
- 1200x630 social-sharing preview

All site image assets live in `assets/images/`; favicon files live in `assets/favicon/`.


## IMPORTANT: Flat GitHub Pages upload

This build intentionally uses NO `assets/` folders.

Upload every file from this folder directly into the repository root so the structure looks like:

- index.html
- commissions.html
- portfolio.html
- terms.html
- faq.html
- currency.html
- payment.html
- payment-success.html
- payment-cancelled.html
- 404.html
- all `.webp`, `.png`, `.jpg`, and `.svg` image/icon files

Do not upload the ZIP itself to GitHub Pages. Extract it first, then upload its contents.


## Live chat + approval workflow

This build includes a site-wide tawk.to integration scaffold.

- Edit `chat.js` once to connect the live chat.
- See `CHAT_SETUP.md` for the exact steps.
- Commission requests receive an `ANTHEM-YYMMDD-HHMM` request ID.
- The client copies the formatted request and opens chat.
- A request is approved only after Anthem replies in writing with:
  - the matching request ID
  - the final scope
  - the final CAD total
- Payment should happen only after that written approval.
