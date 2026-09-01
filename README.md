# Review Capture — Email Only

Capture client reviews entirely over email. No Slack required.

## Flow

```
You (dashboard) → Yes → 📧 ONE email to client (draft + sign button)
                              → Client signs → 📧 You get notified
         → No  → log reason
```

## Where to run

| Setup | Guide |
|-------|--------|
| **Local Mac + Gmail** | [LOCAL_SETUP.md](./LOCAL_SETUP.md) |
| **Railway + Resend** (recommended cloud) | [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) |
| **Render + SendGrid** | [RENDER_EMAIL_SETUP.md](./RENDER_EMAIL_SETUP.md) |

Cloud hosts **cannot use Gmail SMTP**. You need **Resend or SendGrid + a domain you own**.

## Files

| File | Purpose |
|------|---------|
| `src/server.js` | Dashboard + sign link handlers |
| `src/flows.js` | Review state machine |
| `src/email.js` | Email sending (Gmail or SendGrid) |
| `config/clients.json` | Client roster + project context |
| `data/reviews/` | Signed reviews (JSON) |

## What emails get sent

| When | To | What |
|------|-----|------|
| You click Yes | Client | **One email** — testimonial draft + Sign button |
| Client signs | You | Confirmation with full signed text |
