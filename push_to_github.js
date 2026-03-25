#!/usr/bin/env node
/**
 * FinPulse – GitHub Auto-Publisher
 * 
 * Creates the GitHub repository and pushes all project files
 * using the GitHub REST API (no git CLI needed).
 * 
 * Usage:
 *   node push_to_github.js YOUR_GITHUB_TOKEN YOUR_GITHUB_USERNAME
 * 
 * Example:
 *   node push_to_github.js ghp_xxxxxxxxxxxx johndoe
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const [,, TOKEN, USERNAME] = process.argv;

if (!TOKEN || !USERNAME) {
  console.error('\n❌  Usage: node push_to_github.js YOUR_GITHUB_TOKEN YOUR_GITHUB_USERNAME\n');
  process.exit(1);
}

const REPO_NAME = 'finpulse-monitor';
const REPO_DESC = 'Automated financial portfolio monitor: real-time stock signals, Slack alerts, and Google Sheets logging — built with n8n';

// ── Files to upload (relative to this script's directory) ───────
const FILES = [
  { src: 'workflows/finpulse_monitor.json', dest: 'workflows/finpulse_monitor.json' },
  { src: 'docs/architecture.md',             dest: 'docs/architecture.md' },
  { src: 'scripts/validate_setup.js',        dest: 'scripts/validate_setup.js' },
  { src: 'scripts/setup_sheet_headers.js',   dest: 'scripts/setup_sheet_headers.js' },
  { src: '.env.example',                     dest: '.env.example' },
  { src: '.gitignore',                       dest: '.gitignore' },
  { src: 'README.md',                        dest: 'README.md' },
];

// ── Commit messages per file ─────────────────────────────────────
const COMMIT_MESSAGES = {
  'workflows/finpulse_monitor.json': 'feat: add n8n workflow – financial monitor with signal classification and alerts',
  'docs/architecture.md':            'docs: add architecture overview and node-by-node breakdown',
  'scripts/validate_setup.js':       'feat: add pre-flight setup validator script',
  'scripts/setup_sheet_headers.js':  'feat: add Google Sheets column header setup helper',
  '.env.example':                    'chore: add environment variable template',
  '.gitignore':                      'chore: add gitignore for env files and node_modules',
  'README.md':                       'docs: add comprehensive README with setup guide and architecture',
};

// ── GitHub API helper ────────────────────────────────────────────
function ghRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'finpulse-publisher',
        'Content-Type': 'application/json',
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  const BASE = path.dirname(__filename);
  console.log('\n🚀  FinPulse GitHub Publisher\n' + '─'.repeat(45));

  // ── Step 1: Create repository ──────────────────────────────────
  console.log(`\n📁  Creating repository "${REPO_NAME}"...`);
  const createRes = await ghRequest('POST', '/user/repos', {
    name:        REPO_NAME,
    description: REPO_DESC,
    private:     false,
    auto_init:   false,
    has_issues:  true,
    has_wiki:    false,
  });

  if (createRes.status === 201) {
    console.log(`  ✅  Repository created: ${createRes.body.html_url}`);
  } else if (createRes.status === 422) {
    console.log(`  ⚠️   Repository already exists — will update files`);
  } else {
    console.error(`  ❌  Failed to create repo: ${JSON.stringify(createRes.body)}`);
    process.exit(1);
  }

  // ── Step 2: Upload each file ───────────────────────────────────
  console.log('\n📤  Uploading files...');

  for (const file of FILES) {
    const fullPath = path.join(BASE, file.src);
    if (!fs.existsSync(fullPath)) {
      console.log(`  ⏭️   Skipped (not found): ${file.src}`);
      continue;
    }

    const content = fs.readFileSync(fullPath);
    const encoded = content.toString('base64');
    const msg     = COMMIT_MESSAGES[file.dest] ?? `chore: add ${file.dest}`;

    // Check if file exists (to get SHA for update)
    const checkRes = await ghRequest('GET', `/repos/${USERNAME}/${REPO_NAME}/contents/${file.dest}`);
    const sha = checkRes.status === 200 ? checkRes.body.sha : undefined;

    const uploadRes = await ghRequest('PUT', `/repos/${USERNAME}/${REPO_NAME}/contents/${file.dest}`, {
      message: msg,
      content: encoded,
      ...(sha ? { sha } : {})
    });

    if (uploadRes.status === 201 || uploadRes.status === 200) {
      console.log(`  ✅  ${file.dest}`);
    } else {
      console.log(`  ❌  ${file.dest}: ${JSON.stringify(uploadRes.body.message ?? uploadRes.body)}`);
    }
  }

  // ── Step 3: Set repository topics ─────────────────────────────
  await ghRequest('PUT', `/repos/${USERNAME}/${REPO_NAME}/topics`, {
    names: ['n8n', 'automation', 'finance', 'stock-market', 'slack', 'google-sheets', 'portfolio']
  });

  // ── Done ───────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(45));
  console.log(`🎉  All done! View your repository at:`);
  console.log(`    https://github.com/${USERNAME}/${REPO_NAME}\n`);
}

run().catch(err => {
  console.error('\n❌  Unexpected error:', err);
  process.exit(1);
});
