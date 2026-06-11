/**
 * GovCare+ — Firestore PII Encryption Migration
 * Reads every user document, finds any plaintext PII fields,
 * encrypts them with AES-256-GCM, and patches the document.
 *
 * Run once: node migrate-encrypt.cjs
 */

'use strict';
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const os     = require('os');

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
const envVars = {};
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
    if (m) envVars[m[1]] = m[2].trim();
  });
}
const MASTER_SECRET = envVars.VITE_ENCRYPTION_KEY || 'govcare-fallback-key-change-in-production';
const PROJECT_ID    = 'govcarepluss';

// ── AES-256-GCM (same algorithm as src/crypto.js) ─────────────────────────────
const SALT   = 'govcare-pdpa-salt-v1';
const PREFIX = 'enc:';
const ITERS  = 100_000;
const _aesKey = crypto.pbkdf2Sync(MASTER_SECRET, SALT, ITERS, 32, 'sha256');

function encrypt(value) {
  if (!value || typeof value !== 'string') return value;
  const iv  = crypto.randomBytes(12);
  const c   = crypto.createCipheriv('aes-256-gcm', _aesKey, iv);
  const enc = Buffer.concat([c.update(value, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return PREFIX + Buffer.concat([iv, enc, tag]).toString('base64');
}

const isEnc = v => typeof v === 'string' && v.startsWith(PREFIX);

// ── Firebase REST helpers ─────────────────────────────────────────────────────
function getAccessToken() {
  const cfgPath = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');
  if (!fs.existsSync(cfgPath)) throw new Error('Firebase CLI not logged in. Run: firebase login');
  const cfg   = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const token = cfg?.tokens?.access_token;
  if (!token) throw new Error('No access token. Run: firebase login --reauth');
  return token;
}

function httpsGet(url, token) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(new Error('Bad JSON: ' + body.slice(0,200))); } });
    }).on('error', reject);
  });
}

function httpsPatch(url, token, bodyObj) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(bodyObj);
    const u    = new URL(url);
    const req  = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { reject(new Error('Bad JSON: ' + body.slice(0,200))); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function fetchCollection(colName, token) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${colName}`;
  const docs = [];
  let pageToken = null;
  do {
    const url  = pageToken ? `${base}?pageToken=${pageToken}` : base;
    const data = await httpsGet(url, token);
    if (data.error) throw new Error(`Firestore error (${colName}): ${data.error.message}`);
    (data.documents || []).forEach(d => {
      const fields = d.fields || {};
      const flat   = { _id: d.name.split('/').pop(), _name: d.name };
      for (const [k, v] of Object.entries(fields)) {
        flat[k] = v.stringValue ?? v.booleanValue ?? v.integerValue ?? v.timestampValue ?? null;
      }
      docs.push(flat);
    });
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

// Fields to encrypt in every user document
const PII_FIELDS = ['fullName', 'displayName', 'email', 'phone', 'icNumber', 'password'];

async function migrateUser(user, token) {
  const toEncrypt = PII_FIELDS.filter(f => user[f] && typeof user[f] === 'string' && !isEnc(user[f]));
  if (toEncrypt.length === 0) return null;

  const updateFields = {};
  const maskQuery    = toEncrypt.map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');

  for (const f of toEncrypt) {
    updateFields[f] = { stringValue: encrypt(user[f]) };
  }

  const url    = `https://firestore.googleapis.com/v1/${user._name}?${maskQuery}`;
  const result = await httpsPatch(url, token, { fields: updateFields });
  if (result.error) throw new Error(`Update failed for ${user._id}: ${result.error.message}`);

  return toEncrypt;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n  GovCare+  ·  Firestore PII Encryption Migration');
  console.log('  ' + '─'.repeat(55));
  console.log('  Encrypting all plaintext PII fields in Firestore...\n');

  const token = getAccessToken();
  const users = await fetchCollection('users', token);

  let migrated = 0;
  let skipped  = 0;

  for (const user of users) {
    const name = user.fullName || user.displayName || user._id;
    try {
      const fields = await migrateUser(user, token);
      if (fields) {
        console.log(`  ✓ ${name.padEnd(40)} →  encrypted: ${fields.join(', ')}`);
        migrated++;
      } else {
        console.log(`  ✓ ${name.padEnd(40)} →  already encrypted, skipped`);
        skipped++;
      }
    } catch (err) {
      console.error(`  ✗ ${name}  →  ERROR: ${err.message}`);
    }
  }

  console.log(`\n  Done: ${migrated} user(s) migrated · ${skipped} already encrypted`);
  console.log('\n  Regenerating report...');
  return { migrated, skipped };
}

main().then(({ migrated }) => {
  if (migrated > 0) {
    console.log('\n  Run: node live-report.cjs   to see the updated report.');
  }
  console.log('');
}).catch(err => {
  console.error('\n  ✗ Fatal:', err.message, '\n');
  process.exit(1);
});
