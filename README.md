# Review Capture

Client review requests via email — **Render + SendGrid only**.

**Dashboard:** https://review-capture.onrender.com

## Flow

```
Dashboard → Yes → SendGrid email to client (draft + sign button)
                        → Client signs → PM notified
         → No  → log reason
```

## Setup

All configuration is on **Render** — see **[RENDER_SETUP.md](./RENDER_SETUP.md)**

Required env vars:

```
SENDGRID_API_KEY=SG.xxxx
SENDGRID_FROM=Yukta <yukta@revops.shop>
PM_EMAIL=you@example.com
```

## Files

| File | Purpose |
|------|---------|
| `src/server.js` | Dashboard + sign links |
| `src/email.js` | SendGrid sending |
| `config/clients.json` | Client list |
| `render.yaml` | Render deploy config |
