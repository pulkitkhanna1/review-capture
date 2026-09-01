# Review Capture — Google Apps Script

**No Render. No SendGrid. No localhost.**

Everything runs in Google Apps Script. Emails send from **`pulkitkhanna1@gmail.com`** via Gmail.

---

## Setup (~15 minutes)

### 1. Create the script

1. Go to [script.google.com](https://script.google.com)
2. **New project** → name it `Review Capture`
3. Delete the default `Code.gs` content
4. Create these files ( **+** → Script / HTML):

| File in Apps Script | Copy from repo |
|---------------------|----------------|
| `Code.gs` | `apps-script/Code.gs` |
| `Dashboard.html` | `apps-script/Dashboard.html` |
| `SignResult.html` | `apps-script/SignResult.html` |

### 2. Edit clients (optional)

In `Code.gs`, update the `CLIENTS` array at the top — or copy from `config/clients.json`.

Confirm `PM_EMAIL = "pulkitkhanna1@gmail.com"`.

### 3. Authorize Gmail

1. Select function **`doGet`** in the toolbar → **Run**
2. Click **Review permissions** → choose **`pulkitkhanna1@gmail.com`**
3. Advanced → **Go to Review Capture (unsafe)** → **Allow**

This grants `GmailApp.sendEmail` permission.

### 4. Deploy as web app

1. **Deploy** → **New deployment**
2. Type: **Web app**
3. **Execute as:** Me (`pulkitkhanna1@gmail.com`)
4. **Who has access:** Anyone
5. **Deploy** → copy the URL

Bookmark that URL — it's your dashboard.

---

## Daily use

1. Open your web app URL (logged into Google as `pulkitkhanna1@gmail.com`)
2. Click **Yes — send review email** on a client
3. Client gets email from your Gmail with sign button
4. You're BCC'd on every client email
5. When they sign, you get a notification email

---

## Sign links

Sign links use the same web app URL:

```
https://script.google.com/macros/s/XXXX/exec?action=sign&sessionId=...
```

No ngrok, no Render, no DNS.

---

## Limits

| Limit | Value |
|-------|--------|
| Gmail sends/day (personal) | ~100 recipients |
| Cost | Free |
| Mac required | ❌ No |
| Render required | ❌ No |

Fine for dozens of client reviews per month.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Sign in with pulkitkhanna1@gmail.com" | Open dashboard in Chrome logged into that Google account |
| Permission denied on send | Re-run `doGet`, re-authorize Gmail scope |
| Client didn't get email | Check spam; Gmail → Sent folder |
| After editing code | **Deploy → Manage deployments → Edit → New version → Deploy** |

---

## Updating clients

Edit `CLIENTS` in `Code.gs` → save → **Deploy new version** (step above).

---

## Old Node / Render code

The `src/` folder is the previous Node + Render app. **You can ignore it.** This Apps Script project replaces it entirely.
