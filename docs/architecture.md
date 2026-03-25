# FinPulse – Architecture & Design Notes

## System Overview

FinPulse is a scheduled automation workflow built in n8n that monitors a stock
watchlist, classifies price movements into actionable signals, alerts a Slack
channel when significant moves are detected, and logs all data to Google Sheets
for historical analysis.

---

## Workflow Architecture

```
[Schedule Trigger]
       │
       ▼
[Fetch Stock Quotes]  ◄── Financial Modeling Prep REST API
       │
       ▼
[Enrich & Classify Signals]  ◄── Custom JS: signal logic, volume analysis
       │
   ┌───┴──────────────┬──────────────────┐
   ▼                  ▼                  ▼
[Alert Required?]  [Prepare Rows]   [Daily Summary]
   │                  │                  │
   ▼ (TRUE)           ▼                  ▼
[Build Payload]   [Google Sheets]   [Slack Webhook]
   │
   ▼
[Slack Webhook]

[Error Trigger] ──► [Slack Error Alert]
```

---

## Node-by-Node Breakdown

### 1. Schedule Trigger
- **Type:** Cron
- **Schedule:** `0 9,13,17 * * 1-5` (9 AM, 1 PM, 5 PM ET, Monday–Friday)
- **Purpose:** Aligns scans with pre-market open, midday, and market close

### 2. Fetch Stock Quotes
- **Type:** HTTP Request
- **API:** Financial Modeling Prep `/api/v3/quote/{symbols}`
- **Fields returned:** price, change, changesPercentage, volume, avgVolume, marketCap
- **Auth:** Query parameter `apikey`

### 3. Enrich & Classify Signals
- **Type:** Code (JavaScript)
- **Logic:**
  - `STRONG_BULLISH` if changePct ≥ threshold (default 3%)
  - `BULLISH` if changePct ≥ 1.5%
  - `STRONG_BEARISH` if changePct ≤ -threshold
  - `BEARISH` if changePct ≤ -1.5%
  - `NEUTRAL` otherwise
- **Volume Spike:** flags if current volume > 1.8× average volume
- **needsAlert:** true if STRONG signal OR volume spike detected

### 4. Alert Required (IF node)
- Routes stocks needing an alert to the Slack branch
- All stocks always flow to the Google Sheets branch

### 5. Build Slack Alert Payload
- Aggregates all alert items into one structured Block Kit message
- Includes symbol, price, change%, signal classification, and volume note

### 6. Send Slack Alert
- **Type:** HTTP Request POST to Slack Incoming Webhook
- **Format:** Slack Block Kit for rich formatting

### 7. Prepare Sheet Rows
- Transforms enriched stock data into flat row format
- Maps all fields to column headers

### 8. Log to Google Sheets
- **Operation:** Append rows to `PriceLog` sheet
- **Auth:** Google OAuth2 credential in n8n
- Creates a full historical price log over time

### 9. Build Daily Summary (5 PM only)
- Checks if current hour is 17 (5 PM)
- Sorts all stocks by changePct
- Extracts top 3 and bottom 3 performers
- Formats a clean end-of-day digest

### 10. Error Trigger + Alert
- Catches any unhandled errors in the workflow
- Posts error details (message, node name, workflow name) to Slack

---

## Data Flow Diagram

```
FMP API
  └── Raw Quote Array
        └── Enriched Stock Objects (signal, volRatio, emoji, needsAlert)
              ├── [IF needsAlert] → Slack Block Kit → Slack Channel
              ├── [ALL]           → Flat Rows       → Google Sheets
              └── [IF 5PM]        → Summary Text    → Slack Channel
```

---

## Signal Classification Table

| Condition              | Signal          | Emoji |
|------------------------|-----------------|-------|
| changePct ≥ +3%        | STRONG_BULLISH  | 🟢    |
| changePct ≥ +1.5%      | BULLISH         | 🟢    |
| changePct ≤ -3%        | STRONG_BEARISH  | 🔴    |
| changePct ≤ -1.5%      | BEARISH         | 🔴    |
| otherwise              | NEUTRAL         | 🟡    |
| volume > 1.8× avg vol  | Volume Spike    | 📊    |

---

## Design Decisions

- **Stateless design:** No database required. Google Sheets acts as the log store.
- **Threshold via env var:** `ALERT_THRESHOLD_PCT` lets you tune sensitivity without touching the workflow.
- **Slack Block Kit:** Used for rich formatting; degrades gracefully to plain text.
- **Error workflow is separate:** The Error Trigger is a dedicated safety net that cannot itself fail silently.
- **5 PM gate in code:** Keeps the daily summary on the same schedule trigger rather than requiring a second cron job.

---

## Scalability Notes

- FMP free tier: 250 requests/day. With 3 daily runs and 10 symbols = 3 API calls/day (batch endpoint used).
- To scale to 50+ symbols: upgrade FMP plan or implement request batching.
- To add email alerts: insert a Gmail/SMTP node parallel to the Slack node.
- To add a dashboard: connect Google Sheets to Looker Studio (free).
