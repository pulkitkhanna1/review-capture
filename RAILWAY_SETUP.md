# Deploy on Railway (no Render, no localhost)

Run the full app in the cloud with **Resend** for email. Works on Railway's free/hobby plan (uses HTTPS, not SMTP ports).

## Can Railway use Gmail SMTP?

**No** — same as Render:

| Method | Railway Hobby ($5) | Railway Pro |
|--------|-------------------|-------------|
| Gmail SMTP | ❌ Ports blocked / unreachable | ❌ Gmail still blocks datacenter IPs |
| Brevo/SendGrid SMTP | ❌ SMTP blocked on Hobby | ⚠️ Possible on Pro, still need own domain |
| **Resend HTTP API** | ✅ **Recommended** | ✅ |

Railway explicitly recommends [Resend](https://resend.com), SendGrid, Mailgun, or Postmark via **HTTPS API** — not Gmail SMTP.

---

## What you need

1. **Railway account** — [railway.app](https://railway.app)
2. **Resend account** — [resend.com](https://resend.com) (free: 3,000 emails/month)
3. **A domain you control** — e.g. `yourname.com` or a work subdomain like `reviews.pocketfm.com`

> You **cannot** send as `@gmail.com` from the cloud — Gmail silently drops it (DMARC). Replies still go to your Gmail via `PM_EMAIL`.

---

## Step 1 — Domain in Resend (~15 min)

1. Resend → **Domains** → **Add Domain**
2. Enter your domain (e.g. `yourdomain.com`)
3. Resend gives DNS records (SPF, DKIM) — add them in your domain registrar (GoDaddy, Cloudflare, etc.)
4. Wait until status = **Verified**

---

## Step 2 — Deploy on Railway

1. Railway → **New Project** → **Deploy from GitHub**
2. Select repo: `pulkitkhanna1/review-capture`
3. Railway auto-detects Node.js

### Environment variables

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | `re_xxxx...` from Resend → API Keys |
| `RESEND_FROM` | `Pulkit <reviews@yourdomain.com>` |
| `PM_EMAIL` | `pulkitkhanna1@gmail.com` |
| `NODE_ENV` | `production` |

**Do not set** `SMTP_*` or `SENDGRID_API_KEY` unless you prefer SendGrid.

Railway auto-sets `RAILWAY_PUBLIC_DOMAIN` — sign links in emails use your Railway URL.

### Optional — persist signed reviews

Railway → your service → **Volumes** → mount path:

```
/app/data
```

Without a volume, session data resets on redeploy.

---

## Step 3 — Test

1. Open your Railway URL (Settings → Networking → Generate Domain)
2. Click **🧪 Send test email to me**
3. Check `PM_EMAIL` inbox
4. Click **Yes** on Hive Sphere → client should receive email

---

## Cost

| Service | Cost |
|---------|------|
| Railway Hobby | ~$5/month usage |
| Resend | Free up to 3k emails/month |
| Domain | ~$10/year if you don't have one |

---

## vs other hosts

| Host | Gmail SMTP | Resend API | Notes |
|------|------------|------------|-------|
| **localhost** | ✅ | ✅ | Mac must be on |
| **Render** | ❌ | ✅ | Same Resend setup |
| **Railway** | ❌ | ✅ | This guide |
| **Vercel** | ❌ | ✅ | Serverless — need adapter for persistent `data/` |

---

## No domain yet?

| Option | Tradeoff |
|--------|----------|
| Buy a `.com` (~$10/yr) | Full cloud solution |
| Use work subdomain | Ask IT for DNS access |
| Stay on **localhost + Gmail** | Free, works today — see [LOCAL_SETUP.md](./LOCAL_SETUP.md) |

There is no cloud host that reliably sends as `@gmail.com` to Gmail inboxes without a domain.
