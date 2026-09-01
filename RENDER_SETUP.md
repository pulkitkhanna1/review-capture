# Render + SendGrid setup

App runs on **Render**. Email sends via **SendGrid only**.

**Live URL:** https://review-capture.onrender.com

---

## Render environment variables

Render → **review-capture** → **Environment**:

| Key | Value |
|-----|-------|
| `SENDGRID_API_KEY` | `SG.xxxx...` (SendGrid → Settings → API Keys) |
| `SENDGRID_FROM` | `Yukta <yukta@revops.shop>` |
| `PM_EMAIL` | Your inbox for BCC + sign alerts (e.g. `pulkitkhanna1@gmail.com`) |
| `NODE_ENV` | `production` |

### Delete these on Render (they cause the gmail.com error)

- `EMAIL_FROM` — **delete entirely** if it says `@gmail.com`
- `SMTP_*`, `RESEND_API_KEY`

Save → **Manual Deploy**.

---

## SendGrid checklist

1. **Single Sender** `yukta@revops.shop` → status **Verified** ✅
2. API key has **Mail Send** permission
3. **Activity** tab shows **Delivered** (not Blocked) after a test

---

## Test

1. https://review-capture.onrender.com/health  
   → `"provider":"sendgrid"`, `"fromEmail":"yukta@revops.shop"`
2. Dashboard → **🧪 Send test email to me**
3. Cancel old sessions → **Yes** on a client

---

## What clients see

| Field | Value |
|-------|--------|
| **From** | Yukta `yukta@revops.shop` |
| **Reply-To** | Your `PM_EMAIL` |
| **Sign link** | `https://review-capture.onrender.com/r/.../sign` |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `SENDGRID_API_KEY not set` | Add key on Render, redeploy |
| `does not match a verified Sender Identity` | `SENDGRID_FROM` must exactly match verified sender |
| API ok, no inbox delivery | SendGrid Activity → check Blocked/Bounce |
| `Bad Request` duplicate to/bcc | Client email same as `PM_EMAIL` — fixed in code |
