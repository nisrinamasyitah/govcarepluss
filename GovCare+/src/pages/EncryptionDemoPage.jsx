import { useState } from 'react';
import { encrypt, decrypt } from '../crypto';

const DEMO_FIELDS = [
  { label: 'Phone Number',      value: '+60 12-345 6789' },
  { label: 'IC Number',         value: '990101-14-5678'   },
  { label: 'Full Name',         value: 'SITI AMINAH BINTI ALI' },
  { label: 'Home Address',      value: 'No 12, Jalan Merdeka, 50480 Kuala Lumpur' },
];

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f172a; }

  .demo-page {
    min-height: 100vh;
    background: #0f172a;
    color: #e2e8f0;
    padding: 48px 24px;
    font-family: 'Segoe UI', monospace, sans-serif;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 48px;
  }
  .demo-header h1 {
    font-size: 32px;
    font-weight: 800;
    color: #f1f5f9;
    margin-bottom: 10px;
    letter-spacing: -0.5px;
  }
  .demo-header p {
    color: #64748b;
    font-size: 15px;
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
    font-size: 12px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 20px;
    margin-bottom: 16px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    max-width: 1100px;
    margin: 0 auto 48px;
  }
  @media (max-width: 700px) { .demo-grid { grid-template-columns: 1fr; } }

  .panel {
    background: #1e293b;
    border-radius: 16px;
    padding: 28px;
    border: 1px solid #334155;
  }
  .panel-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .panel-title.plain  { color: #f59e0b; }
  .panel-title.enc    { color: #10b981; }
  .panel-title svg    { flex-shrink: 0; }

  .field-row {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #334155;
  }
  .field-row:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
  .field-label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .field-value {
    font-size: 14px;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    line-height: 1.5;
  }
  .field-value.plain-val { color: #fbbf24; }
  .field-value.enc-val   { color: #34d399; font-size: 12px; }

  .arrow-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 0 8px;
  }
  .arrow-item {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #475569;
    font-size: 22px;
  }

  .demo-input-section {
    max-width: 560px;
    margin: 0 auto 48px;
    background: #1e293b;
    border-radius: 16px;
    padding: 28px;
    border: 1px solid #334155;
  }
  .demo-input-section h2 {
    font-size: 16px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 16px;
  }
  .input-row { display: flex; gap: 12px; }
  .demo-input {
    flex: 1;
    background: #0f172a;
    border: 1.5px solid #334155;
    border-radius: 10px;
    padding: 12px 16px;
    color: #f1f5f9;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .demo-input:focus { border-color: #6366f1; }
  .demo-input::placeholder { color: #475569; }
  .btn-encrypt {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 10px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.2s;
    font-family: inherit;
  }
  .btn-encrypt:hover { opacity: 0.85; }
  .btn-encrypt:disabled { opacity: 0.5; cursor: not-allowed; }

  .result-box {
    margin-top: 16px;
    background: #0f172a;
    border-radius: 10px;
    padding: 16px;
    border: 1px solid #334155;
    display: none;
  }
  .result-box.show { display: block; }
  .result-row { margin-bottom: 12px; }
  .result-row:last-child { margin-bottom: 0; }
  .result-key { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
  .result-val {
    font-size: 13px;
    font-family: 'Courier New', monospace;
    word-break: break-all;
    line-height: 1.5;
    padding: 8px 12px;
    border-radius: 6px;
  }
  .result-val.plain-bg { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
  .result-val.enc-bg   { background: rgba(52,211,153,0.1); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
  .result-val.dec-bg   { background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }

  .legend {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 13px;
    color: #94a3b8;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dot-yellow { background: #f59e0b; }
  .dot-green  { background: #10b981; }
  .dot-indigo { background: #6366f1; }

  .firestore-note {
    max-width: 1100px;
    margin: 32px auto 0;
    background: rgba(16,185,129,0.08);
    border: 1px solid rgba(16,185,129,0.25);
    border-radius: 12px;
    padding: 20px 24px;
    color: #6ee7b7;
    font-size: 14px;
    line-height: 1.6;
  }
  .firestore-note strong { color: #34d399; }
`;

export default function EncryptionDemoPage() {
  const [rows, setRows] = useState(
    DEMO_FIELDS.map(f => ({ ...f, encrypted: null, loading: false }))
  );
  const [customText, setCustomText] = useState('');
  const [customResult, setCustomResult] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

  async function encryptAll() {
    const updated = await Promise.all(
      rows.map(async row => {
        const encrypted = await encrypt(row.value);
        return { ...row, encrypted };
      })
    );
    setRows(updated);
  }

  async function handleCustom() {
    if (!customText.trim()) return;
    setCustomLoading(true);
    const enc = await encrypt(customText.trim());
    const dec = await decrypt(enc);
    setCustomResult({ plain: customText.trim(), encrypted: enc, decrypted: dec });
    setCustomLoading(false);
  }

  const allEncrypted = rows.every(r => r.encrypted);

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
            AES-256-GCM · PBKDF2 · Web Crypto API
          </div>
          <h1>Encryption Demo</h1>
          <p>
            This shows the difference between what a user types (plaintext) and what is
            actually stored in Firestore (AES-256-GCM encrypted). The raw database never
            sees sensitive values.
          </p>
        </div>

        {/* Side-by-side panels */}
        {!allEncrypted ? (
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <button className="btn-encrypt" onClick={encryptAll}>
              🔒 &nbsp; Encrypt all fields — see what Firestore stores
            </button>
          </div>
        ) : null}

        <div className="demo-grid">
          {/* Plaintext panel */}
          <div className="panel">
            <div className="panel-title plain">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Plaintext — visible to anyone with DB access
            </div>
            {rows.map(row => (
              <div className="field-row" key={row.label}>
                <div className="field-label">{row.label}</div>
                <div className="field-value plain-val">{row.value}</div>
              </div>
            ))}
          </div>

          {/* Encrypted panel */}
          <div className="panel">
            <div className="panel-title enc">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Encrypted — what is actually stored in Firestore
            </div>
            {rows.map(row => (
              <div className="field-row" key={row.label}>
                <div className="field-label">{row.label}</div>
                <div className="field-value enc-val">
                  {row.encrypted ?? (
                    <span style={{ color: '#475569', fontStyle: 'italic' }}>
                      Click "Encrypt all fields" above ↑
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Try your own */}
        <div className="demo-input-section">
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
                  <div className="result-key">Decrypted back (what the user sees)</div>
                  <div className="result-val dec-bg">{customResult.decrypted}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="legend">
          <div className="legend-item"><div className="dot dot-yellow" /> Plaintext — readable by anyone</div>
          <div className="legend-item"><div className="dot dot-green"  /> Encrypted — stored in Firestore (starts with <code style={{color:'#34d399'}}>enc:</code>)</div>
          <div className="legend-item"><div className="dot dot-indigo" /> Decrypted — shown to the authorised user only</div>
        </div>

        {/* Firestore note */}
        <div className="firestore-note">
          <strong>How it works:</strong> When a user saves their phone number or IC, the app encrypts
          it with <strong>AES-256-GCM</strong> (key derived via PBKDF2 / SHA-256, 100,000 iterations)
          before the value ever leaves the browser. Firestore only ever receives the <code>enc:…</code> string.
          When the user opens their profile, the app fetches the encrypted string and decrypts it
          locally — the server never sees the plaintext.
        </div>

      </div>
    </>
  );
}
