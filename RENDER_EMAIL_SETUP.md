# Fix "Connection timeout" on Render

Gmail SMTP **does not work** from Render (and most cloud hosts). You'll see:

```
❌ Failed: Connection timeout
```

Use **SendGrid** instead — free tier, works from Render, sends to any client email.

---

## Setup (10 minutes)

### 1. Create a SendGrid account

1. Go to [sendgrid.com](https://sendgrid.com) → Sign up (free)
2. Complete email verification

### 2. Verify your sender email

SendGrid needs to confirm you own the Gmail address you send from.

1. SendGrid dashboard → **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in:
   - **From Name:** Pulkit
   - **From Email:** `pulkitkhanna1@gmail.com` (must match `EMAIL_FROM` in Render)
   - **Reply To:** same email
4. SendGrid sends a verification link → **click it in your inbox**

Wait until status shows **Verified**.

### 3. Create an API key

1. **Settings** → **API Keys** → **Create API Key**
2. Name: `review-capture`
3. Permission: **Restricted** → Mail Send → **Full Access**
4. Copy the key (starts with `SG.`) — shown only once

### 4. Add to Render

Render dashboard → **review-capture** → **Environment**:

| Key | Value |
|-----|-------|
| `SENDGRID_API_KEY` | `SG.xxxxxxxx...` |
| `EMAIL_FROM` | `Pulkit <pulkitkhanna1@gmail.com>` |
| `PM_EMAIL` | `pulkitkhanna1@gmail.com` |

Keep your Gmail vars if you want — SendGrid takes priority when `SENDGRID_API_KEY` is set.

**Fix typo if present:** rename `PH_EMAIL` → `PM_EMAIL`.

### 5. Redeploy

Render → **Manual Deploy** → Deploy latest commit.

### 6. Test

1. Open https://review-capture.onrender.com/health  
   Should show: `"provider": "sendgrid"`
2. Cancel any failed sessions on the dashboard
3. Click **Yes — send review email** on **Hive Sphere** first (real client email, not your own)
4. Check inbox + spam

### Common errors

| Error | Fix |
|-------|-----|
| `Bad Request` | **Sender not verified** — finish Single Sender verification in SendGrid for `pulkitkhanna1@gmail.com` |
| `does not match a verified Sender Identity` | `EMAIL_FROM` must exactly match your verified sender email |
| Duplicate address in to/bcc | Fixed in code — when client email = your email, BCC is skipped automatically |

**Tip:** Test with **Hive Sphere** (`Yukta.Kandhari@gmail.com`), not Bright Path/Northstar — those use your Gmail as the client email for testing.

---

## Local vs Render

| Where you run | Email method |
|---------------|--------------|
| **localhost** (`npm start`) | Gmail SMTP works fine |
| **Render** (hosted URL) | Use SendGrid — Gmail SMTP times out |

---

## Alternative: Resend

If you prefer [Resend](https://resend.com), add `RESEND_API_KEY` on Render instead.

Note: Resend's test sender (`onboarding@resend.dev`) only delivers to your own email. To email clients, you need a **verified domain**. SendGrid Single Sender is easier if you only have Gmail.
