# Connect the live chat

This website is already wired for tawk.to. You only need to add two public widget IDs.

## 1. Create your tawk.to property

Create or sign in to your tawk.to account and add the Mama Anthem website as a property.

In the tawk.to dashboard, find the widget/embed code for the property.

A normal tawk.to embed URL looks similar to:

    https://embed.tawk.to/PROPERTY_ID/WIDGET_ID

You need only the two values after `embed.tawk.to/`.

## 2. Open `chat.js`

At the top you will see:

```js
const ANTHEM_CHAT_CONFIG = {
  propertyId: "",
  widgetId: ""
};
```

Paste the two public IDs:

```js
const ANTHEM_CHAT_CONFIG = {
  propertyId: "YOUR_PROPERTY_ID",
  widgetId: "YOUR_WIDGET_ID"
};
```

Save and commit `chat.js`.

You do NOT need to edit every HTML page.

## 3. What happens after connection

Once the IDs are present:

- the tawk.to widget loads site-wide
- a branded `† Chat with Anthem` button appears
- the commission form's `Copy request & open chat` button opens chat after copying the request
- visitors can leave messages while you are offline if offline messaging is enabled in your tawk.to setup

## 4. Approval workflow

The website generates request IDs such as:

    ANTHEM-260903-1842

A request is not approved simply because it was sent.

When you approve one, send a chat message containing:

    COMMISSION APPROVED
    Request ID: ANTHEM-260903-1842
    Build a New Bot — $20 CAD
    3 extra images — $7 CAD
    Total: $27 CAD

    You may now use the Payment page to complete checkout.

This written message is the client's approval record.

## 5. Recommended tawk.to greeting

Suggested greeting:

    Need help with a commission?
    Send your request here. I will confirm the scope and total before payment.

Suggested offline message:

    I am offline right now, but you can still leave your commission request here.
    Keep your ANTHEM request ID. I will reply when I am available.

## Security

The tawk.to Property ID and Widget ID are public embed identifiers.

Do not put passwords, secret API keys, Stripe secret keys, PayPal secrets, or other private credentials in `chat.js` or anywhere else in this public GitHub repository.
