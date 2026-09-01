# Google Apps Script setup

**One file only** — no separate HTML files (fixes "unable to open file at present").

## Fix steps

### 1. Replace ALL code in Apps Script

1. [script.google.com](https://script.google.com) → open your project
2. **Delete** `Dashboard.html` and `SignResult.html` if you created them
3. Open **`Code.gs`** → select all → delete
4. Paste **entire** contents of `Code.gs` from this folder
5. Confirm `WEB_APP_URL` at the top matches your deployment URL
6. **Save** (Ctrl+S)

### 2. Authorize (required before deploy)

1. Select function **`testSetup`** in the dropdown
2. Click **▶ Run**
3. **Review permissions** → choose `pulkitkhanna1@gmail.com`
4. Advanced → **Go to Review Capture (unsafe)** → **Allow**
5. Check Gmail for "Review Capture setup OK"

### 3. Redeploy

1. **Deploy** → **Manage deployments**
2. Click **✏️ Edit** (pencil) on active deployment
3. **Version:** New version
4. Execute as: **Me**
5. Who has access: **Anyone**
6. **Deploy**
7. Copy the `/exec` URL — update `WEB_APP_URL` in Code.gs if it changed
8. Save + **Deploy new version** again if URL changed

### 4. Open the URL

- Use Chrome logged in as **pulkitkhanna1@gmail.com**
- URL must end in **`/exec`** not `/dev`
- First load may take 5–10 seconds (cold start)

---

## "Unable to open file at present"

| Cause | Fix |
|-------|-----|
| Missing HTML files | Use **one-file** `Code.gs` only (this version) |
| Never ran authorization | Run **`testSetup`** first |
| Wrong URL (`/dev`) | Use production URL ending in **`/exec`** |
| Old deployment | Deploy **new version** |
| Not signed into Google | Sign in as `pulkitkhanna1@gmail.com` |

---

## Check errors

Apps Script → **Executions** (left sidebar) → see failed `doGet` runs and error message.

---

## Your URL

```
https://script.google.com/macros/s/AKfycby8VED2MXMkTYqVKkx87rayGxzgbAfK8scmRblpIzdN4NZCc2zx8CCbJjWUn6K994MY/exec
```

Already set in `WEB_APP_URL` at top of `Code.gs`.
