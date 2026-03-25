# 📈 FinPulse – Automated Financial Portfolio Monitor & Alert System

> **Real-time stock signal detection, Slack alerting, and Google Sheets logging — fully automated with n8n.**

[![n8n](https://img.shields.io/badge/Built%20with-n8n-EA4B71?logo=n8n&logoColor=white)](https://n8n.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![API: FMP](https://img.shields.io/badge/API-Financial%20Modeling%20Prep-green)](https://financialmodelingprep.com)
[![Slack](https://img.shields.io/badge/Alerts-Slack-4A154B?logo=slack)](https://slack.com)

---

## 🧩 Problem Statement

Individual investors and finance professionals constantly need to stay on top of their watchlists — but manually checking stock prices multiple times a day is inefficient and error-prone. Missing a 5% move on a position you own, or a sudden volume spike signaling institutional activity, can be costly.

**FinPulse solves this** by automatically scanning a configurable watchlist three times per trading day, classifying each stock's movement into an actionable signal, sending rich Slack alerts when significant moves occur, and building a historical price log in Google Sheets — all without any manual intervention.

---

## ✅ Solution Overview

FinPulse is a production-grade **n8n automation workflow** that:

- 🕐 **Runs automatically** at 9 AM, 1 PM, and 5 PM ET on weekdays
- 📡 **Fetches real-time data** from the Financial Modeling Prep API
- 🧠 **Classifies signals** (Strong Bullish / Bullish / Neutral / Bearish / Strong Bearish)
- 📊 **Detects volume spikes** (flags stocks trading >1.8× their average volume)
- 🔔 **Sends Slack alerts** using Block Kit rich formatting — only when action is warranted
- 📋 **Logs all data** to Google Sheets for trend analysis and historical review
- 📉 **Delivers an end-of-day summary** at 5 PM with top and bottom performers
- 🚨 **Handles errors gracefully** with a dedicated error-catching workflow that alerts via Slack



### Step-by-Step Workflow

| Step | Node | What it does |
|------|------|-------------|
| 1 | **Schedule Trigger** | Fires cron at 9AM, 1PM, 5PM ET on weekdays |
| 2 | **Fetch Stock Quotes** | Calls FMP batch quote endpoint for all watchlist symbols |
| 3 | **Enrich & Classify** | Adds signal classification, volume spike flag, emoji, needsAlert boolean |
| 4 | **Alert Required?** | IF node: routes to Slack only when `needsAlert = true` |
| 5 | **Build Slack Payload** | Aggregates all alerts into one formatted Block Kit message |
| 6 | **Send Slack Alert** | POSTs to Slack Incoming Webhook |
| 7 | **Prepare Sheet Rows** | Flattens enriched data to match Google Sheet column schema |
| 8 | **Log to Google Sheets** | Appends all rows to `PriceLog` tab |
| 9 | **Build Daily Summary** | At 5PM only: creates top/bottom performer digest |
| 10 | **Send Daily Summary** | Posts digest to Slack |
| 11 | **Error Trigger** | Catches any unhandled workflow failures |
| 12 | **Alert on Error** | Sends error details (node, message) to Slack |

### Signal Classification Logic

| Condition | Signal | Emoji |
|-----------|--------|-------|
| Change ≥ +3% | `STRONG_BULLISH` | 🟢 |
| Change ≥ +1.5% | `BULLISH` | 🟢 |
| Change ≤ -3% | `STRONG_BEARISH` | 🔴 |
| Change ≤ -1.5% | `BEARISH` | 🔴 |
| Otherwise | `NEUTRAL` | 🟡 |
| Volume > 1.8× avg | `Vol Spike` | 📊 |

> Thresholds are configurable via the `ALERT_THRESHOLD_PCT` environment variable.

---

## 🛠️ Tools & Technologies

| Tool | Role |
|------|------|
| **n8n** | Workflow automation engine |
| **Financial Modeling Prep API** | Real-time stock price and volume data |
| **Slack Incoming Webhooks** | Real-time alert delivery |
| **Google Sheets** | Historical price log and data store |
| **JavaScript (n8n Code nodes)** | Signal enrichment, payload building, aggregation |
| **Node.js** | Local validation and setup scripts |

---

## ⚙️ Setup Instructions

### Prerequisites

- [n8n](https://docs.n8n.io/hosting/) running locally (`npx n8n`) or on a server
- A free [Financial Modeling Prep](https://financialmodelingprep.com/developer) API key
- A Slack workspace where you can create an Incoming Webhook
- A Google account with access to Google Sheets
- Node.js ≥ 18 (for setup scripts)

---

### Step 1 – Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/finpulse-monitor.git
cd finpulse-monitor
```

---

### Step 2 – Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in all values:

```env
FMP_API_KEY=your_key_here
WATCHLIST_SYMBOLS=AAPL,MSFT,GOOGL,TSLA,NVDA
ALERT_THRESHOLD_PCT=3
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
GOOGLE_SHEET_ID=your_sheet_id_here
```

**Where to get each value:**

| Variable | Where to get it |
|----------|----------------|
| `FMP_API_KEY` | [financialmodelingprep.com/developer](https://financialmodelingprep.com/developer) → Register → API Keys |
| `SLACK_WEBHOOK_URL` | [api.slack.com/apps](https://api.slack.com/apps) → Create App → Incoming Webhooks → Add Webhook |
| `GOOGLE_SHEET_ID` | Open your Google Sheet → copy the ID from the URL: `spreadsheets/d/**THIS_PART**/edit` |

---

### Step 3 – Set Up Google Sheet

Run the setup script to get the exact column headers:

```bash
node scripts/setup_sheet_headers.js
```

1. Open your Google Sheet
2. Create a tab named exactly `PriceLog`
3. Add the headers in Row 1 as printed by the script

---

### Step 4 – Validate Your Setup

```bash
node scripts/validate_setup.js
```

This will check all environment variables and test your FMP API key live.

<!-- Screenshot placeholder: terminal output of validate_setup.js showing all green checkmarks -->

---

### Step 5 – Import the Workflow into n8n

1. Open n8n in your browser (`http://localhost:5678`)
2. Click **"+"** → **"Import from File"**
3. Select `workflows/finpulse_monitor.json`
4. The workflow will appear in your canvas

<!-- Screenshot placeholder: n8n canvas showing the full FinPulse workflow with all nodes connected -->

---

### Step 6 – Configure n8n Credentials

In n8n, you need to set up two credentials:

**Google Sheets (OAuth2)**
1. Go to **Settings → Credentials → New**
2. Search for "Google Sheets OAuth2"
3. Follow the OAuth flow with your Google account
4. Authorize access to Google Sheets

**Slack (already handled via Webhook URL in env)**
- No separate n8n credential needed — the Slack Webhook URL is passed directly via environment variable

**FMP API (already handled via env)**
- No separate n8n credential needed — the API key is passed as a query parameter via environment variable

---

### Step 7 – Configure n8n Environment Variables

In your n8n instance, add the `.env` values as environment variables:

- **Self-hosted n8n:** Add them to your `.env` file in the n8n directory or pass via `export` in your shell
- **n8n Cloud:** Go to **Settings → Variables** and add each key-value pair

---

### Step 8 – Activate the Workflow

1. In n8n, open the FinPulse workflow
2. In the "Log to Google Sheets" node, re-select your Google Sheet using the credential you created
3. Click the **Activate** toggle (top right) to turn the workflow on
4. Optionally click **"Execute Workflow"** to run it immediately and verify everything works

<!-- Screenshot placeholder: n8n workflow with the Activate toggle highlighted in the ON position -->

---

## 📸 Example Output

### Slack Alert (when a strong signal is detected)

```
📈 FinPulse Market Alert

Scan time: Jan 15, 2025, 9:00 AM ET  |  Alerts: 2

🟢 NVDA (NVIDIA Corporation)
   Price: $875.40  |  Change: +4.2%  |  📊 Vol spike x2.3
   Signal: `STRONG_BULLISH`

🔴 TSLA (Tesla, Inc.)
   Price: $215.60  |  Change: -3.8%
   Signal: `STRONG_BEARISH`

FinPulse Automation | Source: Financial Modeling Prep
```

### End-of-Day Slack Summary (5 PM)

```
📊 FinPulse – End-of-Day Summary

🏆 Top Performers
🟢 NVDA: +4.2%  ($875.40)
🟢 META: +2.1%  ($512.80)
🟢 AAPL: +1.8%  ($195.20)

📉 Bottom Performers
🔴 TSLA: -3.8%  ($215.60)
🔴 AMZN: -1.9%  ($185.40)
🟡 JPM: -0.3%  ($198.10)

Wed Jan 15 2025 | 10 symbols tracked
```

### Google Sheets Log

<!-- Screenshot placeholder: Google Sheets PriceLog tab showing multiple rows of data with columns: Timestamp, Symbol, Name, Price, Change, Change %, Volume, Vol Ratio, Market Cap, Signal, Vol Alert -->

| Timestamp | Symbol | Price | Change % | Signal | Vol Alert |
|-----------|--------|-------|----------|--------|-----------|
| 2025-01-15T14:00:00Z | NVDA | 875.40 | +4.2 | STRONG_BULLISH | YES |
| 2025-01-15T14:00:00Z | TSLA | 215.60 | -3.8 | STRONG_BEARISH | NO |

---

## 🗂️ Repository Structure

```
finpulse-monitor/
├── workflows/
│   └── finpulse_monitor.json     # n8n workflow export (import directly)
├── docs/
│   └── architecture.md           # Detailed architecture & design notes
├── scripts/
│   ├── validate_setup.js         # Pre-flight check: env vars + API test
│   └── setup_sheet_headers.js    # Prints Google Sheet column headers
├── .env.example                  # Environment variable template
├── .gitignore                    # Excludes .env and node_modules
└── README.md                     # This file
```

---

## 🚀 Future Improvements

| Feature | Description |
|---------|-------------|
| **Email digest** | Add a Gmail/SMTP node to send a formatted daily summary email |
| **Notion integration** | Log alerts to a Notion database for richer note-taking |
| **Portfolio P&L tracking** | Accept portfolio positions and calculate unrealized gain/loss per scan |
| **Technical indicators** | Add RSI, MACD, or moving average calculations via code nodes |
| **Telegram alerts** | Add a parallel Telegram bot notification branch |
| **Looker Studio dashboard** | Connect Google Sheets to Looker Studio for a live visual dashboard |
| **Multi-portfolio support** | Support multiple watchlists with separate alert channels |
| **Webhook trigger** | Add a webhook endpoint to allow on-demand scans from a phone or script |
| **News enrichment** | Pull related news headlines from FMP's news endpoint for each alert |

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 🙋 Questions or Issues?

Open an issue in this repository or reach out directly. Contributions and suggestions are welcome.
