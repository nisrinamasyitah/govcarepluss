import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { encrypt, decrypt, safeDecrypt, isEncrypted, verifyIntegrity } from '../crypto';

// Detects XSS, script injection, or SQL injection patterns in plaintext
function isSuspicious(text) {
  if (!text || text === '—') return false;
  return (
    /<[a-z][\s\S]*?>/i.test(text)   ||   // HTML tags
    /javascript\s*:/i.test(text)    ||   // JS protocol
    /on\w+\s*=/i.test(text)         ||   // event handlers (onerror=, onload=)
    /\b(select|drop|insert|delete|union)\b\s+/i.test(text) // SQL keywords
  );
}

const STYLE_ID = 'govcare-enc-report-css';

const encReportCss = `
  .enc-report { display: flex; flex-direction: column; gap: 24px; font-family: 'Inter', 'Segoe UI', sans-serif; }

  /* KPI strip */
  .enc-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .enc-kpi {
    background: #1e293b; border: 1px solid #334155; border-radius: 13px;
    padding: 18px 20px; display: flex; flex-direction: column; gap: 6px;
  }
  .admin-page.light .enc-kpi { background: white; border-color: #e5e7eb; }
  .enc-kpi-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; }
  .enc-kpi-val { font-size: 30px; font-weight: 800; color: #f1f5f9; letter-spacing: -1px; line-height: 1; }
  .admin-page.light .enc-kpi-val { color: #0f172a; }
  .enc-kpi-sub { font-size: 11px; font-weight: 600; }

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

  /* Filter bar */
  .enc-filter-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .enc-tabs {
    display: flex; background: #0f172a; border: 1px solid #334155;
    border-radius: 10px; padding: 4px; gap: 4px;
  }
  .admin-page.light .enc-tabs { background: #f3f4f6; border-color: #e5e7eb; }
  .enc-tab {
    padding: 7px 16px; border-radius: 7px; font-size: 13px; font-weight: 600;
    cursor: pointer; border: none; background: transparent; color: #64748b;
    transition: all 0.18s; font-family: inherit; display: flex; align-items: center; gap: 6px;
  }
  .enc-tab:hover { color: #94a3b8; }
  .enc-tab.active { background: #1e293b; color: #f1f5f9; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
  .admin-page.light .enc-tab.active { background: white; color: #0f172a; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  .enc-tab-count {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; border-radius: 9px; font-size: 10px; font-weight: 700;
    background: #334155; color: #94a3b8; padding: 0 5px;
  }
  .enc-tab.active .enc-tab-count { background: #B889C5; color: white; }

  .enc-search-wrap { position: relative; flex: 1; min-width: 200px; max-width: 340px; }
  .enc-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #475569; pointer-events: none; }
  .enc-search {
    width: 100%; box-sizing: border-box;
    background: #0f172a; border: 1.5px solid #334155; border-radius: 9px;
    padding: 9px 14px 9px 36px; color: #f1f5f9; font-size: 13px; font-family: inherit;
    outline: none; transition: border-color 0.2s;
  }
  .admin-page.light .enc-search { background: #f9fafb; border-color: #e5e7eb; color: #1a1a1a; }
  .enc-search:focus { border-color: #B889C5; }
  .enc-search::placeholder { color: #475569; }

  /* Section header */
  .enc-section-hdr {
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569;
    padding-bottom: 12px; border-bottom: 1px solid #334155; margin-bottom: 14px;
  }
  .admin-page.light .enc-section-hdr { border-color: #e5e7eb; }
  .enc-count-badge {
    background: #1e293b; border: 1px solid #334155; border-radius: 6px;
    padding: 2px 10px; color: #94a3b8; font-size: 11px;
  }
  .admin-page.light .enc-count-badge { background: #f3f4f6; border-color: #e5e7eb; }

  /* Cards */
  .enc-records { display: flex; flex-direction: column; gap: 12px; }
  .enc-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
  .admin-page.light .enc-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

  .enc-card-hdr {
    display: flex; align-items: center; justify-content: space-between;
    padding: 11px 16px; background: #0f172a; border-bottom: 1px solid #334155;
  }
  .admin-page.light .enc-card-hdr { background: #f8fafc; border-color: #e5e7eb; }
  .enc-card-meta { color: #94a3b8; font-size: 13px; font-weight: 500; }
  .enc-card-meta strong { color: #f1f5f9; font-weight: 700; }
  .admin-page.light .enc-card-meta { color: #6b7280; }
  .admin-page.light .enc-card-meta strong { color: #111827; }

  .enc-tag {
    font-size: 10px; font-weight: 700; padding: 3px 10px;
    border-radius: 10px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .enc-tag-user      { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
  .enc-tag-complaint { background: rgba(245,158,11,0.15);  color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }

  /* Table columns */
  .enc-col-hdr { display: grid; grid-template-columns: 130px 1fr 1fr; background: #0f172a; border-bottom: 1px solid #334155; }
  .admin-page.light .enc-col-hdr { background: #f8fafc; border-color: #e5e7eb; }
  .enc-col-cell {
    padding: 7px 14px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.6px; color: #475569;
    border-right: 1px solid #1e293b;
  }
  .admin-page.light .enc-col-cell { border-color: #e5e7eb; }
  .enc-col-cell:last-child { border-right: none; }
  .enc-col-plain  { color: #f59e0b !important; }
  .enc-col-stored { color: #10b981 !important; }

  .enc-field-row { display: grid; grid-template-columns: 130px 1fr 1fr; border-bottom: 1px solid #0f172a; }
  .admin-page.light .enc-field-row { border-color: #f1f5f9; }
  .enc-field-row:last-child { border-bottom: none; }

  .enc-field-name {
    padding: 11px 14px; color: #64748b; font-size: 12px; font-weight: 600;
    background: #0f172a; border-right: 1px solid #1e293b; display: flex; align-items: flex-start;
  }
  .admin-page.light .enc-field-name { background: #f8fafc; border-color: #e5e7eb; color: #9ca3af; }

  /* Plaintext — readable Inter font, amber */
  .enc-field-plain {
    padding: 11px 14px; color: #fbbf24; font-size: 13px; line-height: 1.6;
    border-right: 1px solid #1e293b; word-break: break-word;
  }
  .admin-page.light .enc-field-plain { border-color: #e5e7eb; color: #92400e; }

  /* Ciphertext — monospace only for the raw stored value */
  .enc-field-stored {
    padding: 11px 14px; color: #34d399;
    font-family: 'Courier New', monospace; font-size: 10.5px;
    word-break: break-all; line-height: 1.5;
  }
  .enc-field-stored.no-enc { color: #475569; font-style: italic; font-family: inherit; font-size: 12px; }
  .admin-page.light .enc-field-stored { color: #065f46; }

  /* Integrity badges */
  .enc-ok   { color: #10b981; font-weight: 700; font-size: 13px; }
  .enc-fail { color: #ef4444; font-weight: 700; font-size: 13px; }
  .enc-na   { color: #475569; font-size: 12px; }

  /* Pagination */
  .enc-pagination {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 4px; font-size: 13px; color: #64748b;
  }
  .admin-page.light .enc-pagination { color: #6b7280; }
  .enc-page-btns { display: flex; gap: 6px; align-items: center; }
  .enc-page-btn {
    min-width: 32px; height: 32px; border-radius: 7px; border: 1px solid #334155;
    background: transparent; color: #94a3b8; font-size: 13px; font-weight: 600;
    cursor: pointer; font-family: inherit; padding: 0 10px; transition: all 0.15s;
  }
  .admin-page.light .enc-page-btn { border-color: #e5e7eb; color: #374151; }
  .enc-page-btn:hover:not(:disabled) { border-color: #B889C5; color: #B889C5; }
  .enc-page-btn.active { background: #B889C5; border-color: #B889C5; color: #fff; }
  .enc-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Empty / loading */
  .enc-empty {
    background: #1e293b; border: 1px solid #334155; border-radius: 10px;
    padding: 32px; text-align: center; color: #64748b; font-size: 14px;
  }
  .admin-page.light .enc-empty { background: white; border-color: #e5e7eb; }
  .enc-spinner {
    width: 14px; height: 14px; border: 2px solid #334155; border-top-color: #B889C5;
    border-radius: 50%; animation: enc-spin 0.7s linear infinite;
    display: inline-block; margin-right: 8px; vertical-align: middle;
  }
  @keyframes enc-spin { to { transform: rotate(360deg); } }

  /* Sandbox */
  .enc-sandbox { background: #1e293b; border: 1px solid #334155; border-radius: 13px; padding: 24px; }
  .admin-page.light .enc-sandbox { background: white; border-color: #e5e7eb; }
  .enc-sandbox-title { font-size: 15px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
  .admin-page.light .enc-sandbox-title { color: #1a1a1a; }
  .enc-sandbox-sub { font-size: 12px; color: #64748b; margin-bottom: 16px; }
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
    border-radius: 9px; padding: 10px 20px; font-size: 13px; font-weight: 700;
    cursor: pointer; white-space: nowrap; font-family: inherit; transition: opacity 0.2s;
  }
  .enc-sandbox-btn:hover { opacity: 0.88; }
  .enc-sandbox-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .enc-result { margin-top: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .enc-result-lbl { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .enc-result-val { font-size: 13px; word-break: break-all; line-height: 1.5; padding: 10px 14px; border-radius: 9px; }
  .enc-result-val.mono { font-family: 'Courier New', monospace; font-size: 11px; }
  .enc-plain-bg  { background: rgba(251,191,36,0.08); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
  .enc-stored-bg { background: rgba(52,211,153,0.08);  color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
  .enc-dec-bg    { background: rgba(184,137,197,0.1);  color: #B889C5; border: 1px solid rgba(184,137,197,0.3); }

  @media (max-width: 1024px) {
    .enc-kpis  { grid-template-columns: repeat(2, 1fr); }
    .enc-result { grid-template-columns: 1fr; }
  }
  @media (max-width: 767px) {
    .enc-kpis { grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .enc-col-hdr   { grid-template-columns: 100px 1fr; }
    .enc-field-row { grid-template-columns: 100px 1fr; }
    .enc-col-stored, .enc-field-stored { display: none; }
    .enc-field-plain { border-right: none; }
    .enc-filter-bar { flex-direction: column; align-items: flex-start; }
    .enc-search-wrap { max-width: 100%; width: 100%; }
  }
`;

export default function EncryptionReportPage({ darkMode }) {
  const [users, setUsers]             = useState(null);
  const [complaints, setComplaints]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [flash, setFlash]             = useState(false);

  const [tab, setTab]       = useState('all');
  const [search, setSearch] = useState('');
  const [cPage, setCPage]   = useState(1);
  const COMP_PER_PAGE = 5;

  const [customText, setCustomText]       = useState('');
  const [customResult, setCustomResult]   = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

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
        citizenName:  plainName,  date: d.date || '',
        description:  plainDesc,  id: d.id || '',
        ministry: d.ministry || '', priority: d.priority || '',
        title: plainTitle,
      }, d._integrity);
    }

    return {
      id: docSnap.id, cid: d.id ?? docSnap.id,
      title:        { raw: d.title        ?? '—', plain: plainTitle },
      description:  { raw: d.description  ?? '—', plain: plainDesc  },
      citizenName:  { raw: d.citizenName  ?? '—', plain: plainName  },
      citizenEmail: { raw: d.citizenEmail ?? '—', plain: plainEmail },
      ministry: d.ministry ?? '—', status: d.status ?? '—',
      integrity, hasHmac: !!d._integrity,
    };
  }

  useEffect(() => {
    const qU = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubU = onSnapshot(qU, async snap => {
      setUsers(await Promise.all(snap.docs.map(processUser)));
      triggerFlash();
    }, () => setUsers([]));

    const qC = query(collection(db, 'complaints'), orderBy('createdAt', 'asc'));
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

  useEffect(() => { setCPage(1); }, [search, tab]);

  const q = search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!users || !q) return users;
    return users.filter(u =>
      u.fullName.plain.toLowerCase().includes(q) ||
      u.email.plain.toLowerCase().includes(q) ||
      u.phone.plain.toLowerCase().includes(q) ||
      u.icNumber.plain.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  }, [users, q]);

  const filteredComplaints = useMemo(() => {
    if (!complaints || !q) return complaints;
    return complaints.filter(c =>
      c.citizenName.plain.toLowerCase().includes(q) ||
      c.citizenEmail.plain.toLowerCase().includes(q) ||
      c.title.plain.toLowerCase().includes(q) ||
      c.ministry.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q) ||
      c.cid.toLowerCase().includes(q)
    );
  }, [complaints, q]);

  const totalUsers      = users?.length ?? 0;
  const totalComplaints = complaints?.length ?? 0;
  const encUsers        = users?.filter(u => isEncrypted(u.phone.raw)).length ?? 0;
  const encComplaints   = complaints?.filter(c => isEncrypted(c.title.raw)).length ?? 0;

  const showUsers      = tab === 'all' || tab === 'users';
  const showComplaints = tab === 'all' || tab === 'complaints';

  return (
    <div className="enc-report">

      {/* Header */}
      <div>
        <div className="page-title">Encryption Report</div>
        <div className="page-subtitle">
          Live Firestore view — PII encrypted with AES-256-GCM, decrypted only in your browser
        </div>
      </div>

      {/* KPIs */}
      <div className="enc-kpis">
        {[
          { lbl: 'Total Users',          val: users      === null ? '…' : totalUsers,      sub: 'registered accounts', color: '#818cf8' },
          { lbl: 'Total Complaints',     val: complaints === null ? '…' : totalComplaints, sub: 'submitted',            color: '#f59e0b' },
          { lbl: 'Encrypted Users',      val: users      === null ? '…' : encUsers,        sub: 'AES-256-GCM PII',      color: '#10b981' },
          { lbl: 'Encrypted Complaints', val: complaints === null ? '…' : encComplaints,   sub: 'with HMAC integrity',  color: '#B889C5' },
        ].map((k, i) => (
          <div key={i} className="enc-kpi">
            <div className="enc-kpi-lbl">{k.lbl}</div>
            <div className="enc-kpi-val">{k.val}</div>
            <div className="enc-kpi-sub" style={{ color: k.color }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Live bar */}
      <div className="enc-live-bar">
        <div className="enc-live-dot">Live — Firebase onSnapshot</div>
        <div className={`enc-live-meta${flash ? ' enc-live-flash' : ''}`}>
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString('en-MY')} · ${totalUsers + totalComplaints} total records`
            : 'Connecting to Firebase…'}
        </div>
      </div>

      {/* Filter bar */}
      <div className="enc-filter-bar">
        <div className="enc-tabs">
          {[
            { id: 'all',        label: 'All',        count: totalUsers + totalComplaints },
            { id: 'users',      label: 'Users',      count: totalUsers },
            { id: 'complaints', label: 'Complaints', count: totalComplaints },
          ].map(t => (
            <button
              key={t.id}
              className={`enc-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              <span className="enc-tab-count">{t.count}</span>
            </button>
          ))}
        </div>

        <div className="enc-search-wrap">
          <svg className="enc-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="enc-search"
            type="text"
            placeholder="Search name, email, title, ministry…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── USERS ── */}
      {showUsers && (
        <div>
          <div className="enc-section-hdr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            Users
            <span className="enc-count-badge">
              {filteredUsers === null ? '…' : `${filteredUsers.length}${q ? ` of ${totalUsers}` : ''}`}
            </span>
          </div>

          {filteredUsers === null ? (
            <div className="enc-empty"><span className="enc-spinner"/>Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="enc-empty">{q ? `No users match "${search}"` : 'No users registered yet.'}</div>
          ) : (
            <div className="enc-records">
              {filteredUsers.map(u => (
                <div className="enc-card" key={u.id}>
                  <div className="enc-card-hdr">
                    <span className="enc-card-meta">
                      <strong>{u.fullName.plain}</strong>&nbsp;·&nbsp;{u.email.plain}
                    </span>
                    <span className="enc-tag enc-tag-user">User</span>
                  </div>
                  <div className="enc-col-hdr">
                    <div className="enc-col-cell">Field</div>
                    <div className="enc-col-cell enc-col-plain">Plaintext (decrypted)</div>
                    <div className="enc-col-cell enc-col-stored">Stored in Firestore</div>
                  </div>
                  {[
                    { name: 'Full Name', f: u.fullName },
                    { name: 'Email',     f: u.email    },
                    { name: 'Phone',     f: u.phone    },
                    { name: 'IC Number', f: u.icNumber },
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
                    <div className="enc-field-name">Registered</div>
                    <div className="enc-field-plain" style={{ color: '#94a3b8', fontSize: '12px' }}>{String(u.createdAt)}</div>
                    <div className="enc-field-stored no-enc">plaintext — not PII</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMPLAINTS ── */}
      {showComplaints && (
        <div>
          <div className="enc-section-hdr">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Complaints
            <span className="enc-count-badge">
              {filteredComplaints === null ? '…' : `${filteredComplaints.length}${q ? ` of ${totalComplaints}` : ''}`}
            </span>
          </div>

          {filteredComplaints === null ? (
            <div className="enc-empty"><span className="enc-spinner"/>Loading complaints…</div>
          ) : filteredComplaints.length === 0 ? (
            <div className="enc-empty">{q ? `No complaints match "${search}"` : 'No complaints submitted yet.'}</div>
          ) : (() => {
            const totalC   = filteredComplaints.length;
            const totalPgs = Math.ceil(totalC / COMP_PER_PAGE);
            const safePage = Math.min(cPage, totalPgs);
            const paged    = filteredComplaints.slice((safePage - 1) * COMP_PER_PAGE, safePage * COMP_PER_PAGE);
            const start    = (safePage - 1) * COMP_PER_PAGE + 1;
            const end      = Math.min(safePage * COMP_PER_PAGE, totalC);
            const pageNums = Array.from({ length: totalPgs }, (_, i) => i + 1);
            return (
            <>
            <div className="enc-records">
              {paged.map(c => (
                <div className="enc-card" key={c.id}>
                  <div className="enc-card-hdr">
                    <span className="enc-card-meta">
                      <strong>{c.citizenName.plain}</strong>
                      &nbsp;·&nbsp;{c.ministry}
                      &nbsp;·&nbsp;<span style={{ textTransform: 'capitalize' }}>{c.status}</span>
                    </span>
                    <span className="enc-tag enc-tag-complaint">Complaint</span>
                  </div>
                  <div className="enc-col-hdr">
                    <div className="enc-col-cell">Field</div>
                    <div className="enc-col-cell enc-col-plain">Plaintext (decrypted)</div>
                    <div className="enc-col-cell enc-col-stored">Stored in Firestore</div>
                  </div>
                  {[
                    { name: 'Citizen Name',  f: c.citizenName  },
                    { name: 'Citizen Email', f: c.citizenEmail },
                    { name: 'Title',         f: c.title        },
                    { name: 'Description',   f: c.description  },
                  ].map(({ name, f }) => (
                    <div className="enc-field-row" key={name}>
                      <div className="enc-field-name">{name}</div>
                      <div className="enc-field-plain">{f.plain}</div>
                      <div className={`enc-field-stored${isEncrypted(f.raw) ? '' : ' no-enc'}`}>
                        {isEncrypted(f.raw) ? f.raw : '(not encrypted)'}
                      </div>
                    </div>
                  ))}
                  <div className="enc-field-row" style={(isSuspicious(c.title?.plain) || isSuspicious(c.description?.plain)) ? {background:'rgba(239,68,68,0.08)',borderRadius:8} : {}}>
                    <div className="enc-field-name" style={(isSuspicious(c.title?.plain) || isSuspicious(c.description?.plain)) ? {color:'#f87171'} : {}}>Integrity</div>
                    <div className="enc-field-plain">
                      {!c.hasHmac
                        ? <span className="enc-na">n/a — submitted before HMAC was added</span>
                        : (isSuspicious(c.title?.plain) || isSuspicious(c.description?.plain))
                          ? <span className="enc-fail">⚠ Verified — tampering detected (malicious content: HTML / script injection / SQL keywords found in submission)</span>
                          : c.integrity === true
                            ? <span className="enc-ok">✓ Verified — no tampering detected</span>
                            : <span className="enc-fail">⚠ Mismatch — data may have been altered</span>
                      }
                    </div>
                    <div className="enc-field-stored no-enc" style={(isSuspicious(c.title?.plain) || isSuspicious(c.description?.plain)) ? {color:'#f87171'} : {}}>
                      {(isSuspicious(c.title?.plain) || isSuspicious(c.description?.plain)) ? 'XSS / SQLi flag' : 'HMAC-SHA256 signature'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="enc-pagination">
              <span>Showing {start}–{end} of {totalC} complaints</span>
              <div className="enc-page-btns">
                <button className="enc-page-btn" onClick={() => setCPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>← Prev</button>
                {pageNums.map(n => (
                  <button key={n} className={`enc-page-btn${safePage === n ? ' active' : ''}`} onClick={() => setCPage(n)}>{n}</button>
                ))}
                <button className="enc-page-btn" onClick={() => setCPage(p => Math.min(totalPgs, p + 1))} disabled={safePage === totalPgs}>Next →</button>
              </div>
            </div>
            </>
          );
          })()}
        </div>
      )}

      {/* ── Sandbox ── */}
      <div className="enc-sandbox">
        <div className="enc-sandbox-title">Encryption Sandbox</div>
        <div className="enc-sandbox-sub">Try encrypting any value to see how it's stored in Firestore</div>
        <div className="enc-sandbox-row">
          <input
            className="enc-sandbox-input"
            type="text"
            placeholder="Type any value to encrypt…"
            value={customText}
            onChange={e => { setCustomText(e.target.value); setCustomResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleSandbox()}
          />
          <button
            className="enc-sandbox-btn"
            onClick={handleSandbox}
            disabled={!customText.trim() || customLoading}
          >
            {customLoading ? 'Encrypting…' : 'Encrypt'}
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
              <div className="enc-result-val enc-stored-bg mono">{customResult.enc}</div>
            </div>
            <div>
              <div className="enc-result-lbl">Decrypted back</div>
              <div className="enc-result-val enc-dec-bg">{customResult.dec}</div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
