'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin  = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// ── Encryption key — server-side environment variable only ───────────────────
// Set via:  firebase functions:config:set  (or functions/.env file)
// This key NEVER reaches the browser — that is the security guarantee.
function getEncKey() {
  const key = process.env.GOVCARE_ENCRYPTION_KEY;
  if (!key) throw new HttpsError('internal', 'Encryption key not configured on server');
  return key;
}

// ── AES-256-GCM + HMAC-SHA256 ────────────────────────────────────────────────
const SALT      = 'govcare-pdpa-salt-v1';
const HMAC_SALT = 'govcare-hmac-salt-v1';
const ITERS     = 100_000;
const PREFIX    = 'enc:';

let _cachedSecret = null;
let _keys         = null;

function getKeys(masterSecret) {
  if (_keys && _cachedSecret === masterSecret) return _keys;
  _cachedSecret = masterSecret;
  _keys = {
    aes:  crypto.pbkdf2Sync(masterSecret, SALT,      ITERS, 32, 'sha256'),
    hmac: crypto.pbkdf2Sync(masterSecret, HMAC_SALT, ITERS, 32, 'sha256'),
  };
  return _keys;
}

function enc(value, aesKey) {
  if (!value || typeof value !== 'string') return '';
  const iv  = crypto.randomBytes(12);
  const c   = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
  const buf = Buffer.concat([c.update(value, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return PREFIX + Buffer.concat([iv, buf, tag]).toString('base64');
}

function dec(value, aesKey) {
  if (!value || typeof value !== 'string') return value || '';
  if (!value.startsWith(PREFIX)) return value;
  try {
    const b    = Buffer.from(value.slice(PREFIX.length), 'base64');
    const iv   = b.slice(0, 12);
    const tag  = b.slice(b.length - 16);
    const data = b.slice(12, b.length - 16);
    const d    = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(data), d.final()]).toString('utf8');
  } catch { return value; }
}

function hmacSign(payload, hmacKey) {
  const canon = JSON.stringify(payload, Object.keys(payload).sort());
  return crypto.createHmac('sha256', hmacKey).update(canon).digest('base64');
}

function hmacVerify(payload, stored, hmacKey) {
  if (!stored) return null;
  try {
    const canon    = JSON.stringify(payload, Object.keys(payload).sort());
    const expected = crypto.createHmac('sha256', hmacKey).update(canon).digest('base64');
    const a = Buffer.from(expected, 'base64');
    const b = Buffer.from(stored,   'base64');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

// ── 1. saveUserProfile ────────────────────────────────────────────────────────
exports.saveUserProfile = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { aes } = getKeys(getEncKey());
  const uid = req.auth.uid;
  const { fullName, email, phone, icNumber, notifEmail, notifSms, notifApp, createdAt } = req.data;

  const payload = {
    uid,
    fullName:   enc(fullName,  aes),
    email:      enc(email,     aes),
    phone:      phone    ? enc(phone,    aes) : '',
    icNumber:   icNumber ? enc(icNumber, aes) : '',
    notifEmail: notifEmail ?? true,
    notifSms:   notifSms   ?? true,
    notifApp:   notifApp   ?? true,
    updatedAt:  admin.firestore.FieldValue.serverTimestamp(),
  };
  if (createdAt) payload.createdAt = createdAt;

  await db.collection('users').doc(uid).set(payload, { merge: true });
  return { ok: true };
});

// ── 2. getMyProfile ───────────────────────────────────────────────────────────
exports.getMyProfile = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { aes } = getKeys(getEncKey());
  const snap = await db.collection('users').doc(req.auth.uid).get();
  if (!snap.exists) return null;
  const d = snap.data();
  return {
    uid:        d.uid,
    fullName:   dec(d.fullName,  aes),
    email:      dec(d.email,     aes),
    phone:      dec(d.phone,     aes),
    icNumber:   dec(d.icNumber,  aes),
    notifEmail: d.notifEmail ?? true,
    notifSms:   d.notifSms   ?? true,
    notifApp:   d.notifApp   ?? true,
    createdAt:  d.createdAt  ?? null,
  };
});

// ── 3. submitComplaint ────────────────────────────────────────────────────────
exports.submitComplaint = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { aes, hmac } = getKeys(getEncKey());
  const uid = req.auth.uid;
  const {
    id, title, description, citizenName, citizenEmail,
    ministry, ministryLabel, priority, date, category,
    nlpClassified, nlpConfidence, nlpAllScores, fileCount, fileNames,
  } = req.data;

  const integrityPayload = {
    citizenEmail, citizenId: uid, citizenName, date,
    description, id, ministry, priority, title,
  };
  const integrity = hmacSign(integrityPayload, hmac);

  await db.collection('complaints').doc(id).set({
    id,
    citizenId:     uid,
    citizenName:   enc(citizenName,   aes),
    citizenEmail:  enc(citizenEmail,  aes),
    title:         enc(title,         aes),
    description:   enc(description,   aes),
    category:      category || 'Auto-classified',
    ministry,
    ministryLabel: ministryLabel || ministry,
    status:        'Submitted',
    priority,
    date,
    adminNotes:    '',
    fileCount:     fileCount || 0,
    fileNames:     fileNames || [],
    nlpClassified: nlpClassified || false,
    nlpConfidence: nlpConfidence || 50,
    nlpAllScores:  nlpAllScores  || {},
    _integrity:    integrity,
    createdAt:     admin.firestore.FieldValue.serverTimestamp(),
  });

  return { ok: true, id };
});

// ── 4. getMyComplaints ────────────────────────────────────────────────────────
exports.getMyComplaints = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { aes } = getKeys(getEncKey());
  const snap = await db.collection('complaints')
    .where('citizenId', '==', req.auth.uid)
    .get();

  return snap.docs.map(d => {
    const data = d.data();
    return {
      docId:         d.id,
      id:            data.id || d.id,
      title:         dec(data.title,        aes),
      description:   dec(data.description,  aes),
      citizenName:   dec(data.citizenName,  aes),
      citizenEmail:  dec(data.citizenEmail, aes),
      ministry:      data.ministry,
      ministryLabel: data.ministryLabel,
      priority:      data.priority,
      status:        data.status,
      date:          data.date,
      adminNotes:    data.adminNotes,
      nlpClassified: data.nlpClassified,
      nlpConfidence: data.nlpConfidence,
    };
  });
});

// ── 5. adminGetComplaints ─────────────────────────────────────────────────────
exports.adminGetComplaints = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const adminSnap = await db.collection('admins').doc(req.auth.uid).get();
  if (!adminSnap.exists) throw new HttpsError('permission-denied', 'Admins only');

  const { aes, hmac } = getKeys(getEncKey());
  const snap = await db.collection('complaints').get();

  return snap.docs.map(d => {
    const data   = d.data();
    const pTitle = dec(data.title,        aes);
    const pDesc  = dec(data.description,  aes);
    const pName  = dec(data.citizenName,  aes);
    const pEmail = dec(data.citizenEmail, aes);

    let integrityOk = null;
    if (data._integrity) {
      const payload = {
        citizenEmail: pEmail, citizenId: data.citizenId || '',
        citizenName:  pName,  date:      data.date       || '',
        description:  pDesc,  id:        data.id         || '',
        ministry:     data.ministry || '', priority: data.priority || '',
        title:        pTitle,
      };
      integrityOk = hmacVerify(payload, data._integrity, hmac);
    }

    return {
      docId:         d.id,
      id:            data.id || d.id,
      citizenId:     data.citizenId,
      title:         pTitle,
      description:   pDesc,
      citizenName:   pName,
      citizenEmail:  pEmail,
      ministry:      data.ministry,
      ministryLabel: data.ministryLabel,
      priority:      data.priority,
      status:        data.status,
      date:          data.date,
      adminNotes:    data.adminNotes,
      nlpClassified: data.nlpClassified,
      nlpConfidence: data.nlpConfidence,
      nlpAllScores:  data.nlpAllScores,
      fileCount:     data.fileCount,
      _integrityOk:  integrityOk,
    };
  });
});
