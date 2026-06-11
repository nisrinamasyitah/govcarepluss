import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import ReCAPTCHA from 'react-google-recaptcha';

const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; }

  .admin-login-page {
    font-family: 'Inter', sans-serif;
    min-height: 100vh;
    display: flex;
    background: #0a0f1e;
    -webkit-font-smoothing: antialiased;
  }

  /* Left Panel */
  .admin-left-panel {
    width: 55%;
    background: linear-gradient(145deg, #7a3f8c 0%, #9b5aad 40%, #B889C5 70%, #c9a0d4 100%);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 48px 56px;
    position: relative;
    overflow: hidden;
  }
  .admin-left-panel::before {
    content: '';
    position: absolute;
    top: -100px; right: -100px;
    width: 400px; height: 400px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
  }
  .admin-left-panel::after {
    content: '';
    position: absolute;
    bottom: -80px; left: -60px;
    width: 300px; height: 300px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
  }
  .left-brand { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
  .left-logo { width: 44px; height: 44px; }
  .left-logo img { width: 100%; height: 100%; object-fit: contain; }
  .left-brand-name { color: white; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
  .left-brand-badge {
    margin-left: 4px; background: rgba(255,255,255,0.2);
    color: white; font-size: 10px; font-weight: 700;
    padding: 3px 8px; border-radius: 4px; letter-spacing: 1px;
    text-transform: uppercase; vertical-align: middle;
  }

  .left-hero { position: relative; z-index: 1; }
  .left-hero h1 {
    color: white; font-size: 42px; font-weight: 800;
    line-height: 1.2; margin-bottom: 20px; letter-spacing: -1px;
  }
  .left-hero h1 span { color: #f5d0ff; }
  .left-hero p { color: rgba(255,255,255,0.8); font-size: 16px; line-height: 1.6; max-width: 420px; }

  .left-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; position: relative; z-index: 1; }
  .left-stat { background: rgba(255,255,255,0.1); border-radius: 14px; padding: 20px; border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(10px); }
  .left-stat-number { font-size: 28px; font-weight: 800; color: white; margin-bottom: 4px; }
  .left-stat-label { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; }
  .left-stat-trend { font-size: 11px; color: #86efac; font-weight: 600; margin-top: 6px; }

  .left-security { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
  .left-security-badge {
    display: flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
    border-radius: 8px; padding: 8px 14px; font-size: 12px; color: rgba(255,255,255,0.9); font-weight: 500;
  }

  /* Right Panel */
  .admin-right-panel {
    width: 45%;
    background: #0f172a;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 56px;
    position: relative;
  }

  .right-top-controls {
    position: absolute; top: 24px; right: 24px;
    display: flex; align-items: center; gap: 8px;
  }
  .ctrl-btn {
    width: 36px; height: 36px; border-radius: 8px;
    border: 1px solid #1e293b; background: #1e293b;
    color: #94a3b8; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .ctrl-btn:hover { background: #334155; color: #e2e8f0; }

  .right-form-wrap { width: 100%; max-width: 380px; }

  .right-header { margin-bottom: 36px; }
  .right-header .admin-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(184,137,197,0.2); border: 1px solid rgba(184,137,197,0.4);
    color: #B889C5; font-size: 12px; font-weight: 600;
    padding: 6px 12px; border-radius: 20px; margin-bottom: 16px;
    letter-spacing: 0.5px;
  }
  .right-header h2 { color: #f1f5f9; font-size: 30px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
  .right-header p { color: #64748b; font-size: 14px; }

  .error-banner {
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
    color: #fca5a5; border-radius: 10px; padding: 12px 16px;
    font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
  }
  .success-banner {
    background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
    color: #6ee7b7; border-radius: 10px; padding: 12px 16px;
    font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;
  }

  .field-group { margin-bottom: 20px; }
  .field-group label { display: block; color: #94a3b8; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .field-input {
    width: 100%; padding: 14px 16px;
    background: #1e293b; border: 1.5px solid #1e293b;
    border-radius: 10px; color: #f1f5f9; font-size: 14px;
    font-family: inherit; transition: all 0.2s; outline: none;
  }
  .field-input:focus { border-color: #B889C5; box-shadow: 0 0 0 3px rgba(184,137,197,0.15); }
  .field-input::placeholder { color: #475569; }
  .field-input.light {
    background: #f9fafb; border-color: #e5e7eb; color: #1a1a1a;
  }
  .field-input.light:focus { border-color: #6E4978; box-shadow: 0 0 0 3px rgba(110,73,120,0.1); }
  .field-input.light::placeholder { color: #9ca3af; }

  .password-field { position: relative; }
  .password-field .field-input { padding-right: 48px; }
  .eye-btn {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: #475569; cursor: pointer; padding: 4px;
    display: flex; align-items: center; justify-content: center; transition: color 0.2s;
  }
  .eye-btn:hover { color: #94a3b8; }

  .field-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; margin-top: -8px; }
  .remember-wrap { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  .remember-wrap input[type="checkbox"] { width: 16px; height: 16px; accent-color: #B889C5; cursor: pointer; }
  .remember-wrap span { font-size: 13px; color: #64748b; }
  .forgot-link { font-size: 13px; color: #6366f1; text-decoration: none; font-weight: 500; }
  .forgot-link:hover { color: #818cf8; text-decoration: underline; }

  .btn-admin-login {
    width: 100%; padding: 15px; background: linear-gradient(135deg, #6E4978, #8a5a96);
    color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 700;
    cursor: pointer; transition: all 0.2s; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    position: relative; overflow: hidden;
  }
  .btn-admin-login:hover { transform: translateY(-1px); box-shadow: 0 8px 25px rgba(79,70,229,0.4); }
  .btn-admin-login:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
  .btn-admin-login .spinner {
    width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white; border-radius: 50%;
    animation: spin 0.7s linear infinite; display: none;
  }
  .btn-admin-login.loading .spinner { display: block; }
  .btn-admin-login.loading .btn-text { display: none; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
  .divider hr { flex: 1; border: none; border-top: 1px solid #1e293b; }
  .divider span { font-size: 12px; color: #475569; font-weight: 500; }

  .user-login-link {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 13px; background: #1e293b; border: 1px solid #334155;
    border-radius: 10px; color: #94a3b8; font-size: 14px; font-weight: 500;
    text-decoration: none; transition: all 0.2s;
  }
  .user-login-link:hover { background: #334155; color: #e2e8f0; border-color: #475569; }

  .right-footer { margin-top: 32px; text-align: center; }
  .right-footer p { font-size: 12px; color: #334155; }

  .captcha-wrapper { display: flex; justify-content: center; margin: 0 0 20px; }

  /* Light Mode */
  .admin-login-page.light .admin-right-panel { background: #f8fafc; }
  .admin-login-page.light .right-top-controls .ctrl-btn { background: white; border-color: #e5e7eb; color: #6b7280; }
  .admin-login-page.light .right-top-controls .ctrl-btn:hover { background: #f3f4f6; color: #1a1a1a; }
  .admin-login-page.light .right-header .admin-tag { background: rgba(184,137,197,0.15); border-color: #B889C5; color: #6E4978; }
  .admin-login-page.light .right-header h2 { color: #1a1a1a; }
  .admin-login-page.light .right-header p { color: #6b7280; }
  .admin-login-page.light .field-group label { color: #6b7280; }
  .admin-login-page.light .remember-wrap span { color: #6b7280; }
  .admin-login-page.light .divider hr { border-color: #e5e7eb; }
  .admin-login-page.light .divider span { color: #9ca3af; }
  .admin-login-page.light .user-login-link { background: white; border-color: #e5e7eb; color: #6b7280; }
  .admin-login-page.light .user-login-link:hover { background: #f3f4f6; color: #1a1a1a; }
  .admin-login-page.light .right-footer p { color: #d1d5db; }
  .admin-login-page.light .error-banner { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
  .admin-login-page.light .success-banner { background: #d1fae5; border-color: #a7f3d0; color: #065f46; }
`;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const [darkMode, setDarkMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('govcare-theme');
    if (saved === 'light') setDarkMode(false);
    // Load saved email if remember me was checked previously
    if (localStorage.getItem('govcare-admin-rememberMe') === 'true') {
      const savedEmail = localStorage.getItem('govcare-admin-email');
      if (savedEmail) { setEmail(savedEmail); setRemember(true); }
    }
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('govcare-theme', next ? 'dark' : 'light');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Check admin role in Firestore
      const adminDoc = await getDoc(doc(db, 'admins', credential.user.uid));
      if (!adminDoc.exists()) {
        await auth.signOut();
        recaptchaRef.current?.reset();
        setCaptchaToken(null);
        setError('Access denied. This account does not have admin privileges.');
        setLoading(false);
        return;
      }
      if (remember) {
        localStorage.setItem('govcare-admin-rememberMe', 'true');
        localStorage.setItem('govcare-admin-email', email);
      } else {
        localStorage.removeItem('govcare-admin-rememberMe');
        localStorage.removeItem('govcare-admin-email');
      }
      setSuccess(true);
      setTimeout(() => navigate('/admin/dashboard'), 1000);
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    }
    setLoading(false);
  }

  return (
    <>
      <style>{css}</style>
      <div className={`admin-login-page${darkMode ? '' : ' light'}`}>

        {/* Left Panel */}
        <div className="admin-left-panel">
          <div className="left-brand">
            <div className="left-logo"><img src="/pictures/Malaysia.svg" alt="Jata Negara" /></div>
            <div>
              <span className="left-brand-name">GovCare+</span>
              <span className="left-brand-badge">Admin</span>
            </div>
          </div>

          <div className="left-hero">
            <h1>Government <span>Complaint</span> Management Portal</h1>
            <p>Centralized admin platform to manage, monitor and resolve citizen complaints routed across all Malaysian government ministries.</p>
          </div>

          <div className="left-stats">
            <div className="left-stat">
              <div className="left-stat-number">2,847</div>
              <div className="left-stat-label">Total Complaints</div>
              <div className="left-stat-trend">↑ +12% this month</div>
            </div>
            <div className="left-stat">
              <div className="left-stat-number">87.5%</div>
              <div className="left-stat-label">AI Accuracy</div>
              <div className="left-stat-trend">↑ BERT Model</div>
            </div>
            <div className="left-stat">
              <div className="left-stat-number">94%</div>
              <div className="left-stat-label">Resolution Rate</div>
              <div className="left-stat-trend">↑ +3% vs last month</div>
            </div>
          </div>

          <div className="left-security">
            <div className="left-security-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              TLS 1.3 Encrypted
            </div>
            <div className="left-security-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              PDPA 2010 Compliant
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="admin-right-panel">
          <div className="right-top-controls">
            <button className="ctrl-btn" onClick={toggleDark} title="Toggle theme">
              {darkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
          </div>

          <div className="right-form-wrap">
            <div className="right-header">
              <div className="admin-tag">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                ADMIN PORTAL
              </div>
              <h2>Sign in to Admin</h2>
              <p>Authorized personnel only. All access is logged and monitored.</p>
            </div>

            {error && (
              <div className="error-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
            {success && (
              <div className="success-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Login successful! Redirecting to dashboard...
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label>Admin Email</label>
                <input
                  className={`field-input${darkMode ? '' : ' light'}`}
                  type="email"
                  placeholder="admin@govcare.gov.my"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  required
                />
              </div>
              <div className="field-group">
                <label>Password</label>
                <div className="password-field">
                  <input
                    className={`field-input${darkMode ? '' : ' light'}`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="field-row">
                <label className="remember-wrap">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  <span>Remember Me</span>
                </label>
              </div>
              <div className="captcha-wrapper">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={token => setCaptchaToken(token)}
                  onExpired={() => setCaptchaToken(null)}
                  theme={darkMode ? 'dark' : 'light'}
                />
              </div>
              <button type="submit" className={`btn-admin-login${loading ? ' loading' : ''}`} disabled={loading || !captchaToken}>
                <span className="spinner"></span>
                <span className="btn-text" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Sign in to Admin Portal
                </span>
              </button>
            </form>

            <div className="divider"><hr /><span>OR</span><hr /></div>

            <Link to="/login" className="user-login-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Login as Citizen User instead
            </Link>

            <div className="right-footer">
              <p>© 2026 Government of Malaysia. Authorized access only.</p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
