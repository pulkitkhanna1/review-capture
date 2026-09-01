# Pocket FM email setup — cloud hosting (Mac can be off)

Use **`pulkit.khanna@pocketfm.com`** with Resend on Railway. Emails deliver reliably; no Gmail SMTP, no localhost.

---

## What you need from IT (one-time, ~5 min for them)

Someone with DNS access to **pocketfm.com** must add records from Resend.

**Option A — whole domain** (`pocketfm.com`)  
→ You can send from any `@pocketfm.com` address, including `pulkit.khanna@pocketfm.com`

**Option B — subdomain** (easier for IT)  
→ Use `reviews.pocketfm.com` → send from `pulkit.khanna@reviews.pocketfm.com` or `noreply@reviews.pocketfm.com`

Ask IT: *"Can you add 3 CNAME records for Resend email authentication?"* (you forward the exact records from Resend)

---

## Step 1 — Resend (~10 min)

1. Sign up at [resend.com](https://resend.com)
2. **Domains** → **Add Domain**
3. Enter `pocketfm.com` (or `reviews.pocketfm.com`)
4. Resend shows DNS records — **copy and send to IT**
5. Wait until Resend shows **Verified** ✅

5. **API Keys** → Create → copy key (`re_...`)

---

## Step 2 — Railway (~10 min)

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Repo: `pulkitkhanna1/review-capture`
3. **Variables** tab:

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | `re_xxxx...` |
| `RESEND_FROM` | `Pulkit Khanna <pulkit.khanna@pocketfm.com>` |
| `PM_EMAIL` | `pulkit.khanna@pocketfm.com` |
| `NODE_ENV` | `production` |

**Remove** `SENDGRID_API_KEY` and Gmail `SMTP_*` if set — Resend takes priority.

4. **Settings → Networking** → **Generate Domain** (e.g. `review-capture-production.up.railway.app`)
5. Deploy finishes → open that URL

Sign links in client emails use your Railway URL automatically.

### Optional — keep signed reviews after redeploy

**Volumes** → Add volume → mount at `/app/data`

---

## Step 3 — Test

1. Open your Railway URL
2. Click **🧪 Send test email to me**
3. Check `pulkit.khanna@pocketfm.com` inbox
4. Cancel any old failed sessions
5. **Yes** on Hive Sphere → Yukta should receive email from `@pocketfm.com`

---

## What clients see

| Field | Value |
|-------|--------|
| **From** | Pulkit Khanna `<pulkit.khanna@pocketfm.com>` |
| **Reply** | Goes to your Pocket FM inbox |
| **Sign button** | Your Railway URL |

Professional, on-brand, works with Gmail recipients.

---

## If IT can't add DNS to root domain

Ask for a **subdomain** only:

```
reviews.pocketfm.com
```

Then set:

```
RESEND_FROM=Pulkit Khanna <reviews@pocketfm.com>
PM_EMAIL=pulkit.khanna@pocketfm.com
```

---

## Checklist for IT ticket

Copy-paste to Slack/email:

```
Hi — I need 3 CNAME DNS records added for email sending (Resend).
Domain: pocketfm.com [or reviews.pocketfm.com]
I'll send the exact record names/values from Resend once created.
Purpose: automated client testimonial requests from pulkit.khanna@pocketfm.com
Volume: low (~dozens/month)
```

---

## Cost

| Item | Cost |
|------|------|
| Resend | Free (3k emails/month) |
| Railway | ~$5/month usage |
| DNS | Free (IT adds records) |

**Mac can be off** once this is live.
