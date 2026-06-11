import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import ReCAPTCHA from 'react-google-recaptcha';


const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const translations = {
  en: {
    welcomeBack: 'Welcome Back', loginToAccount: 'Login to your account',
    emailAddress: 'Email Address', password: 'Password',
    rememberMe: 'Remember me', forgotPassword: 'Forgot Password?',
    loginBtn: 'Login', or: 'OR', noAccount: "Don't have an account?",
    registerHere: 'Register here', copyright: '© 2026 Government of Malaysia',
    secured: 'SECURED', 
    invalidCredentialsFull: 'Invalid email or password. Please try again.',
    loginSuccess: 'Login successful! Redirecting...'
  },
  ms: {
    welcomeBack: 'Selamat Kembali', loginToAccount: 'Log masuk ke akaun anda',
    emailAddress: 'Alamat E-mel', password: 'Kata Laluan',
    rememberMe: 'Ingat saya', forgotPassword: 'Lupa Kata Laluan?',
    loginBtn: 'Log Masuk', or: 'ATAU', noAccount: 'Tiada akaun?',
    registerHere: 'Daftar di sini', copyright: '© 2026 Kerajaan Malaysia',
    secured: 'SELAMAT', protectedBy: 'Dilindungi oleh penyulitan TLS/SSL',
    invalidCredentialsFull: 'E-mel atau kata laluan tidak sah. Sila cuba lagi.',
    loginSuccess: 'Log masuk berjaya! Mengalihkan...'
  },
  zh: {
    welcomeBack: '欢迎回来', loginToAccount: '登录您的账户',
    emailAddress: '电子邮件地址', password: '密码',
    rememberMe: '记住我', forgotPassword: '忘记密码？',
    loginBtn: '登录', or: '或',noAccount: '没有账户？',
    registerHere: '在此注册', copyright: '© 2026 马来西亚政府',
    secured: '安全', protectedBy: '受 TLS/SSL 加密保护',
    invalidCredentialsFull: '电子邮件或密码无效。请重试。',
    loginSuccess: '登录成功！正在跳转...'
  },
  ta: {
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்', loginToAccount: 'உங்கள் கணக்கில் உள்நுழையுங்கள்',
    emailAddress: 'மின்னஞ்சல் முகவரி', password: 'கடவுச்சொல்',
    rememberMe: 'என்னை நினைவில் கொள்', forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?',
    loginBtn: 'உள்நுழை', or: 'அல்லது', noAccount: 'கணக்கு இல்லையா?',
    registerHere: 'இங்கே பதிவு செய்யுங்கள்', copyright: '© 2026 மலேசிய அரசாங்கம்',
    secured: 'பாதுகாப்பானது', protectedBy: 'TLS/SSL குறியாக்கத்தால் பாதுகாக்கப்பட்டது',
    invalidCredentialsFull: 'தவறான மின்னஞ்சல் அல்லது கடவுச்சொல். மீண்டும் முயற்சிக்கவும்.',
    loginSuccess: 'உள்நுழைவு வெற்றி! திசைதிருப்புகிறது...'
  }
};

const langMeta = {
  en: { flag: '🇬🇧', label: 'EN' },
  ms: { flag: '🇲🇾', label: 'BM' },
  zh: { flag: '🇨🇳', label: '中文' },
  ta: { flag: '🇮🇳', label: 'தமிழ்' }
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }

  .login-page {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #92b6f0 0%, #6b9ee8 100%);
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 40px 20px;
    -webkit-font-smoothing: antialiased;
  }
  .login-page.dark { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); }

  .login-container {
    background: #ffffff; border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    width: 100%; max-width: 460px; padding: 48px; position: relative;
  }
  .login-page.dark .login-container { background: #1e293b; border: 1px solid #334155; }

  .page-controls { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 8px; }

  .theme-toggle {
    width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e5e7eb;
    background: white; cursor: pointer; display: flex; align-items: center;
    justify-content: center; transition: all 0.2s; color: #4b5563;
  }
  .theme-toggle:hover { background: #f3f4f6; }
  .login-page.dark .theme-toggle { background: #334155; border-color: #475569; color: #f1f5f9; }
  .login-page.dark .theme-toggle:hover { background: #475569; }

  .language-wrapper { position: relative; }
  .language-toggle {
    display: flex; align-items: center; gap: 6px; padding: 8px 12px;
    background: white; border: 1px solid #e5e7eb; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; color: #4b5563;
  }
  .language-toggle:hover { background: #f3f4f6; }
  .login-page.dark .language-toggle { background: #334155; border-color: #475569; color: #f1f5f9; }
  .login-page.dark .language-toggle:hover { background: #475569; }

  .language-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0; background: white;
    border: 1px solid #e5e7eb; border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15); min-width: 160px;
    opacity: 0; visibility: hidden; transform: translateY(-10px);
    transition: all 0.2s; z-index: 1000;
  }
  .language-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }
  .login-page.dark .language-dropdown { background: #1e293b; border-color: #475569; }

  .language-option {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; cursor: pointer; font-size: 13px; color: #374151; transition: background 0.2s;
  }
  .language-option:first-child { border-radius: 10px 10px 0 0; }
  .language-option:last-child { border-radius: 0 0 10px 10px; }
  .language-option:hover { background: #f3f4f6; }
  .language-option.active { color: #090088; font-weight: 600; }
  .language-option .check { color: #090088; }
  .lang-info { display: flex; align-items: center; gap: 8px; }
  .login-page.dark .language-option { color: #e2e8f0; }
  .login-page.dark .language-option:hover { background: #334155; }

  .login-header { text-align: center; margin-bottom: 40px; }
  .logo-container {
    display: flex; align-items: center; justify-content: center;
    gap: 12px; margin-bottom: 32px; text-decoration: none;
  }
  .jata-negara-small { width: 48px; height: 48px; }
  .jata-negara-small img { width: 100%; height: 100%; object-fit: contain; }
  .brand-name-small { color: #090088; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .login-header h1 { color: #1a1a1a; font-size: 28px; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.5px; }
  .login-header p { color: #6b7280; font-size: 14px; }
  .login-page.dark .brand-name-small { color: #ffffff; }
  .login-page.dark .login-header h1 { color: #f1f5f9; }
  .login-page.dark .login-header p { color: #94a3b8; }

  .error-msg {
    background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
    padding: 12px 16px; border-radius: 8px; font-size: 13px;
    margin-bottom: 20px; display: none; align-items: center; gap: 8px;
  }
  .error-msg.show { display: flex; }
  .success-msg {
    background: #d1fae5; border: 1px solid #a7f3d0; color: #065f46;
    padding: 12px 16px; border-radius: 8px; font-size: 13px;
    margin-bottom: 20px; display: none; align-items: center; gap: 8px;
  }
  .success-msg.show { display: flex; }

  .form-group { margin-bottom: 24px; }
  .form-group label { display: block; color: #374151; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .login-page.dark .form-group label { color: #e2e8f0; }
  .form-group input {
    width: 100%; padding: 14px 16px; border: 1.5px solid #d1d5db;
    border-radius: 10px; font-size: 14px; background: #ffffff;
    transition: all 0.2s; font-family: inherit; color: #1a1a1a;
  }
  .form-group input:focus { outline: none; border-color: #090088; box-shadow: 0 0 0 3px rgba(9,0,136,0.1); }
  .login-page.dark .form-group input { background: #0f172a; border-color: #475569; color: #f1f5f9; }
  .login-page.dark .form-group input::placeholder { color: #64748b; }

  .password-wrapper { position: relative; }
  .eye-toggle {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; padding: 0;
    color: #9ca3af; display: flex; align-items: center; transition: color 0.2s;
  }
  .eye-toggle:hover { color: #4b5563; }
  .login-page.dark .eye-toggle { color: #64748b; }
  .login-page.dark .eye-toggle:hover { color: #94a3b8; }
  .password-wrapper input { padding-right: 44px; }

  .form-options { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
  .remember-me { display: flex; align-items: center; gap: 8px; }
  .remember-me input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: #090088; }
  .remember-me label { color: #4b5563; font-size: 13px; cursor: pointer; font-weight: 500; }
  .login-page.dark .remember-me label { color: #94a3b8; }
  .forgot-password { color: #090088; text-decoration: none; font-size: 13px; font-weight: 600; transition: color 0.2s; }
  .forgot-password:hover { color: #070066; text-decoration: underline; }
  .login-page.dark .forgot-password { color: #ffffff; }
  .login-page.dark .forgot-password:hover { color: #e2e8f0; }

  .btn-login-submit {
    width: 100%; padding: 14px; background: #090088; color: white;
    border: none; border-radius: 10px; font-size: 16px; font-weight: 600;
    cursor: pointer; transition: all 0.2s; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn-login-submit:hover:not(:disabled) { background: #070066; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(9,0,136,0.3); }
  .btn-login-submit:disabled { opacity: 0.7; cursor: not-allowed; }
  .login-page.dark .btn-login-submit { background: #4779c4; }
  .login-page.dark .btn-login-submit:hover:not(:disabled) { background: #3a6ab5; box-shadow: 0 8px 20px rgba(71,121,196,0.4); }

  .spinner {
    width: 18px; height: 18px; border: 2px solid #ffffff;
    border-top-color: transparent; border-radius: 50%;
    animation: spin 0.6s linear infinite; display: none;
  }
  .loading .spinner { display: block; }
  .loading .btn-text { display: none; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .divider { position: relative; text-align: center; margin: 32px 0; }
  .divider hr { border: none; border-top: 1px solid #e5e7eb; }
  .divider span {
    position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
    background: white; padding: 0 12px; color: #9ca3af; font-size: 12px; font-weight: 500;
  }
  .login-page.dark .divider hr { border-top-color: #334155; }
  .login-page.dark .divider span { background: #1e293b; color: #64748b; }

  .social-login { display: flex; flex-direction: column; gap: 12px; }
  .btn-google {
    width: 100%; padding: 12px; background: #ffffff; border: 1.5px solid #e5e7eb;
    border-radius: 10px; font-size: 14px; font-weight: 600; color: #374151;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    gap: 10px; transition: all 0.2s; font-family: inherit;
  }
  .btn-google:hover { background: #f9fafb; border-color: #d1d5db; }
  .login-page.dark .btn-google { background: #0f172a; border-color: #475569; color: #f1f5f9; }
  .btn-government {
    width: 100%; padding: 12px; background: #f8fafc; border: 1.5px solid #e5e7eb;
    border-radius: 10px; font-size: 14px; font-weight: 600; color: #9ca3af;
    cursor: not-allowed; display: flex; align-items: center; justify-content: center;
    gap: 10px; font-family: inherit;
  }
  .login-page.dark .btn-government { background: #0f172a; border-color: #475569; color: #94a3b8; }
  .coming-soon {
    font-size: 10px; background: #e5e7eb; padding: 2px 6px;
    border-radius: 4px; color: #6b7280;
  }

  .register-link { text-align: center; margin-top: 32px; font-size: 14px; color: #6b7280; }
  .register-link a { color: #090088; font-weight: 600; text-decoration: none; }
  .register-link a:hover { text-decoration: underline; }
  .login-page.dark .register-link { color: #94a3b8; }
  .login-page.dark .register-link a { color: #ffffff; }
  .login-page.dark .register-link a:hover { color: #e2e8f0; }

  .footer-note { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; }
  .footer-note p { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
  .security-note { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 11px; color: #6b7280; }
  .security-badge { background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 10px; }
  .login-page.dark .footer-note p, .login-page.dark .security-note span { color: #64748b; }

  .modal-input {
    width: 100%; padding: 12px 16px; border: 1.5px solid #d1d5db;
    border-radius: 10px; font-size: 14px; font-family: inherit;
    color: #1a1a1a; margin-bottom: 8px; transition: all 0.2s;
  }
  .modal-input:focus { outline: none; border-color: #090088; box-shadow: 0 0 0 3px rgba(9,0,136,0.1); }
  .login-page.dark .modal-input { background: #0f172a; border-color: #475569; color: #f1f5f9; }
  .login-page.dark .modal-input:focus { border-color: #4779c4; box-shadow: 0 0 0 3px rgba(71,121,196,0.2); }
  .modal-input::placeholder { color: #9ca3af; }
  .reset-error { color: #ef4444; font-size: 13px; margin-bottom: 16px; text-align: center; }
  .reset-success { text-align: center; padding: 8px 0; }
  .reset-success-icon { font-size: 48px; margin-bottom: 12px; }
  .reset-success-title { font-size: 18px; font-weight: 700; color: #10b981; margin-bottom: 8px; }
  .reset-success-text { font-size: 14px; color: #6b7280; line-height: 1.6; }
  .login-page.dark .reset-success-text { color: #94a3b8; }

  .captcha-wrapper { display: flex; justify-content: center; margin: 0 0 24px; }

  /* Custom Modal */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 9999; animation: fadeIn 0.2s;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-box {
    background: #ffffff; border-radius: 16px; padding: 32px;
    max-width: 400px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: slideUp 0.2s;
  }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .login-page.dark .modal-box { background: #1e293b; border: 1px solid #334155; }
  .modal-icon { font-size: 40px; text-align: center; margin-bottom: 16px; }
  .modal-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; text-align: center; }
  .login-page.dark .modal-title { color: #f1f5f9; }
  .modal-message { font-size: 14px; color: #6b7280; text-align: center; line-height: 1.6; margin-bottom: 24px; }
  .login-page.dark .modal-message { color: #94a3b8; }
  .modal-btn {
    width: 100%; padding: 12px; background: #090088; color: white;
    border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: all 0.2s;
  }
  .modal-btn:hover { background: #070066; }
  .login-page.dark .modal-btn { background: #4779c4; }
  .login-page.dark .modal-btn:hover { background: #3a6ab5; }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [modal, setModal] = useState(null);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const dropdownRef = useRef(null);
  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const t = translations[language];

  function showModal(icon, title, message) {
    setModal({ icon, title, message });
  }

  function openForgotPassword() {
    setResetEmail(email); // pre-fill with whatever is in the email field
    setResetSent(false);
    setResetError('');
    setModal('forgot');
  }

  async function handlePasswordReset(e) {
    e.preventDefault();
    setResetError('');
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSent(true);
    } catch (err) {
      switch (err.code) {
        case 'auth/user-not-found':
          setResetError('No account found with this email address.'); break;
        case 'auth/invalid-email':
          setResetError('Please enter a valid email address.'); break;
        case 'auth/too-many-requests':
          setResetError('Too many attempts. Please try again later.'); break;
        default:
          setResetError('Failed to send reset email. Please try again.');
      }
    }
    setResetLoading(false);
  }

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    const savedLang = localStorage.getItem('govcare-language') || 'en';
    setLanguage(savedLang);
    if (localStorage.getItem('rememberMe') === 'true') {
      const savedEmail = localStorage.getItem('userEmail');
      if (savedEmail) { setEmail(savedEmail); setRemember(true); }
    }
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  function changeLanguage(lang) {
    setLanguage(lang);
    setDropdownOpen(false);
    localStorage.setItem('govcare-language', lang);
  }

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('govcare-theme', next ? 'dark' : 'light');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess(false);
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification before logging in.');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      setSuccess(true);
      if (remember) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('userEmail', email);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('userEmail');
      }
      localStorage.setItem('govcare-user', JSON.stringify({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
      }));
      await new Promise(r => setTimeout(r, 1000));
      navigate('/dashboard');
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError(t.invalidCredentialsFull); break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.'); break;
        case 'auth/user-disabled':
          setError('This account has been disabled. Please contact support.'); break;
        default:
          setError(t.invalidCredentialsFull);
      }
    }
    setLoading(false);
  }

  const meta = langMeta[language];

  return (
    <>
      <style>{css}</style>
      <div className={`login-page${darkMode ? ' dark' : ''}`}>
        <div className="login-container">

          {/* Controls */}
          <div className="page-controls">
            <button className="theme-toggle" onClick={toggleDark} title="Toggle dark mode">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </button>
            <div className="language-wrapper" ref={dropdownRef}>
              <div className="language-toggle" onClick={() => setDropdownOpen(!dropdownOpen)}>
                <span>{meta.flag}</span><span>{meta.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div className={`language-dropdown${dropdownOpen ? ' active' : ''}`}>
                {Object.entries(langMeta).map(([code, { flag, label }]) => (
                  <div key={code} className={`language-option${language === code ? ' active' : ''}`} onClick={() => changeLanguage(code)}>
                    <span className="lang-info"><span>{flag}</span> {label === 'EN' ? 'English' : label === 'BM' ? 'Bahasa Melayu' : label}</span>
                    {language === code && <svg className="check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="login-header">
            <a href="/" className="logo-container">
              <div className="jata-negara-small"><img src="/pictures/Malaysia.svg" alt="Jata Negara" /></div>
              <div className="brand-name-small">GovCare+</div>
            </a>
            <h1>{t.welcomeBack}</h1>
            <p>{t.loginToAccount}</p>
          </div>

          {/* Messages */}
          <div className={`error-msg${error ? ' show' : ''}`}><span>⚠</span><span>{error}</span></div>
          <div className={`success-msg${success ? ' show' : ''}`}><span>✓</span><span>{t.loginSuccess}</span></div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t.emailAddress}</label>
              <input type="email" placeholder="user@example.com" value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }} required />
            </div>
            <div className="form-group">
              <label>{t.password}</label>
              <div className="password-wrapper">
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }} required />
                <button type="button" className="eye-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="form-options">
              <div className="remember-me">
                <input type="checkbox" id="remember" checked={remember} onChange={e => setRemember(e.target.checked)} />
                <label htmlFor="remember">{t.rememberMe}</label>
              </div>
              <a href="#" className="forgot-password" onClick={e => { e.preventDefault(); openForgotPassword(); }}>{t.forgotPassword}</a>
            </div>
            <div className="captcha-wrapper">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={token => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
            <button type="submit" className={`btn-login-submit${loading ? ' loading' : ''}`} disabled={loading || !captchaToken}>
              <span className="spinner"></span>
              <span className="btn-text">{t.loginBtn}</span>
            </button>

            <div className="register-link">
              <span>{t.noAccount}</span> <a href="/register">{t.registerHere}</a>
            </div>
          </form>

          <div className="footer-note">
            <p>{t.copyright}</p>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {modal === 'forgot' && (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              {!resetSent ? (
                <>
                  <div className="modal-title">Forgot Password?</div>
                  <div className="modal-message">Enter your email address and we'll send you a link to reset your password.</div>
                  <form onSubmit={handlePasswordReset}>
                    <input
                      className="modal-input"
                      type="email"
                      placeholder="Enter your email address"
                      value={resetEmail}
                      onChange={e => { setResetEmail(e.target.value); setResetError(''); }}
                      required
                    />
                    {resetError && <div className="reset-error">⚠ {resetError}</div>}
                    <button className="modal-btn" type="submit" disabled={resetLoading} style={{marginBottom:'8px'}}>
                      {resetLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                  <button onClick={() => setModal(null)} style={{width:'100%',padding:'10px',background:'transparent',border:'1px solid #e5e7eb',borderRadius:'10px',cursor:'pointer',fontSize:'14px',color:'#6b7280',fontFamily:'inherit',marginTop:'4px'}}>
                    Cancel
                  </button>
                </>
              ) : (
                <div className="reset-success">
                  <div className="reset-success-icon">✉️</div>
                  <div className="reset-success-title">Email Sent!</div>
                  <div className="reset-success-text">
                    A password reset link has been sent to <strong>{resetEmail}</strong>. Please check your inbox and follow the instructions.
                  </div>
                  <button className="modal-btn" onClick={() => setModal(null)} style={{marginTop:'24px'}}>Done</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generic Modal */}
        {modal && modal !== 'forgot' && (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-icon">{modal.icon}</div>
              <div className="modal-title">{modal.title}</div>
              <div className="modal-message">{modal.message}</div>
              <button className="modal-btn" onClick={() => setModal(null)}>OK</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
