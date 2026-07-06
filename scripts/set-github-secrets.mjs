#!/usr/bin/env node
/**
 * Upload VITE_* vars from .env to GitHub Actions secrets.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx node scripts/set-github-secrets.mjs
 *
 * Create token: GitHub → Settings → Developer settings → Personal access tokens
 * Scopes: repo (for private) or public_repo (for public)
 */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const sodium = require('tweetsodium');

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const REPO = 'averstech2026/bringhome';

const SECRET_NAMES = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_AI_API_URL',
  'VITE_AI_API_KEY',
  'VITE_AI_MODEL',
];

function parseEnv(path) {
  const vars = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

function encryptSecret(publicKey, secretValue) {
  const key = Buffer.from(publicKey, 'base64');
  const messageBytes = Buffer.from(secretValue);
  const encryptedBytes = sodium.seal(messageBytes, key);
  return Buffer.from(encryptedBytes).toString('base64');
}

async function githubRequest(token, path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path}: ${res.status} ${body}`);
  }
  return res.status === 204 ? null : res.json();
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Set GITHUB_TOKEN env var (Personal Access Token with repo scope).');
    process.exit(1);
  }

  const env = parseEnv(join(ROOT, '.env'));
  const { key, key_id } = await githubRequest(
    token,
    `/repos/${REPO}/actions/secrets/public-key`,
  );

  for (const name of SECRET_NAMES) {
    const value = env[name];
    if (!value) {
      console.log(`skip ${name} (empty in .env)`);
      continue;
    }
    await githubRequest(token, `/repos/${REPO}/actions/secrets/${name}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encrypted_value: encryptSecret(key, value),
        key_id,
      }),
    });
    console.log(`ok   ${name}`);
  }

  console.log('\nDone. Secrets are in Settings → Secrets and variables → Actions');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
