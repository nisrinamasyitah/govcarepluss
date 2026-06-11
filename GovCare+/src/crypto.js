/**
 * Field-level AES-GCM encryption for sensitive PII stored in Firestore.
 *
 * All encryption/decryption runs entirely in the browser using the Web Crypto
 * API — no third-party library needed.  The symmetric key is derived once per
 * session via PBKDF2 and cached; the derivation secret comes from the Vite
 * environment variable VITE_ENCRYPTION_KEY (set in .env).
 *
 * Encrypted values are stored as base64 strings prefixed with "enc:" so
 * safeDecrypt can detect legacy plaintext values and return them unchanged
 * (backwards-compatible with any existing unencrypted Firestore documents).
 */

const SALT       = 'govcare-pdpa-salt-v1';
const HMAC_SALT  = 'govcare-hmac-salt-v1';
const ITERATIONS = 100_000;
const ENC_PREFIX = 'enc:';

let _keyPromise     = null;
let _hmacKeyPromise = null;

function getMasterSecret() {
  return import.meta.env.VITE_ENCRYPTION_KEY || 'govcare-fallback-key-change-in-production';
}

/**
 * Derives and caches a 256-bit AES-GCM key from the master secret.
 * The key is session-scoped (non-extractable) and lives only in memory.
 */
async function getKey() {
  if (_keyPromise) return _keyPromise;
  _keyPromise = (async () => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(getMasterSecret()),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(SALT),
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  })();
  return _keyPromise;
}

/**
 * Encrypts a plaintext string and returns a base64 string prefixed with "enc:".
 * A fresh 12-byte random IV is prepended to every ciphertext so each
 * encryption of the same value produces a different output.
 */
export async function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;
  const key = await getKey();
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(String(plaintext)),
  );
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return ENC_PREFIX + btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a value produced by encrypt().
 * Throws if the value was encrypted but the key or ciphertext is invalid.
 */
export async function decrypt(value) {
  if (!value || typeof value !== 'string' || !value.startsWith(ENC_PREFIX)) {
    return value;
  }
  const key = await getKey();
  const dec = new TextDecoder();
  const combined = Uint8Array.from(atob(value.slice(ENC_PREFIX.length)), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return dec.decode(plainBuffer);
}

/**
 * Attempts to decrypt a value; falls back to the original value on any error.
 * Use this when reading existing Firestore documents that may contain
 * plaintext values written before encryption was introduced.
 */
export async function safeDecrypt(value) {
  try {
    return await decrypt(value);
  } catch {
    return value;
  }
}

/**
 * Returns true if the value was produced by encrypt().
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

// ── HMAC-SHA256 integrity ────────────────────────────────────────────────────

async function getHMACKey() {
  if (_hmacKeyPromise) return _hmacKeyPromise;
  _hmacKeyPromise = (async () => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(getMasterSecret()),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(HMAC_SALT),
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  })();
  return _hmacKeyPromise;
}

/**
 * Creates an HMAC-SHA256 signature over a canonical JSON representation of
 * the provided data object.  Keys are sorted so field order doesn't matter.
 * Returns a base64 string.
 */
export async function signIntegrity(data) {
  const key = await getHMACKey();
  const enc = new TextEncoder();
  const canonical = JSON.stringify(data, Object.keys(data).sort());
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(canonical));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/**
 * Verifies a signature produced by signIntegrity().
 * Returns true if the data matches the stored signature, false otherwise.
 * A false result means the document was tampered with after submission.
 */
export async function verifyIntegrity(data, signature) {
  if (!signature) return false;
  try {
    const expected = await signIntegrity(data);
    return expected === signature;
  } catch {
    return false;
  }
}

// ── Field helpers ────────────────────────────────────────────────────────────

/**
 * Encrypts an object's specified fields in-place and returns the mutated copy.
 * Fields that are null/undefined/empty are left untouched.
 *
 * Usage: const safe = await encryptFields({ phone, icNumber }, ['phone', 'icNumber']);
 */
export async function encryptFields(obj, fields) {
  const result = { ...obj };
  await Promise.all(
    fields.map(async field => {
      if (result[field] != null && result[field] !== '') {
        result[field] = await encrypt(result[field]);
      }
    }),
  );
  return result;
}

/**
 * Decrypts an object's specified fields in-place and returns the mutated copy.
 */
export async function decryptFields(obj, fields) {
  const result = { ...obj };
  await Promise.all(
    fields.map(async field => {
      if (result[field]) {
        result[field] = await safeDecrypt(result[field]);
      }
    }),
  );
  return result;
}
