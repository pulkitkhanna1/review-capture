# Review Capture

Client review requests sent from **Gmail** via **Google Apps Script**.

No Render · No SendGrid · No localhost · Mac can be off

## Quick start

1. Open [script.google.com](https://script.google.com) → New project
2. Copy files from **`apps-script/`** into the project
3. Deploy as **Web app** (Execute as: Me, Access: Anyone)
4. Open the URL → click **Yes** on a client

**Full setup:** [apps-script/README.md](./apps-script/README.md)

## Flow

```
Dashboard (Apps Script) → Yes → Gmail to client (draft + sign link)
                                    → Client signs → Gmail notifies you
```

## Files

| Path | Purpose |
|------|---------|
| `apps-script/Code.gs` | Main logic + Gmail sending |
| `apps-script/Dashboard.html` | Client dashboard UI |
| `apps-script/SignResult.html` | Client sign confirmation |
| `config/clients.json` | Reference — copy into `Code.gs` |

Legacy Node/Render code is in `src/` (not needed).
