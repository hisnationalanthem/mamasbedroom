# Payment Setup

The website is fully prepared for Stripe and PayPal hosted checkout links.

## Current base prices

- Build a New Bot — $20 CAD
- Create an Alt — $14 CAD
- Media-Inspired Bot — $25 CAD
- Resurrect a Request — $12 CAD
- Bot Remaster — $15 CAD

Add-ons:
- 1 extra image — +$3 CAD
- 3 extra images — +$7 CAD
- extra graphic — +$3 CAD
- rush commission — +30%
- major post-approval concept/scope change — requote

## Important workflow

The site is designed for:

1. client submits request
2. commission is approved
3. final total is confirmed
4. client pays through Stripe or PayPal

Do not accept payment before the commission is approved.

## Connect Stripe

Open `payment.html` and find:

```js
const PAYMENT_LINKS = {
  stripe: "",
  paypal: ""
};
```

Paste your hosted Stripe Payment Link URL into the Stripe value:

```js
stripe: "https://buy.stripe.com/...",
```

Do not place Stripe secret API keys in GitHub.

## Connect PayPal

Paste your hosted PayPal Business payment link into:

```js
paypal: "YOUR_PAYPAL_PAYMENT_LINK"
```

Do not place PayPal passwords or private API credentials in GitHub.

## Return URLs

Once the site is live, use:

- `payment-success.html` as the success/return URL
- `payment-cancelled.html` as the cancel URL

Use the full public GitHub Pages URLs when configuring the payment processor.
