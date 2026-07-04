# Payments

Each club can list its own ways to receive donations. The distinctive one is
**Zelle**, where the site renders a scannable QR code that opens the donor's
banking app pre-addressed to that club. Other providers (Stripe, PayPal, Venmo,
"other") are simple link-out buttons.

Payment methods are rows in [`payment_methods`](Database#payment_methods), scoped
to a club. The `type` column selects the behavior.

![How donations work on EWA — a donor picks a club, clicks Give, and the PaymentModal opens with the method chosen. For Zelle, a QR code is rendered client-side from the stored URL (never pre-generated, so it can't drift out of sync) with the email/phone display_token shown as a fallback beside it. For other providers, the button simply links out to Stripe, PayPal, Venmo, or another provider's own payment page. The Zelle QR URL format is enroll.zellepay.com/qr-codes?data= a base64 of name, action:payment, token — key order is load-bearing. No card data ever touches the site](assets/payments-flow.png)

## Zelle QR codes

Eastlake's real Zelle QR codes follow a specific, undocumented-but-stable format.
[`api/_lib/zelle.js`](https://github.com/drewdog88/ewa-website-revamp/blob/main/api/_lib/zelle.js)
builds and decodes it:

```
https://enroll.zellepay.com/qr-codes?data=<base64 of {name, action, token}>
```

- The payload is a JSON object with keys **in this order**: `name`, `action`
  (always `"payment"`), `token` (the recipient's enrolled email or phone).
- It's base64-encoded and trailing `=` padding is stripped — matching what
  Eastlake's production QR codes actually contain.

```js
buildZelleUrl(name, token)
  → https://enroll.zellepay.com/qr-codes?data=eyJuYW1lIjoi…

decodeZelle(url)        → { name, token }   // used by admin to pre-fill the form
decodeZelleToken(url)   → token
```

### How a Zelle method is stored

| Field | Holds |
|---|---|
| `value` | The **full** `enroll.zellepay.com/qr-codes?data=…` URL (what the QR encodes) |
| `display_token` | The human-readable email/phone shown as a **text fallback** beside the QR |
| `qr_settings` | Optional JSONB — QR size, margin, color, error-correction level |

The text fallback matters: if a donor can't scan (older phone, printed flyer),
the email/phone is right there to send a Zelle manually.

### The donor flow

*(See the diagram at the top of this page for the full donor journey and the two
payment branches.)*

The QR is rendered client-side in
[`src/app/PaymentModal.tsx`](https://github.com/drewdog88/ewa-website-revamp/blob/main/src/app/PaymentModal.tsx)
(via the `qrcode` libraries), so no image is stored — the QR is always in sync
with the stored URL.

## Adding or editing a payment method (admin)

In the **Clubs** manager, open a club and add a payment method:

1. Choose the **type**.
2. **Zelle:** paste the recipient's enrolled **email or phone** — the admin
   builds the canonical `enroll.zellepay.com` URL for you (and can decode an
   existing QR URL to pre-fill). Optionally tune `qr_settings`.
3. **Other providers:** paste the provider payment **URL** into `value`.
4. Set `label`, `sort_order`, and `is_active`, then Save.

Changes are live immediately — the public site reloads payment methods with the
club data.

## Notes & gotchas

- **`action` is always `payment`.** Don't change it — it's part of what makes the
  QR resolve to a payment in the banking app.
- **Key order is load-bearing.** `zelle.js` emits `{name, action, token}` in that
  order on purpose to match real Zelle payloads; rebuilding the object in a
  different order can produce a URL some bank apps read differently.
- **No card data ever touches this site.** Every path hands off to Zelle or the
  chosen provider; EWA stores only public payment addresses/links.