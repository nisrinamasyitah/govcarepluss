import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { encrypt, decrypt, safeDecrypt, isEncrypted, verifyIntegrity } from '../crypto';

const STYLE_ID = 'govcare-enc-report-css';

const encReportCss = `
  .enc-report { display: flex; flex-direction: column; gap: 24px; }

  /* Live bar */
  .enc-live-bar {
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
    background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.2);
    border-radius: 10px; padding: 12px 18px;
  }
  .admin-page.light .enc-live-bar { background: rgba(16,185,129,0.05); border-color: rgba(16,185,129,0.3); }
  .enc-live-dot {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 700; color: #10b981;
  }
  .enc-live-dot::before {
    content: ''; width: 8px; height: 8px; border-radius: 50%;
    background: #10b981; animation: enc-pulse 1.5s infinite;
  }
  @keyframes enc-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.5; transform: scale(1.4); }
  }
  .enc-live-meta { font-size: 12px; color: #64748b; }
  .enc-live-flash { color: #34d399 !important; }

  /* KPI strip */
  .enc-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .enc-kpi {
    background: #1e293b; border: 1px solid #334155; border-radius: 13px;
    padding: 18px 20px; display: flex; flex-direction: column; gap: 6px;
  }
  .admin-page.light .enc-kpi { background: white; border-color: #e5e7eb; }
  .enc-kpi-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; }
  .enc-kpi-val { font-size: 30px; font-weight: 800; color: #f1f5f9; letter-spacing: -1px; line-height: 1; }
  .admin-page.light .enc-kpi-val { color: #0f172a; }
  .enc-kpi-sub { font-size: 11px; font-weight: 600; }

  /* Section header */
  .enc-section-hdr {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569;
    padding-bottom: 12px; border-bottom: 1px solid #334155;
  }
  .admin-page.light .enc-section-hdr { border-color: #e5e7eb; }
  .enc-count-badge {
    background: #1e293b; border: 1px solid #334155; border-radius: 6px;
    padding: 2px 10px; color: #94a3b8; font-size: 11px;
  }
  .admin-page.light .enc-count-badge { background: #f3f4f6; border-color: #e5e7eb; }

  /* Record cards */
  .enc-records { display: flex; flex-direction: column; gap: 12px; }

  .enc-card {
    background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden;
  }
  .admin-page.light .enc-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

  .enc-card-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 16px; background: #0f172a; border-bottom: 1px solid #334155; font-size: 12px;
  }
  .admin-page.light .enc-card-hdr { background: #f8fafc; border-color: #e5e7eb; }
  .enc-card-uid { color: #475569; font-family: 'Courier New', monospace; font-size: 11px; }
  .enc-tag {
    font-size: 10px; font-weight: 700; padding: 2px 9px;
    border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .enc-tag-user     { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
  .enc-tag-complaint { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }

  .enc-col-hdr {
    display: grid; grid-template-columns: 120px 1fr 1fr;
    background: #0f172a; border-bottom: 1px solid #334155;
  }
  .admin-page.light .enc-col-hdr { background: #f8fafc; border-color: #e5e7eb; }
  .enc-col-cell {
    padding: 7px 14px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.6px; border-right: 1px solid #1e293b;
  }
  .admin-page.light .enc-col-cell { border-color: #e5e7eb; }
  .enc-col-cell:last-child { border-right: none; }
  .enc-col-field  { color: #475569; }
  .enc-col-plain  { color: #f59e0b; }
  .enc-col-stored { color: #10b981; }

  .enc-field-row {
    display: grid; grid-template-columns: 120px 1fr 1fr;
    border-bottom: 1px solid #0f172a; font-size: 12px;
  }
  .admin-page.light .enc-field-row { border-color: #f1f5f9; }
  .enc-field-row:last-child { border-bottom: none; }

  .enc-field-name {
    padding: 9px 14px; color: #475569; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.4px; font-size: 10px;
    background: #0f172a; border-right: 1px solid #1e293b;
    display: flex; align-items: center;
  }
  .admin-page.light .enc-field-name { background: #f8fafc; border-color: #e5e7eb; color: #9ca3af; }
  .enc-field-plain {
    padding: 9px 14px; color: #fbbf24; font-family: 'Courier New', monospace;
    word-break: break-all; line-height: 1.5; border-right: 1px solid #1e293b;
  }
  .admin-page.light .enc-field-plain { border-color: #e5e7eb; color: #b45309; }
  .enc-field-stored {
    padding: 9px 14px; color: #34d399; font-family: 'Courier New', monospace;
    word-break: break-all; line-height: 1.5; font-size: 11px;
  }
  .enc-field-stored.no-enc { color: #475569; font-style: italic; }
  .admin-page.light .enc-field-stored { color: #065f46; }

  /* Integrity */
  .enc-ok   { color: #10b981; font-weight: 700; }
  .enc-fail { color: #ef4444; font-weight: 700; }
  .enc-na   { color: #475569; }

  /* Empty / loading */
  .enc-empty {
    background: #1e293b; border: 1px solid #334155; border-radius: 10px;
    padding: 28px; text-align: center; color: #475569; font-size: 13px;
  }
  .admin-page.light .enc-empty { background: white; border-color: #e5e7eb; }
  .enc-spinner { width: 14px; height: 14px; border: 2px solid #334155; border-top-color: #B889C5; border-radius: 50%; animation: enc-spin 0.7s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
  @keyframes enc-spin { to { transform: rotate(360deg); } }

  /* Sandbox */
  .enc-sandbox {
    background: #1e293b; border: 1px solid #334155; border-radius: 13px; padding: 24px;
  }
  .admin-page.light .enc-sandbox { background: white; border-color: #e5e7eb; }
  .enc-sandbox-title { font-size: 14px; font-weight: 700; color: #f1f5f9; margin-bottom: 14px; }
  .admin-page.light .enc-sandbox-title { color: #1a1a1a; }
  .enc-sandbox-row { display: flex; gap: 10px; }
  .enc-sandbox-input {
    flex: 1; background: #0f172a; border: 1.5px solid #334155; border-radius: 9px;
    padding: 10px 14px; color: #f1f5f9; font-size: 13px; font-family: inherit;
    outline: none; transition: border-color 0.2s;
  }
  .admin-page.light .enc-sandbox-input { background: #f9fafb; border-color: #e5e7eb; color: #1a1a1a; }
  .enc-sandbox-input:focus { border-color: #B889C5; }
  .enc-sandbox-input::placeholder { color: #475569; }
  .enc-sandbox-btn {
    background: linear-gradient(135deg, #B889C5, #9b6aae); color: white; border: none;
    border-radius: 9px; padding: 10px 18px; font-size: 13px; font-weight: 700;
    cursor: pointer; white-space: nowrap; font-family: inherit; transition: opacity 0.2s;
  }
  .enc-sandbox-btn:hover { opacity: 0.88; }
  .enc-sandbox-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .enc-result { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .enc-result-lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .enc-result-val {
    font-size: 12px; font-family: 'Courier New', monospace; word-break: break-all;
    line-height: 1.5; padding: 8px 12px; border-radius: 7px;
  }
  .enc-plain-bg  { background: rgba(251,191,36,0.08); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
  .enc-stored-bg { background: rgba(52,211,153,0.08);  color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
  .enc-dec-bg    { background: rgba(184,137,197,0.1);  color: #B889C5; border: 1px solid rgba(184,137,197,0.3); }

  @media (max-width: 1024px) {
    .enc-kpis { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 767px) {
    .enc-col-hdr  { grid-template-columns: 90px 1fr; }
    .enc-field-row { grid-template-columns: 90px 1fr; }
    .enc-col-stored, .enc-field-stored { display: none; }
    .enc-field-plain { border-right: none; }
    .enc-kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  }
`;

export default function EncryptionReportPage({ darkMode }) {
  const [users, setUsers]           = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [flash, setFlash]           = useState(false);

  const [customText, setCustomText]     = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  // Inject CSS once
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement('style');
      s.id = STYLE_ID;
      s.textContent = encReportCss;
      document.head.appendChild(s);
    }
  }, []);

  function triggerFlash() {
    setLastUpdated(new Date());
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  }

  async function processUser(docSnap) {
    const d = docSnap.data();
    return {
      id: docSnap.id,
      fullName: { raw: d.fullName ?? '—', plain: await safeDecrypt(d.fullName ?? '') || '—' },
      email:    { raw: d.email    ?? '—', plain: await safeDecrypt(d.email    ?? '') || '—' },
      phone:    { raw: d.phone    ?? '—', plain: await safeDecrypt(d.phone    ?? '') || '—' },
      icNumber: { raw: d.icNumber ?? '—', plain: await safeDecrypt(d.icNumber ?? '') || '—' },
      createdAt: d.createdAt ?? '—',
    };
  }

  async function processComplaint(docSnap) {
    const d = docSnap.data();
    const plainTitle = await safeDecrypt(d.title        ?? '') || '—';
    const plainDesc  = await safeDecrypt(d.description  ?? '') || '—';
    const plainName  = await safeDecrypt(d.citizenName  ?? '') || '—';
    const plainEmail = await safeDecrypt(d.citizenEmail ?? '') || '—';

    let integrity = null;
    if (d._integrity) {
      integrity = await verifyIntegrity({
        citizenEmail: plainEmail, citizenId: d.citizenId || '',
        citizenName: plainName,   date: d.date || '',
        description: plainDesc,   id: d.id || '',
        ministry: d.ministry || '', priority: d.priority || '',
        title: plainTitle,
      }, d._integrity);
    }

    return {
      id: docSnap.id,
      cid: d.id ?? docSnap.id,
      title:        { raw: d.title        ?? '—', plain: plainTitle },
      description:  { raw: d.description  ?? '—', plain: plainDesc  },
      citizenName:  { raw: d.citizenName  ?? '—', plain: plainName  },
      citizenEmail: { raw: d.citizenEmail ?? '—', plain: plainEmail },
      ministry: d.ministry ?? '—',
      status:   d.status   ?? '—',
      integrity,
      hasHmac: !!d._integrity,
    };
  }

  useEffect(() => {
    const qU = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(20));
    const unsubU = onSnapshot(qU, async snap => {
      setUsers(await Promise.all(snap.docs.map(processUser)));
      triggerFlash();
    }, () => setUsers([]));

    const qC = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(20));
    const unsubC = onSnapshot(qC, async snap => {
      setComplaints(await Promise.all(snap.docs.map(processComplaint)));
      triggerFlash();
    }, () => setComplaints([]));

    return () => { unsubU(); unsubC(); };
  }, []);

  async function handleSandbox() {
    if (!customText.trim()) return;
    setCustomLoading(true);
    const enc = await encrypt(customText.trim());
    const dec = await decrypt(enc);
    setCustomResult({ plain: customText.trim(), enc, dec });
    setCustomLoading(false);
  }

  const totalUsers      = users?.length ?? 0;
  const totalComplaints = complaints?.length ?? 0;
  const encUsers        = users?.filter(u => isEncrypted(u.phone.raw)).length ?? 0;
  const encComplaints   = complaints?.filter(c => isEncrypted(c.title.raw)).length ?? 0;

  return (
    <div className="enc-report">

      {/* Page title */}
      <div>
        <div className="page-title">Encryption Report</div>
        <div className="page-subtitle">
          Live view of encrypted PII in Firestore — auto-updates when new users register or complaints are submitted
        </div>
      </div>

      {/* KPI strip */}
      <div className="enc-kpis">
        {[
          { lbl: 'Total Users',      val: users      === null ? '…' : totalUsers,      sub: 'registered accounts',    color: '#818cf8' },
          { lbl: 'Total Complaints', val: complaints === null ? '…' : totalComplaints, sub: 'submitted',               color: '#f59e0b' },
          { lbl: 'Encrypted Users',  val: users      === null ? '…' : encUsers,        sub: 'AES-256-GCM PII',         color: '#10b981' },
          { lbl: 'Encrypted Complaints', val: complaints === null ? '…' : encComplaints, sub: 'with HMAC integrity',   color: '#B889C5' },
        ].map((k, i) => (
          <div key={i} className="enc-kpi">
            <div className="enc-kpi-lbl">{k.lbl}</div>
            <div className="enc-kpi-val">{k.val}</div>
            <div className="enc-kpi-sub" style={{ color: k.color }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Live indicator */}
      <div className="enc-live-bar">
        <div className="enc-live-dot">Live — Firebase onSnapshot</div>
        <div className={`enc-live-meta${flash ? ' enc-live-flash' : ''}`}>
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString('en-MY')}  ·  ${totalUsers + totalComplaints} records`
            : 'Connecting to Firebase…'}
        </div>
      </div>

      {/* ── USERS ── */}
      <div>
        <div className="enc-section-hdr">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          </svg>
          Collection: users
          <span className="enc-count-badge">{users === null ? '…' : totalUsers}</span>
        </div>

        {users === null ? (
          <div className="enc-empty"><span className="enc-spinner"/>Loading users…</div>
        ) : users.length === 0 ? (
          <div className="enc-empty">No users registered yet.</div>
        ) : (
          <div className="enc-records">
            {users.map(u => (
              <div className="enc-card" key={u.id}>
                <div className="enc-card-hdr">
                  <span className="enc-card-uid">UID: {u.id}</span>
                  <span className="enc-tag enc-tag-user">User</span>
                </div>
                <div className="enc-col-hdr">
                  <div className="enc-col-cell enc-col-field">Field</div>
                  <div className="enc-col-cell enc-col-plain">Plaintext (decrypted in browser)</div>
                  <div className="enc-col-cell enc-col-stored">Stored in Firestore</div>
                </div>
                {[
                  { name: 'fullName', f: u.fullName },
                  { name: 'email',    f: u.email    },
                  { name: 'phone',    f: u.phone    },
                  { name: 'icNumber', f: u.icNumber },
                ].map(({ name, f }) => (
                  <div className="enc-field-row" key={name}>
                    <div className="enc-field-name">{name}</div>
                    <div className="enc-field-plain">{f.plain}</div>
                    <div className={`enc-field-stored${isEncrypted(f.raw) ? '' : ' no-enc'}`}>
                      {isEncrypted(f.raw) ? f.raw : '(not encrypted)'}
                    </div>
                  </div>
                ))}
                <div className="enc-field-row">
                  <div className="enc-field-name">createdAt</div>
                  <div className="enc-field-plain" style={{ color: '#94a3b8' }}>{String(u.createdAt)}</div>
                  <div className="enc-field-stored no-enc">(plaintext — not PII)</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── COMPLAINTS ── */}
      <div>
        <div className="enc-section-hdr">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          Collection: complaints
          <span className="enc-count-badge">{complaints === null ? '…' : totalComplaints}</span>
        </div>

        {complaints === null ? (
          <div className="enc-empty"><span className="enc-spinner"/>Loading complaints…</div>
        ) : complaints.length === 0 ? (
          <div className="enc-empty">No complaints submitted yet.</div>
        ) : (
          <div className="enc-records">
            {complaints.map(c => (
              <div className="enc-card" key={c.id}>
                <div className="enc-card-hdr">
                  <span className="enc-card-uid">ID: {c.cid}  ·  {c.ministry}  ·  {c.status}</span>
                  <span className="enc-tag enc-tag-complaint">Complaint</span>
                </div>
                <div className="enc-col-hdr">
                  <div className="enc-col-cell enc-col-field">Field</div>
                  <div className="enc-col-cell enc-col-plain">Plaintext (decrypted in browser)</div>
                  <div className="enc-col-cell enc-col-stored">Stored in Firestore</div>
                </div>
                {[
                  { name: 'citizenName',  f: c.citizenName  },
                  { name: 'citizenEmail', f: c.citizenEmail },
                  { name: 'title',        f: c.title        },
                  { name: 'description',  f: c.description  },
                ].map(({ name, f }) => (
                  <div className="enc-field-row" key={name}>
                    <div className="enc-field-name">{name}</div>
                    <div className="enc-field-plain">{f.plain}</div>
                    <div className={`enc-field-stored${isEncrypted(f.raw) ? '' : ' no-enc'}`}>
                      {isEncrypted(f.raw) ? f.raw : '(not encrypted)'}
                    </div>
                  </div>
                ))}
                <div className="enc-field-row">
                  <div className="enc-field-name">_integrity</div>
                  <div className="enc-field-plain">
                    {!c.hasHmac
                      ? <span className="enc-na">n/a — submitted before HMAC was added</span>
                      : c.integrity === true
                        ? <span className="enc-ok">✓ VERIFIED — no tampering detected</span>
                        : <span className="enc-fail">⚠ MISMATCH — data may have been altered</span>
                    }
                  </div>
                  <div className="enc-field-stored no-enc">(HMAC-SHA256 signature)</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sandbox ── */}
      <div className="enc-sandbox">
        <div className="enc-sandbox-title">Try encrypting your own value</div>
        <div className="enc-sandbox-row">
          <input
            className="enc-sandbox-input"
            type="text"
            placeholder="Type any sensitive value…"
            value={customText}
            onChange={e => { setCustomText(e.target.value); setCustomResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSandbox()}
          />
          <button
            className="enc-sandbox-btn"
            onClick={handleSandbox}
            disabled={!customText.trim() || customLoading}
          >
            {customLoading ? '…' : 'Encrypt'}
          </button>
        </div>
        {customResult && (
          <div className="enc-result">
            <div>
              <div className="enc-result-lbl">Original (plaintext)</div>
              <div className="enc-result-val enc-plain-bg">{customResult.plain}</div>
            </div>
            <div>
              <div className="enc-result-lbl">Stored in Firestore (AES-256-GCM)</div>
              <div className="enc-result-val enc-stored-bg">{customResult.enc}</div>
            </div>
            <div>
              <div className="enc-result-lbl">Decrypted back (browser only)</div>
              <div className="enc-result-val enc-dec-bg">{customResult.dec}</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
