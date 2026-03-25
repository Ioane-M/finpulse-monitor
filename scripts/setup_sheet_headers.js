#!/usr/bin/env node
/**
 * FinPulse – Google Sheets Column Header Setup
 * 
 * This script prints the exact column headers you need to add
 * to your Google Sheet's "PriceLog" tab before running the workflow.
 * 
 * Usage: node scripts/setup_sheet_headers.js
 */

const HEADERS = [
  'Timestamp',
  'Symbol',
  'Name',
  'Price',
  'Change',
  'Change %',
  'Volume',
  'Vol Ratio',
  'Market Cap',
  'Signal',
  'Vol Alert',
];

console.log('\n📊  FinPulse – Google Sheet Setup\n' + '─'.repeat(50));
console.log('\nCreate a sheet named "PriceLog" and add these headers in Row 1:\n');
HEADERS.forEach((h, i) => {
  console.log(`  Column ${String.fromCharCode(65 + i)}  →  ${h}`);
});

console.log('\n💡  Tip: You can also paste this directly into Row 1, Column A:');
console.log('\n  ' + HEADERS.join('\t') + '\n');
console.log('─'.repeat(50));
console.log('After setup, your Sheet ID goes into GOOGLE_SHEET_ID in your .env file.');
console.log('Find it in the URL: docs.google.com/spreadsheets/d/<SHEET_ID>/edit\n');
