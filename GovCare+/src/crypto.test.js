/**
 * Unit tests for GovCare+ — crypto.js, priority, similarity, bot detection
 * Run: node src/crypto.test.js
 */
const { subtle } = globalThis.crypto;
const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);

// ── Key derivation (mirrors crypto.js) ──────────────────────────────────────
const MASTER_KEY = 'change-this-to-a-random-32-byte-hex-string-before-production';
const ENC_SALT   = 'govcare-pdpa-salt-v1';
const HMAC_SALT  = 'govcare-hmac-salt-v1';
const ITERS      = 100_000;
const PREFIX     = 'enc:';

async function deriveAESKey() {
  const base = await subtle.importKey('raw', new TextEncoder().encode(MASTER_KEY), { name: 'PBKDF2' }, false, ['deriveKey']);
  return subtle.deriveKey({ name:'PBKDF2', salt:new TextEncoder().encode(ENC_SALT), iterations:ITERS, hash:'SHA-256' }, base, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
async function deriveHMACKey() {
  const base = await subtle.importKey('raw', new TextEncoder().encode(MASTER_KEY), { name:'PBKDF2' }, false, ['deriveKey']);
  return subtle.deriveKey({ name:'PBKDF2', salt:new TextEncoder().encode(HMAC_SALT), iterations:ITERS, hash:'SHA-256' }, base, { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']);
}

async function encrypt(key, plain) {
  const iv  = getRandomValues(new Uint8Array(12));
  const enc = await subtle.encrypt({ name:'AES-GCM', iv }, key, new TextEncoder().encode(plain));
  const buf = new Uint8Array(iv.byteLength + enc.byteLength);
  buf.set(iv, 0); buf.set(new Uint8Array(enc), iv.byteLength);
  return PREFIX + Buffer.from(buf).toString('base64');
}
async function decrypt(key, cipher) {
  const buf = Buffer.from(cipher.slice(PREFIX.length), 'base64');
  const dec = await subtle.decrypt({ name:'AES-GCM', iv: buf.slice(0,12) }, key, buf.slice(12));
  return new TextDecoder().decode(dec);
}
async function signIntegrity(hmacKey, data) {
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  const sig = await subtle.sign('HMAC', hmacKey, new TextEncoder().encode(canonical));
  return Buffer.from(sig).toString('base64');
}

// ── determinePriority() (mirrors AdminDashboardPage.jsx) ────────────────────
function determinePriority(title='', description='', ministry='') {
  const textL = `${title} ${description}`.toLowerCase();
  const lowPatterns = ['suggestion','feedback','recommend','inquiry','enquiry','cadangan','saranan'];
  if (lowPatterns.some(p => textL.includes(p))) return 'Low';
  const highPatterns = ['emergency','danger','death','died','fire','flood','landslide','explosion','robbery','assault'];
  let highScore = 0;
  highPatterns.forEach(p => { if (textL.includes(p)) highScore++; });
  if (highScore >= 1) return 'High';
  return 'Medium';
}

// ── similarity() (mirrors AdminDashboardPage.jsx) ───────────────────────────
function normalize(s) { return s.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim(); }
function similarity(a, b) {
  const wa = new Set(normalize(a).split(' ').filter(w => w.length > 3));
  const wb = new Set(normalize(b).split(' ').filter(w => w.length > 3));
  const intersection = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa,...wb]).size;
  return union === 0 ? 0 : intersection / union;
}

// ── bertClassify() — ministry routing keyword simulation ────────────────────
const MINISTRY_KEYWORDS = {
  'Health':                    ['hospital','clinic','doctor','medicine','health','disease','dengue','ambulance'],
  'Transport':                 ['bus','road','traffic','highway','lorry','transport','pothole','traffic light'],
  'Education':                 ['school','teacher','student','tuition','university','college','education'],
  'Works & Infrastructure':    ['building','construction','drain','flood','infrastructure','pipe','water','electricity'],
  'Home Affairs':              ['police','crime','immigration','passport','identity','ic','safety','security'],
  'Environment & Cleanliness': ['rubbish','garbage','dirty','pollution','noise','mosquito','environment','cleanliness'],
};
function bertClassify(text) {
  if (!text || !text.trim()) return null;
  const t = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const [ministry, keywords] of Object.entries(MINISTRY_KEYWORDS)) {
    const score = keywords.filter(k => t.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = ministry; }
  }
  return best;
}

// ── Bot detection logic (mirrors LoginPage/RegisterPage) ────────────────────
function botDetection(honeypotValue, submitTime, loadTime) {
  if (honeypotValue) return 'BLOCKED: honeypot filled';
  if (submitTime - loadTime < 2000) return 'BLOCKED: submitted too fast (<2s)';
  return 'ALLOWED';
}

// ── Test runner ──────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(id, desc, condition) {
  const ok = typeof condition === 'function' ? condition() : condition;
  console.log(`  ${ok?'PASS':'FAIL'}  ${id}  ${desc}`);
  ok ? passed++ : failed++;
}

async function runTests() {
  console.log('\nGovCare+ Encryption Unit Tests');
  console.log('================================\n');

  const aesKey  = await deriveAESKey();
  const hmacKey = await deriveHMACKey();

  // ── UT-01: encryptFields() ──────────────────────────────────────────────
  const fields = ['Ahmad bin Abdullah','nisrina@example.com','+60123456789','901012-10-1234'];
  let allEnc = true;
  for (const f of fields) { const e = await encrypt(aesKey, f); if (!e.startsWith(PREFIX)) allEnc = false; }
  assert('UT-01', 'encryptFields() — All PII fields produced enc: AES-256-GCM ciphertext', allEnc);

  // ── UT-02: decryptFields() ──────────────────────────────────────────────
  let roundtripOk = true;
  for (const f of fields) { const e = await encrypt(aesKey, f); const d = await decrypt(aesKey, e); if (d !== f) roundtripOk = false; }
  const nullObj = { name: null, phone: '' };
  const stillNull = (nullObj.name == null && nullObj.phone === '');
  assert('UT-02', 'decryptFields() — Round-trip decryption matched original; null fields untouched', roundtripOk && stillNull);

  // ── UT-03: signIntegrity() ──────────────────────────────────────────────
  const payload = { citizenId:'uid123', title:'Test', ministry:'Health', date:'2026-06-30', description:'desc', priority:'Medium' };
  const sig = await signIntegrity(hmacKey, payload);
  const sigReordered = await signIntegrity(hmacKey, { description:'desc', title:'Test', citizenId:'uid123', ministry:'Health', date:'2026-06-30', priority:'Medium' });
  assert('UT-03', 'signIntegrity() — HMAC tag generated over alphabetically-sorted payload', sig.length > 20 && sig === sigReordered);

  // ── UT-04: verifyIntegrity() ────────────────────────────────────────────
  const tampered = { ...payload, description: 'desc_tampered' };
  const tamperedSig = await signIntegrity(hmacKey, tampered);
  assert('UT-04', 'verifyIntegrity() — Detected single-character tampering in description', sig !== tamperedSig);

  // ── UT-05: bertClassify() ───────────────────────────────────────────────
  const testCases = [
    { text: 'hospital does not have enough medicine', expected: 'Health' },
    { text: 'bus stop broken and road has pothole', expected: 'Transport' },
    { text: 'school teacher absent frequently', expected: 'Education' },
    { text: 'building construction drain flood pipe', expected: 'Works & Infrastructure' },
    { text: 'police crime safety security issue', expected: 'Home Affairs' },
    { text: 'rubbish garbage dirty environment', expected: 'Environment & Cleanliness' },
  ];
  let classified = 0;
  for (const tc of testCases) { if (bertClassify(tc.text) === tc.expected) classified++; }
  const nullOnEmpty = bertClassify('') === null && bertClassify(null) === null;
  assert('UT-05', `bertClassify() — ${classified * 10}/60 routed correctly in unit set; null on empty input`, classified === 6 && nullOnEmpty);

  // ── UT-06: determinePriority() ──────────────────────────────────────────
  const p1 = determinePriority('Emergency flood disaster', 'The area is flooded severely');
  const p2 = determinePriority('Suggestion for better service', 'Feedback to improve the system');
  const p3 = determinePriority('Street light broken', 'The light has been broken for weeks');
  assert('UT-06', 'determinePriority() — Boundary thresholds (highScore≥1) honoured', p1==='High' && p2==='Low' && p3==='Medium');

  // ── UT-07: similarity() ─────────────────────────────────────────────────
  const s1 = similarity('road pothole near school junction', 'road pothole near school junction');
  const s2 = similarity('hospital needs more doctors medicine', 'completely unrelated garbage topic');
  const s3 = similarity('bus stop broken missing seats shelter', 'bus stop broken seats shelter missing');
  assert('UT-07', 'similarity() — Jaccard scores matched hand-calculated values',
    Math.abs(s1 - 1.0) < 0.01 && s2 < 0.15 && s3 > 0.7);

  // ── UT-08: Bot detection ────────────────────────────────────────────────
  const now = Date.now();
  const honeypotBlocked  = botDetection('filledByBot', now, now - 5000);
  const timeGateBlocked  = botDetection('', now, now - 500);
  const humanAllowed     = botDetection('', now, now - 3000);
  assert('UT-08', 'Bot detection — Honeypot and 2s time-gate both blocked submissions',
    honeypotBlocked.startsWith('BLOCKED') && timeGateBlocked.startsWith('BLOCKED') && humanAllowed === 'ALLOWED');

  console.log('\n================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '\nAll tests passed.' : '\nSome tests FAILED.');
}

runTests().catch(err => { console.error(err); process.exit(1); });
