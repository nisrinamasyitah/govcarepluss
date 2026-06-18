import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { encrypt, decrypt, safeDecrypt, isEncrypted, verifyIntegrity } from '../crypto';

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f172a; }

  .demo-page {
    min-height: 100vh;
    background: #0f172a;
    color: #e2e8f0;
    padding: 40px 24px;
    font-family: 'Segoe UI', monospace, sans-serif;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 40px;
  }
  .demo-header h1 {
    font-size: 28px;
    font-weight: 800;
    color: #f1f5f9;
    margin-bottom: 10px;
    letter-spacing: -0.5px;
  }
  .demo-header p {
    color: #64748b;
    font-size: 14px;
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.6;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(99,102,241,0.15);
    border: 1px solid rgba(99,102,241,0.4);
    color: #818cf8;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 20px;
    margin-bottom: 14px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* Live indicator */
  .live-bar {
    max-width: 1100px;
    margin: 0 auto 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    background: rgba(16,185,129,0.07);
    border: 1px solid rgba(16,185,129,0.2);
    border-radius: 10px;
    padding: 12px 18px;
  }
  .live-dot {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: #10b981;
  }
  .live-dot::before {
    content: '';
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #10b981;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.3); }
  }
  .live-meta { font-size: 12px; color: #64748b; }
  .live-flash { color: #34d399 !important; transition: color 0.3s; }

  /* Section headers */
  .section-title {
    max-width: 1100px;
    margin: 32px auto 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #475569;
  }
  .section-title span { background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 3px 10px; color: #94a3b8; font-size: 11px; }

  /* Records grid */
  .records { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }

  .record-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 14px;
    overflow: hidden;
  }
  .record-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 18px;
    background: #0f172a;
    border-bottom: 1px solid #334155;
    font-size: 12px;
  }
  .record-uid { color: #475569; font-family: 'Courier New', monospace; }
  .record-tag {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .tag-user { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
  .tag-complaint { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }

  .record-fields { display: flex; flex-direction: column; }
  .field-row {
    display: grid;
    grid-template-columns: 130px 1fr 1fr;
    border-bottom: 1px solid #1e293b;
    font-size: 12px;
  }
  .field-row:last-child { border-bottom: none; }
  .field-name {
    padding: 10px 14px;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    background: #0f172a;
    font-size: 10px;
    border-right: 1px solid #1e293b;
    display: flex;
    align-items: center;
  }
  .field-plain {
    padding: 10px 14px;
    color: #fbbf24;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    line-height: 1.5;
    border-right: 1px solid #1e293b;
  }
  .field-stored {
    padding: 10px 14px;
    color: #34d399;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    line-height: 1.5;
    font-size: 11px;
  }
  .field-stored.no-enc { color: #475569; font-style: italic; }
  .col-header {
    display: grid;
    grid-template-columns: 130px 1fr 1fr;
    background: #0f172a;
    border-bottom: 1px solid #334155;
  }
  .col-header-cell {
    padding: 8px 14px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border-right: 1px solid #1e293b;
  }
  .col-header-cell:last-child { border-right: none; }
  .col-header-cell.plain-hdr  { color: #f59e0b; }
  .col-header-cell.stored-hdr { color: #10b981; }
  .col-header-cell.field-hdr  { color: #475569; }

  /* Integrity badge */
  .integrity-ok  { color: #10b981; font-size: 11px; font-weight: 700; }
  .integrity-fail { color: #ef4444; font-size: 11px; font-weight: 700; }
  .integrity-na  { color: #475569; font-size: 11px; }

  /* Empty / loading states */
  .empty-card {
    max-width: 1100px;
    margin: 0 auto;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 32px;
    text-align: center;
    color: #475569;
    font-size: 13px;
  }
  .loading-row { display: flex; align-items: center; justify-content: center; gap: 10px; color: #475569; font-size: 13px; }
  .spinner { width: 16px; height: 16px; border: 2px solid #334155; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Custom sandbox */
  .sandbox {
    max-width: 560px;
    margin: 40px auto 0;
    background: #1e293b;
    border-radius: 16px;
    padding: 28px;
    border: 1px solid #334155;
  }
  .sandbox h2 { font-size: 15px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px; }
  .input-row { display: flex; gap: 12px; }
  .demo-input {
    flex: 1; background: #0f172a; border: 1.5px solid #334155; border-radius: 10px;
    padding: 11px 14px; color: #f1f5f9; font-size: 14px; font-family: inherit;
    outline: none; transition: border-color 0.2s;
  }
  .demo-input:focus { border-color: #6366f1; }
  .demo-input::placeholder { color: #475569; }
  .btn-encrypt {
    background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none;
    border-radius: 10px; padding: 11px 18px; font-size: 13px; font-weight: 700;
    cursor: pointer; white-space: nowrap; transition: opacity 0.2s; font-family: inherit;
  }
  .btn-encrypt:hover { opacity: 0.85; }
  .btn-encrypt:disabled { opacity: 0.5; cursor: not-allowed; }
  .result-box { margin-top: 14px; display: none; flex-direction: column; gap: 10px; }
  .result-box.show { display: flex; }
  .result-row {}
  .result-key { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .result-val {
    font-size: 12px; font-family: 'Courier New', monospace; word-break: break-all;
    line-height: 1.5; padding: 8px 12px; border-radius: 6px;
  }
  .plain-bg  { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
  .enc-bg    { background: rgba(52,211,153,0.1);  color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
  .dec-bg    { background: rgba(99,102,241,0.1);  color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }

  @media (max-width: 767px) {
    .field-row { grid-template-columns: 90px 1fr; }
    .col-header { grid-template-columns: 90px 1fr; }
    .field-stored { display: none; }
    .col-header-cell.stored-hdr { display: none; }
    .field-row .field-plain { border-right: none; }
  }
`;

export default function EncryptionDemoPage() {
  const [adminStatus, setAdminStatus] = useState('checking'); // 'checking' | 'ok' | 'denied'
  const [users, setUsers]             = useState(null);
  const [complaints, setComplaints]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [flash, setFlash]             = useState(false);

  // Custom sandbox
  const [customText, setCustomText]     = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  function triggerFlash() {
    setLastUpdated(new Date());
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  }

  // Decrypt all PII fields for display
  async function processUser(doc) {
    const d = doc.data();
    return {
      id: doc.id,
      fullName:  { raw: d.fullName  ?? '—', plain: await safeDecrypt(d.fullName  ?? '') || '—' },
      email:     { raw: d.email     ?? '—', plain: await safeDecrypt(d.email     ?? '') || '—' },
      phone:     { raw: d.phone     ?? '—', plain: await safeDecrypt(d.phone     ?? '') || '—' },
      icNumber:  { raw: d.icNumber  ?? '—', plain: await safeDecrypt(d.icNumber  ?? '') || '—' },
      createdAt: d.createdAt ?? '—',
    };
  }

  async function processComplaint(doc) {
    const d = doc.data();
    const plainTitle  = await safeDecrypt(d.title        ?? '') || '—';
    const plainDesc   = await safeDecrypt(d.description  ?? '') || '—';
    const plainName   = await safeDecrypt(d.citizenName  ?? '') || '—';
    const plainEmail  = await safeDecrypt(d.citizenEmail ?? '') || '—';

    let integrity = null;
    if (d._integrity) {
      const payload = {
        citizenEmail: plainEmail, citizenId: d.citizenId || '',
        citizenName:  plainName,  date:      d.date      || '',
        description:  plainDesc,  id:        d.id        || '',
        ministry:     d.ministry  || '', priority: d.priority || '',
        title:        plainTitle,
      };
      integrity = await verifyIntegrity(payload, d._integrity);
    }

    return {
      id: doc.id,
      cid: d.id ?? doc.id,
      title:        { raw: d.title        ?? '—', plain: plainTitle },
      description:  { raw: d.description  ?? '—', plain: plainDesc  },
      citizenName:  { raw: d.citizenName  ?? '—', plain: plainName  },
      citizenEmail: { raw: d.citizenEmail ?? '—', plain: plainEmail },
      ministry:  d.ministry  ?? '—',
      status:    d.status    ?? '—',
      priority:  d.priority  ?? '—',
      integrity,
      hasHmac: !!d._integrity,
    };
  }

  useEffect(() => {
    // First check if current user is an admin
    const unsubAuth = onAuthStateChanged(auth, async user => {
      if (!user) { setAdminStatus('denied'); return; }
      const adminDoc = await getDoc(doc(db, 'admins', user.uid));
      if (!adminDoc.exists()) { setAdminStatus('denied'); return; }
      setAdminStatus('ok');
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (adminStatus !== 'ok') return;

    const qUsers = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(15));
    const unsubUsers = onSnapshot(qUsers, async snap => {
      const processed = await Promise.all(snap.docs.map(processUser));
      setUsers(processed);
      triggerFlash();
    }, () => setUsers([]));

    const qComplaints = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(15));
    const unsubComplaints = onSnapshot(qComplaints, async snap => {
      const processed = await Promise.all(snap.docs.map(processComplaint));
      setComplaints(processed);
      triggerFlash();
    }, () => setComplaints([]));

    return () => { unsubUsers(); unsubComplaints(); };
  }, [adminStatus]);

  async function handleCustom() {
    if (!customText.trim()) return;
    setCustomLoading(true);
    const enc = await encrypt(customText.trim());
    const dec = await decrypt(enc);
    setCustomResult({ plain: customText.trim(), encrypted: enc, decrypted: dec });
    setCustomLoading(false);
  }

  const totalRecords = (users?.length ?? 0) + (complaints?.length ?? 0);

  if (adminStatus === 'checking') {
    return (
      <>
        <style>{css}</style>
        <div className="demo-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-row"><div className="spinner"/>Checking credentials…</div>
        </div>
      </>
    );
  }

  if (adminStatus === 'denied') {
    return (
      <>
        <style>{css}</style>
        <div className="demo-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>Admin access required</div>
          <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', maxWidth: 340 }}>
            This page shows sensitive encrypted data and can only be viewed by admins.
          </div>
          <a href="/admin/login" style={{ marginTop: 8, background: 'linear-gradient(135deg,#6E4978,#8a5a96)', color: '#fff', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Go to Admin Login
          </a>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="demo-page">

        {/* Header */}
        <div className="demo-header">
          <div className="badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            AES-256-GCM · PBKDF2 · Live Firebase Data
          </div>
          <h1>Encryption Live View</h1>
          <p>
            Real data from Firestore — auto-updates whenever a new user registers or complaint is submitted.
            Left column shows plaintext (decrypted in-browser). Right column shows what is physically stored.
          </p>
        </div>

        {/* Live bar */}
        <div className="live-bar">
          <div className="live-dot">Live — Firebase onSnapshot</div>
          <div className={`live-meta ${flash ? 'live-flash' : ''}`}>
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString('en-MY')}  ·  ${totalRecords} records`
              : 'Connecting to Firebase…'}
          </div>
        </div>

        {/* ── USERS ── */}
        <div className="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          </svg>
          Collection: users
          <span>{users === null ? '…' : users.length}</span>
        </div>

        {users === null ? (
          <div className="empty-card"><div className="loading-row"><div className="spinner"/>Loading users…</div></div>
        ) : users.length === 0 ? (
          <div className="empty-card">No users registered yet.</div>
        ) : (
          <div className="records">
            {users.map(u => (
              <div className="record-card" key={u.id}>
                <div className="record-card-header">
                  <span className="record-uid">UID: {u.id}</span>
                  <span className="record-tag tag-user">User</span>
                </div>
                <div className="col-header">
                  <div className="col-header-cell field-hdr">Field</div>
                  <div className="col-header-cell plain-hdr">Plaintext (browser decrypts)</div>
                  <div className="col-header-cell stored-hdr">Stored in Firestore (ciphertext)</div>
                </div>
                <div className="record-fields">
                  {[
                    { name: 'fullName',  f: u.fullName  },
                    { name: 'email',     f: u.email     },
                    { name: 'phone',     f: u.phone     },
                    { name: 'icNumber',  f: u.icNumber  },
                  ].map(({ name, f }) => (
                    <div className="field-row" key={name}>
                      <div className="field-name">{name}</div>
                      <div className="field-plain">{f.plain}</div>
                      <div className={`field-stored${isEncrypted(f.raw) ? '' : ' no-enc'}`}>
                        {isEncrypted(f.raw) ? f.raw : '(not encrypted)'}
                      </div>
                    </div>
                  ))}
                  <div className="field-row">
                    <div className="field-name">createdAt</div>
                    <div className="field-plain" style={{ color: '#94a3b8' }}>{String(u.createdAt)}</div>
                    <div className="field-stored no-enc">(plaintext — not PII)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── COMPLAINTS ── */}
        <div className="section-title" style={{ marginTop: 40 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          Collection: complaints
          <span>{complaints === null ? '…' : complaints.length}</span>
        </div>

        {complaints === null ? (
          <div className="empty-card"><div className="loading-row"><div className="spinner"/>Loading complaints…</div></div>
        ) : complaints.length === 0 ? (
          <div className="empty-card">No complaints submitted yet.</div>
        ) : (
          <div className="records">
            {complaints.map(c => (
              <div className="record-card" key={c.id}>
                <div className="record-card-header">
                  <span className="record-uid">ID: {c.cid}  ·  {c.ministry}  ·  {c.status}</span>
                  <span className="record-tag tag-complaint">Complaint</span>
                </div>
                <div className="col-header">
                  <div className="col-header-cell field-hdr">Field</div>
                  <div className="col-header-cell plain-hdr">Plaintext (browser decrypts)</div>
                  <div className="col-header-cell stored-hdr">Stored in Firestore (ciphertext)</div>
                </div>
                <div className="record-fields">
                  {[
                    { name: 'citizenName',  f: c.citizenName  },
                    { name: 'citizenEmail', f: c.citizenEmail },
                    { name: 'title',        f: c.title        },
                    { name: 'description',  f: c.description  },
                  ].map(({ name, f }) => (
                    <div className="field-row" key={name}>
                      <div className="field-name">{name}</div>
                      <div className="field-plain">{f.plain}</div>
                      <div className={`field-stored${isEncrypted(f.raw) ? '' : ' no-enc'}`}>
                        {isEncrypted(f.raw) ? f.raw : '(not encrypted)'}
                      </div>
                    </div>
                  ))}
                  <div className="field-row">
                    <div className="field-name">_integrity</div>
                    <div className="field-plain">
                      {!c.hasHmac
                        ? <span className="integrity-na">n/a — submitted before HMAC was added</span>
                        : c.integrity === true
                          ? <span className="integrity-ok">✓ VERIFIED — no tampering detected</span>
                          : <span className="integrity-fail">⚠ MISMATCH — data may have been altered</span>
                      }
                    </div>
                    <div className="field-stored no-enc">(HMAC-SHA256 signature)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Sandbox ── */}
        <div className="sandbox">
          <h2>Try encrypting your own value</h2>
          <div className="input-row">
            <input
              className="demo-input"
              type="text"
              placeholder="Type any sensitive value…"
              value={customText}
              onChange={e => { setCustomText(e.target.value); setCustomResult(null); }}
              onKeyDown={e => e.key === 'Enter' && handleCustom()}
            />
            <button
              className="btn-encrypt"
              onClick={handleCustom}
              disabled={!customText.trim() || customLoading}
            >
              {customLoading ? '…' : 'Encrypt'}
            </button>
          </div>
          <div className={`result-box${customResult ? ' show' : ''}`}>
            {customResult && (
              <>
                <div className="result-row">
                  <div className="result-key">Original (plaintext)</div>
                  <div className="result-val plain-bg">{customResult.plain}</div>
                </div>
                <div className="result-row">
                  <div className="result-key">Stored in Firestore (AES-256-GCM encrypted)</div>
                  <div className="result-val enc-bg">{customResult.encrypted}</div>
                </div>
                <div className="result-row">
                  <div className="result-key">Decrypted back (browser only)</div>
                  <div className="result-val dec-bg">{customResult.decrypted}</div>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
