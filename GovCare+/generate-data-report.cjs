/**
 * GovCare+ — Encryption Data Report Generator
 * Run with: node generate-data-report.js
 * Produces:  encryption-data-report.txt
 *
 * Uses the same AES-256-GCM + PBKDF2 algorithm as src/crypto.js
 * so the encrypted values are real — not mocked.
 */

const crypto = require('crypto');
const fs     = require('fs');

// ── Must match src/crypto.js ──────────────────────────────────────────────────
const MASTER_SECRET = 'change-this-to-a-random-32-byte-hex-string-before-production';
const SALT          = 'govcare-pdpa-salt-v1';
const HMAC_SALT     = 'govcare-hmac-salt-v1';
const ITERATIONS    = 100_000;
const ENC_PREFIX    = 'enc:';

function deriveKey() {
  return crypto.pbkdf2Sync(MASTER_SECRET, SALT, ITERATIONS, 32, 'sha256');
}

function deriveHMACKey() {
  return crypto.pbkdf2Sync(MASTER_SECRET, HMAC_SALT, ITERATIONS, 32, 'sha256');
}

function encrypt(plaintext) {
  const key = deriveKey();
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // iv (12) + ciphertext + auth tag (16)
  const combined = Buffer.concat([iv, encrypted, tag]);
  return ENC_PREFIX + combined.toString('base64');
}

function signIntegrity(data) {
  const key       = deriveHMACKey();
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHmac('sha256', key).update(canonical, 'utf8').digest('base64');
}

// ── Sample data ───────────────────────────────────────────────────────────────
const USERS = [
  {
    uid:       'uid_abc123xyz',
    fullName:  'SITI AMINAH BINTI ALI',
    email:     'siti.aminah@gmail.com',
    phone:     '+60 12-345 6789',
    icNumber:  '990101-14-5678',
    notifEmail: true,
    notifSms:   true,
    createdAt: '2026-04-10T08:30:00Z',
  },
  {
    uid:       'uid_def456uvw',
    fullName:  'RAJESH A/L KUMAR',
    email:     'rajesh.kumar@yahoo.com',
    phone:     '+60 16-987 5432',
    icNumber:  '850623-10-1234',
    notifEmail: true,
    notifSms:   false,
    createdAt: '2026-03-22T14:15:00Z',
  },
  {
    uid:       'uid_ghi789rst',
    fullName:  'LIM WEI CHEN',
    email:     'lim.weichen@hotmail.com',
    phone:     '+60 11-222 3344',
    icNumber:  '920815-07-9012',
    notifEmail: false,
    notifSms:   true,
    createdAt: '2026-02-05T09:00:00Z',
  },
];

const COMPLAINTS = [
  {
    id:           'H-2026-0042',
    citizenId:    'uid_abc123xyz',
    citizenName:  'SITI AMINAH BINTI ALI',
    citizenEmail: 'siti.aminah@gmail.com',
    title:        'Long waiting time at Klinik Kesihatan Cheras',
    description:  'I waited over 4 hours at the clinic for a routine check-up. The number system was broken and staff were unable to assist.',
    ministry:     'Health',
    priority:     'High',
    status:       'In Progress',
    date:         '2026-05-10',
  },
  {
    id:           'T-2026-0118',
    citizenId:    'uid_def456uvw',
    citizenName:  'RAJESH A/L KUMAR',
    citizenEmail: 'rajesh.kumar@yahoo.com',
    title:        'Bus route 780 frequently cancelled without notice',
    description:  'The RapidKL bus on route 780 has been cancelled 3 times this week without any announcement. Many passengers were stranded at Pasar Seni.',
    ministry:     'Transport',
    priority:     'Medium',
    status:       'Submitted',
    date:         '2026-05-14',
  },
  {
    id:           'EC-2026-0055',
    citizenId:    'uid_ghi789rst',
    citizenName:  'LIM WEI CHEN',
    citizenEmail: 'lim.weichen@hotmail.com',
    title:        'Illegal waste dumping near Sungai Klang riverbank',
    description:  'A large pile of construction waste has been illegally dumped near the riverbank at Jalan Ipoh. The smell is unbearable and the water looks contaminated.',
    ministry:     'Environment & Cleanliness',
    priority:     'High',
    status:       'Resolved',
    date:         '2026-04-28',
  },
];

// ── Encrypt and build report data ─────────────────────────────────────────────
function buildUserRows(u) {
  return [
    { field: 'uid',        plain: u.uid,        encrypted: null },   // not encrypted
    { field: 'fullName',   plain: u.fullName,   encrypted: null },   // not encrypted
    { field: 'email',      plain: u.email,      encrypted: null },   // not encrypted
    { field: 'phone',      plain: u.phone,      encrypted: encrypt(u.phone) },
    { field: 'icNumber',   plain: u.icNumber,   encrypted: encrypt(u.icNumber) },
    { field: 'notifEmail', plain: String(u.notifEmail), encrypted: null },
    { field: 'notifSms',   plain: String(u.notifSms),   encrypted: null },
    { field: 'createdAt',  plain: u.createdAt,  encrypted: null },
  ];
}

function buildComplaintRows(c) {
  const integrityPayload = {
    citizenEmail: c.citizenEmail,
    citizenId:    c.citizenId,
    citizenName:  c.citizenName,
    date:         c.date,
    description:  c.description,
    id:           c.id,
    ministry:     c.ministry,
    priority:     c.priority,
    title:        c.title,
  };
  const hmac = signIntegrity(integrityPayload);

  return [
    { field: 'id',           plain: c.id,           encrypted: null },
    { field: 'citizenId',    plain: c.citizenId,    encrypted: null },
    { field: 'citizenName',  plain: c.citizenName,  encrypted: encrypt(c.citizenName) },
    { field: 'citizenEmail', plain: c.citizenEmail, encrypted: encrypt(c.citizenEmail) },
    { field: 'title',        plain: c.title,        encrypted: encrypt(c.title) },
    { field: 'description',  plain: c.description,  encrypted: encrypt(c.description) },
    { field: 'ministry',     plain: c.ministry,     encrypted: null },
    { field: 'priority',     plain: c.priority,     encrypted: null },
    { field: 'status',       plain: c.status,       encrypted: null },
    { field: 'date',         plain: c.date,         encrypted: null },
    { field: '_integrity',   plain: '(HMAC-SHA256 of above plaintext fields)', encrypted: hmac },
  ];
}

// ── Text formatting helpers ───────────────────────────────────────────────────
const W_TOTAL = 140;
const W_FIELD = 16;
const W_COL   = Math.floor((W_TOTAL - W_FIELD - 7) / 2);  // 7 = borders + padding

function pad(str, len) {
  const s = String(str ?? '');
  if (s.length <= len) return s.padEnd(len);
  return s.slice(0, len - 3) + '...';
}

function divider(char = '─') { return char.repeat(W_TOTAL); }

function sectionHeader(title) {
  const inner = ` ${title} `;
  const pad2  = Math.floor((W_TOTAL - inner.length) / 2);
  return '═'.repeat(pad2) + inner + '═'.repeat(W_TOTAL - pad2 - inner.length);
}

function tableHeader() {
  return [
    divider(),
    `│ ${'FIELD'.padEnd(W_FIELD)} │ ${'PLAINTEXT  (what the user sees)'.padEnd(W_COL)} │ ${'FIRESTORE  (what is stored in the database)'.padEnd(W_COL)} │`,
    divider('═'),
  ].join('\n');
}

function tableRow(field, plain, encrypted) {
  const isEnc     = !!encrypted;
  const storeSide = isEnc ? encrypted : plain;
  const marker    = isEnc ? '[ENC]' : '     ';

  // Long values need wrapping
  const plainLines = wrapText(plain, W_COL);
  const storeLines = wrapText(`${marker} ${storeSide}`, W_COL);
  const lines      = Math.max(plainLines.length, storeLines.length);

  const rows = [];
  for (let i = 0; i < lines; i++) {
    const f = i === 0 ? pad(field, W_FIELD) : ''.padEnd(W_FIELD);
    const p = (plainLines[i] || '').padEnd(W_COL);
    const s = (storeLines[i] || '').padEnd(W_COL);
    rows.push(`│ ${f} │ ${p} │ ${s} │`);
  }
  rows.push(divider());
  return rows.join('\n');
}

function wrapText(str, width) {
  const words  = str.split(' ');
  const lines  = [];
  let   current = '';
  for (const w of words) {
    if ((current + (current ? ' ' : '') + w).length > width) {
      if (current) lines.push(current);
      // If a single word is longer than width, hard-break it
      if (w.length > width) {
        for (let i = 0; i < w.length; i += width) lines.push(w.slice(i, i + width));
        current = '';
      } else {
        current = w;
      }
    } else {
      current = current ? `${current} ${w}` : w;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

// ── Build the full report ─────────────────────────────────────────────────────
const lines = [];

lines.push('');
lines.push(sectionHeader('  GOVCARE+  ENCRYPTION DATA REPORT  '));
lines.push(`  Generated : ${new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })}  (Asia/Kuala_Lumpur)`);
lines.push(`  Algorithm : AES-256-GCM  |  Key derivation : PBKDF2-SHA256 (100,000 iterations)`);
lines.push(`  Integrity : HMAC-SHA256 per complaint  |  Prefix for encrypted values : "enc:"`);
lines.push(divider('═'));
lines.push('');
lines.push('  LEGEND');
lines.push('  ──────────────────────────────────────────────────────────────────────');
lines.push('  [ENC]  Value is AES-256-GCM encrypted.  Only the authorised browser can decrypt it.');
lines.push('         A database breach exposes only the ciphertext — the plaintext is never stored.');
lines.push('         Values without [ENC] are non-sensitive metadata needed for Firestore queries.');
lines.push('');

// ── USERS ─────────────────────────────────────────────────────────────────────
lines.push(sectionHeader('  COLLECTION: users  '));
lines.push('');

USERS.forEach((u, i) => {
  lines.push(`  User ${i + 1} of ${USERS.length}`);
  lines.push(tableHeader());
  buildUserRows(u).forEach(r => lines.push(tableRow(r.field, r.plain, r.encrypted)));
  lines.push('');
});

// ── COMPLAINTS ────────────────────────────────────────────────────────────────
lines.push(sectionHeader('  COLLECTION: complaints  '));
lines.push('');

COMPLAINTS.forEach((c, i) => {
  lines.push(`  Complaint ${i + 1} of ${COMPLAINTS.length}  —  ${c.id}`);
  lines.push(tableHeader());
  buildComplaintRows(c).forEach(r => lines.push(tableRow(r.field, r.plain, r.encrypted)));
  lines.push('');
});

// ── SUMMARY ───────────────────────────────────────────────────────────────────
lines.push(sectionHeader('  SUMMARY  '));
lines.push('');
lines.push('  Collection       Encrypted fields                         Non-encrypted fields');
lines.push('  ───────────────────────────────────────────────────────────────────────────────────');
lines.push('  users            phone, icNumber                          uid, fullName, email, prefs, timestamps');
lines.push('  complaints       title, description, citizenName,         id, citizenId, ministry, priority,');
lines.push('                   citizenEmail, _integrity (HMAC)          status, date, fileNames, nlpScores');
lines.push('  activityLogs     —  (logs contain no sensitive PII)       userId, event, device, timestamp');
lines.push('  admins           —  (minimal, managed via Firebase only)  uid-based document existence');
lines.push('  faq              —  (public content)                       title, body, category');
lines.push('');
lines.push('  Passwords are NEVER stored in Firestore. Firebase Auth handles all password hashing');
lines.push('  (bcrypt) server-side. No plaintext or recoverable password exists anywhere.');
lines.push('');
lines.push(divider('═'));
lines.push('  END OF REPORT');
lines.push(divider('═'));
lines.push('');

// ── Write file ────────────────────────────────────────────────────────────────
const OUT = 'encryption-data-report.txt';
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`\n  Report written to: ${OUT}`);
console.log(`  Lines : ${lines.length}  |  Size : ${fs.statSync(OUT).size.toLocaleString()} bytes\n`);
