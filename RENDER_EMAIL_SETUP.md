# Email on Render — setup guide

## Why SendGrid logs "sent" but nobody receives the email

If you see this in Render logs:

```
Email sent (SendGrid) → to: Yukta.Kandhari@gmail.com, from: pulkitkhanna1@gmail.com
```

…but **no email arrives** (not even in spam), this is expected with a **@gmail.com From address**.

| What happens | Detail |
|--------------|--------|
| SendGrid API | ✅ Accepts the send (202) |
| Gmail inbox | ❌ **Silently rejects** the message |

**Why:** Gmail's DMARC policy blocks mail that claims to be from `@gmail.com` but was sent by SendGrid's servers. You don't control gmail.com DNS, so SendGrid can't authenticate as Gmail. [SendGrid documents this](https://support.sendgrid.com/hc/en-us/articles/360041356934).

**Single Sender Verification does NOT fix this** — it only lets SendGrid accept the API call. Gmail still drops the message.

Check SendGrid → **Email Activity** — you'll likely see **Blocked** with a DMARC reason.

---

## Fix: use a domain you own

You need **Domain Authentication** in SendGrid (not Single Sender with Gmail).

### 1. Pick a domain

Any domain you control works — e.g. `yourcompany.com`, a project domain, etc.

### 2. Authenticate in SendGrid

1. SendGrid → **Settings** → **Sender Authentication** → **Authenticate Your Domain**
2. Enter your domain → SendGrid gives you **3 CNAME records**
3. Add those CNAMEs in your domain's DNS (GoDaddy, Cloudflare, Namecheap, etc.)
4. Wait for verification (usually 5–30 min)

### 3. Update Render env vars

| Key | Value |
|-----|-------|
| `SENDGRID_API_KEY` | `SG.xxxxx...` |
| `SENDGRID_FROM` | `Pulkit <reviews@yourdomain.com>` |
| `PM_EMAIL` | `pulkitkhanna1@gmail.com` |

`PM_EMAIL` becomes **Reply-To** — clients reply to your Gmail.

Remove or ignore `EMAIL_FROM` if it still says `@gmail.com`.

### 4. Redeploy and test

Cancel old sessions → click **Yes** again → check inbox.

---

## Option B — no domain yet? Use localhost

Gmail SMTP **works on your Mac** (not on Render):

```bash
npm start
# open http://localhost:3000
```

Set in `.env`:

```bash
APP_URL=https://review-capture.onrender.com   # sign links still use Render URL
SMTP_USER=pulkitkhanna1@gmail.com
SMTP_PASS=your-app-password
```

Run the dashboard locally; emails send via real Gmail.

---

## Option C — manual workaround (right now)

The app **does work** — only email delivery is broken on Render with @gmail.com From.

1. On Render dashboard, click **✍️ Open sign link**
2. Copy the testimonial draft from the page
3. Paste into a normal Gmail email to the client with the sign link

---

## Quick reference

| Setup | Works on Render? | Delivers to Gmail inboxes? |
|-------|------------------|----------------------------|
| Gmail SMTP | ❌ Connection timeout | — |
| SendGrid + `@gmail.com` From | API ✅ / Inbox ❌ | ❌ DMARC blocked |
| SendGrid + **your domain** From | ✅ | ✅ |
| Localhost + Gmail SMTP | ✅ (on your Mac) | ✅ |
