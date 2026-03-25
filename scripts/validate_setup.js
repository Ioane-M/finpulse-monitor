#!/usr/bin/env node
/**
 * FinPulse – Pre-flight Setup Validator
 * Run: node scripts/validate_setup.js
 *
 * Checks that all required environment variables are set
 * and that the FMP API key is valid before you run the workflow.
 */

require('dotenv').config();
const https = require('https');

const REQUIRED_VARS = [
  'FMP_API_KEY',
  'WATCHLIST_SYMBOLS',
  'SLACK_WEBHOOK_URL',
  'GOOGLE_SHEET_ID',
  'ALERT_THRESHOLD_PCT',
];

let allGood = true;

console.log('\n🔍  FinPulse Setup Validator\n' + '─'.repeat(40));

// ── 1. Check environment variables ──────────────────────────────
console.log('\n📋  Checking environment variables...');
REQUIRED_VARS.forEach(key => {
  const val = process.env[key];
  if (!val || val.includes('your_') || val.includes('XXXX')) {
    console.log(`  ❌  ${key} – NOT SET or still placeholder`);
    allGood = false;
  } else {
    const preview = key.toLowerCase().includes('key') || key.toLowerCase().includes('webhook')
      ? val.slice(0, 8) + '...'
      : val;
    console.log(`  ✅  ${key} = ${preview}`);
  }
});

// ── 2. Validate FMP API key ──────────────────────────────────────
console.log('\n🌐  Testing FMP API connection...');
const apiKey = process.env.FMP_API_KEY;
const testUrl = `https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${apiKey}`;

if (apiKey && !apiKey.includes('your_')) {
  https.get(testUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`  ✅  FMP API key is valid. AAPL price: $${parsed[0].price}`);
        } else if (parsed['Error Message']) {
          console.log(`  ❌  FMP API error: ${parsed['Error Message']}`);
          allGood = false;
        } else {
          console.log(`  ⚠️   Unexpected FMP response. Check manually.`);
        }
      } catch (e) {
        console.log(`  ❌  Failed to parse FMP response.`);
        allGood = false;
      }
      printSummary();
    });
  }).on('error', (e) => {
    console.log(`  ❌  Network error: ${e.message}`);
    allGood = false;
    printSummary();
  });
} else {
  console.log('  ⏭️   Skipped FMP test (API key not set yet)');
  printSummary();
}

// ── 3. Summary ───────────────────────────────────────────────────
function printSummary() {
  console.log('\n' + '─'.repeat(40));
  if (allGood) {
    console.log('🎉  All checks passed! You are ready to import the workflow.\n');
  } else {
    console.log('⚠️   Some checks failed. Review the issues above, update your .env file, and re-run.\n');
    process.exit(1);
  }
}
