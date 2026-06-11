import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut, updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, doc, getDoc, setDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { encryptFields, decryptFields } from '../crypto';

const translations = {
  en: { personalInfo:'Personal Information', security:'Security', notifications:'Notifications', activityLog:'Activity Log', accountInfo:'Account Information', fullName:'Full Name', emailAddress:'Email Address', locked:'LOCKED', emailLocked:'Email cannot be changed for security reasons', phoneNumber:'Phone Number', icNumber:'Malaysian IC Number', icLocked:'IC number is locked for account integrity', regDate:'Registration Date', accountStatus:'Account Status', cancel:'Cancel', saveChanges:'Save Changes', changePassword:'Change Password', currentPassword:'Current Password', newPassword:'New Password', confirmPassword:'Confirm New Password', passwordReq:'Password Requirements', updatePassword:'Update Password', menu:'Menu', home:'Home', submitComplaint:'Submit Complaint', trackStatus:'Track Status', profile:'Profile', support:'Support', helpCenter:'Help Center', logout:'Logout', active:'Active', verified:'Verified' },
  ms: { personalInfo:'Maklumat Peribadi', security:'Keselamatan', notifications:'Pemberitahuan', activityLog:'Log Aktiviti', accountInfo:'Maklumat Akaun', fullName:'Nama Penuh', emailAddress:'Alamat E-mel', locked:'DIKUNCI', emailLocked:'E-mel tidak boleh diubah atas sebab keselamatan', phoneNumber:'Nombor Telefon', icNumber:'Nombor IC Malaysia', icLocked:'Nombor IC dikunci untuk integriti akaun', regDate:'Tarikh Pendaftaran', accountStatus:'Status Akaun', cancel:'Batal', saveChanges:'Simpan Perubahan', changePassword:'Tukar Kata Laluan', currentPassword:'Kata Laluan Semasa', newPassword:'Kata Laluan Baru', confirmPassword:'Sahkan Kata Laluan Baru', passwordReq:'Keperluan Kata Laluan', updatePassword:'Kemaskini Kata Laluan', menu:'Menu', home:'Utama', submitComplaint:'Hantar Aduan', trackStatus:'Jejak Status', profile:'Profil', support:'Sokongan', helpCenter:'Pusat Bantuan', logout:'Log Keluar', active:'Aktif', verified:'Disahkan' },
  zh: { personalInfo:'个人信息', security:'安全', notifications:'通知', activityLog:'活动日志', accountInfo:'账户信息', fullName:'全名', emailAddress:'电子邮件', locked:'已锁定', emailLocked:'出于安全原因，电子邮件无法更改', phoneNumber:'电话号码', icNumber:'马来西亚身份证号码', icLocked:'身份证号码已锁定以保护账户', regDate:'注册日期', accountStatus:'账户状态', cancel:'取消', saveChanges:'保存更改', changePassword:'更改密码', currentPassword:'当前密码', newPassword:'新密码', confirmPassword:'确认新密码', passwordReq:'密码要求', updatePassword:'更新密码', menu:'菜单', home:'首页', submitComplaint:'提交投诉', trackStatus:'跟踪状态', profile:'个人资料', support:'支持', helpCenter:'帮助中心', logout:'登出', active:'活跃', verified:'已验证' },
  ta: { personalInfo:'தனிப்பட்ட தகவல்', security:'பாதுகாப்பு', notifications:'அறிவிப்புகள்', activityLog:'செயல்பாட்டு பதிவு', accountInfo:'கணக்கு தகவல்', fullName:'முழு பெயர்', emailAddress:'மின்னஞ்சல்', locked:'பூட்டப்பட்டது', emailLocked:'பாதுகாப்பு காரணங்களுக்காக மின்னஞ்சலை மாற்ற முடியாது', phoneNumber:'தொலைபேசி எண்', icNumber:'மலேசிய அடையாள அட்டை எண்', icLocked:'கணக்கு ஒருமைப்பாட்டிற்காக அடையாள அட்டை எண் பூட்டப்பட்டுள்ளது', regDate:'பதிவு தேதி', accountStatus:'கணக்கு நிலை', cancel:'ரத்து', saveChanges:'மாற்றங்களைச் சேமி', changePassword:'கடவுச்சொல்லை மாற்று', currentPassword:'தற்போதைய கடவுச்சொல்', newPassword:'புதிய கடவுச்சொல்', confirmPassword:'புதிய கடவுச்சொல்லை உறுதிப்படுத்து', passwordReq:'கடவுச்சொல் தேவைகள்', updatePassword:'கடவுச்சொல்லை புதுப்பி', menu:'மெனு', home:'முகப்பு', submitComplaint:'புகார் சமர்ப்பி', trackStatus:'நிலையை கண்காணி', profile:'சுயவிவரம்', support:'ஆதரவு', helpCenter:'உதவி மையம்', logout:'வெளியேறு', active:'செயலில்', verified:'சரிபார்க்கப்பட்டது' }
};
const langMeta = { en:{flag:'🇬🇧',label:'EN'}, ms:{flag:'🇲🇾',label:'BM'}, zh:{flag:'🇨🇳',label:'中文'}, ta:{flag:'🇮🇳',label:'தமிழ்'} };

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html, body { margin:0; padding:0; }
.profile-page { font-family:'Inter',sans-serif; background:#f9fafb; min-height:100vh; width:100%; color:#1a1a1a; }
.profile-page.dark { background:#0f172a; color:#e2e8f0; }
.top-nav { background:#fff; height:70px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; justify-content:space-between; padding:0 40px; position:sticky; top:0; z-index:100; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.profile-page.dark .top-nav { background:#1e293b; border-color:#334155; }
.logo-container { display:flex; align-items:center; gap:12px; text-decoration:none; }
.jata-negara { width:36px; height:36px; } .jata-negara img { width:100%; height:100%; object-fit:contain; }
.brand-name { color:#090088; font-size:20px; font-weight:700; }
.profile-page.dark .brand-name { color:#ffffff; }
.nav-right { display:flex; align-items:center; gap:16px; }
.theme-toggle { display:flex; align-items:center; justify-content:center; width:40px; height:40px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:all 0.2s; color:#374151; }
.theme-toggle:hover { background:#e5e7eb; }
.profile-page.dark .theme-toggle { background:#334155; border-color:#475569; color:#fbbf24; }
.lang-wrapper { position:relative; }
.lang-btn { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#374151; }
.lang-btn:hover { background:#e5e7eb; }
.profile-page.dark .lang-btn { background:#334155; border-color:#475569; color:#e2e8f0; }
.lang-dropdown { position:absolute; top:calc(100% + 8px); right:0; width:180px; background:white; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.15); border:1px solid #e5e7eb; z-index:1000; overflow:hidden; opacity:0; visibility:hidden; transform:translateY(-8px); transition:all 0.2s; }
.lang-dropdown.open { opacity:1; visibility:visible; transform:translateY(0); }
.profile-page.dark .lang-dropdown { background:#1e293b; border-color:#334155; }
.lang-option { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; font-size:14px; color:#374151; transition:background 0.2s; }
.lang-option:hover { background:#f3f4f6; } .lang-option.active { background:#ede9fe; color:#090088; font-weight:600; }
.profile-page.dark .lang-option { color:#e2e8f0; } .profile-page.dark .lang-option:hover { background:#334155; } .profile-page.dark .lang-option.active { background:#312e81; color:#a5b4fc; }
.back-link { display:flex; align-items:center; gap:8px; color:#6b7280; text-decoration:none; font-size:14px; font-weight:500; padding:8px 12px; border-radius:8px; transition:all 0.2s; }
.back-link:hover { color:#090088; background:#f3f4f6; }
.profile-page.dark .back-link { color:#94a3b8; } .profile-page.dark .back-link:hover { color:#818cf8; background:#334155; }
.container { max-width:1000px; margin:0 auto; padding:40px 24px; }
.profile-card { background:white; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1); overflow:hidden; margin-bottom:24px; }
.profile-page.dark .profile-card { background:#1e293b; }
.profile-banner { height:140px; background:linear-gradient(135deg,#92b6f0 0%,#1976d2 100%); }
.profile-page.dark .profile-banner { background:linear-gradient(135deg,#1e3a5f 0%,#312e81 100%); }
.profile-info-section { padding:0 40px 32px; position:relative; }
.profile-avatar-wrapper { position:absolute; top:-50px; left:40px; }
.profile-avatar { width:100px; height:100px; border-radius:50%; background:white; display:flex; align-items:center; justify-content:center; font-size:36px; font-weight:700; color:#090088; border:4px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.15); position:relative; }
.avatar-badge { position:absolute; bottom:4px; right:4px; width:28px; height:28px; background:#10b981; border:3px solid white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; }
.profile-header-content { margin-left:140px; padding-top:24px; }
.profile-name { font-size:24px; font-weight:700; color:#1a1a1a; margin-bottom:6px; }
.profile-page.dark .profile-name { color:#f1f5f9; }
.profile-email-text { color:#6b7280; font-size:14px; margin-bottom:16px; }
.profile-page.dark .profile-email-text { color:#94a3b8; }
.profile-stats { display:flex; gap:32px; }
.stat-item { display:flex; align-items:center; gap:8px; font-size:13px; color:#6b7280; }
.profile-page.dark .stat-item { color:#94a3b8; }
.tabs-container { background:white; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1); overflow:hidden; }
.profile-page.dark .tabs-container { background:#1e293b; }
.tabs-nav { display:flex; border-bottom:1px solid #e5e7eb; padding:0 24px; }
.profile-page.dark .tabs-nav { border-color:#334155; }
.tab-btn { padding:16px 24px; background:none; border:none; font-size:14px; font-weight:600; color:#6b7280; cursor:pointer; position:relative; transition:color 0.2s; font-family:inherit; }
.tab-btn:hover { color:#1a1a1a; }
.tab-btn.active { color:#090088; }
.profile-page.dark .tab-btn { color:#94a3b8; } .profile-page.dark .tab-btn.active { color:#818cf8; }
.tab-btn.active::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px; background:#090088; }
.profile-page.dark .tab-btn.active::after { background:#818cf8; }
.tab-content { padding:32px; }
.section-title { font-size:16px; font-weight:700; color:#1a1a1a; margin-bottom:20px; padding-bottom:12px; border-bottom:1px solid #e5e7eb; }
.profile-page.dark .section-title { color:#f1f5f9; border-color:#334155; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; }
.form-field label { display:flex; align-items:center; gap:6px; color:#374151; font-size:13px; font-weight:600; margin-bottom:8px; }
.profile-page.dark .form-field label { color:#e2e8f0; }
.lock-badge { font-size:11px; padding:2px 6px; background:#f3f4f6; color:#6b7280; border-radius:4px; font-weight:600; }
.form-field input { width:100%; padding:12px 14px; border:1.5px solid #d1d5db; border-radius:8px; font-size:14px; transition:all 0.2s; font-family:inherit; background:white; color:#1a1a1a; }
.form-field input:focus { outline:none; border-color:#090088; box-shadow:0 0 0 3px rgba(9,0,136,0.1); }
.form-field input:disabled { background:#f9fafb; color:#9ca3af; cursor:not-allowed; }
.profile-page.dark .form-field input { background:#334155; border-color:#475569; color:#f1f5f9; }
.profile-page.dark .form-field input:disabled { background:#1e293b; color:#64748b; }
.helper-text { font-size:12px; color:#6b7280; margin-top:4px; }
.button-group { display:flex; gap:12px; margin-top:24px; justify-content:flex-end; }
.btn { padding:12px 24px; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:inherit; border:none; }
.btn-primary { background:#090088; color:white; }
.btn-primary:hover { background:#070066; transform:translateY(-1px); box-shadow:0 4px 12px rgba(9,0,136,0.3); }
.btn-secondary { background:#f3f4f6; color:#6b7280; }
.btn-secondary:hover { background:#e5e7eb; }
.profile-page.dark .btn-primary { background:#4779c4; color:white; }
.profile-page.dark .btn-primary:hover { background:#3a6ab0; }
.profile-page.dark .btn-secondary { background:#334155; color:#e2e8f0; }
.requirements-box { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:16px; margin-top:16px; }
.requirements-title { font-size:13px; font-weight:600; color:#0369a1; margin-bottom:12px; }
.req-item { font-size:12px; color:#0c4a6e; padding:4px 0; display:flex; align-items:center; gap:8px; }
.req-item::before { content:"○"; color:#94a3b8; }
.req-item.met::before { content:"✓"; color:#10b981; font-weight:bold; }
.notif-item-row { display:flex; align-items:center; justify-content:space-between; padding:20px; background:#f9fafb; border-radius:10px; margin-bottom:12px; border:1px solid #e5e7eb; }
.profile-page.dark .notif-item-row { background:#0f172a; border-color:#334155; }
.notif-item-left { display:flex; align-items:center; gap:16px; }
.notif-icon-box { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; }
.notif-icon-box.email { background:#dbeafe; } .notif-icon-box.sms { background:#d1fae5; } .notif-icon-box.app { background:#fef3c7; }
.notif-text h4 { font-size:14px; font-weight:600; color:#1a1a1a; margin-bottom:2px; }
.profile-page.dark .notif-text h4 { color:#f1f5f9; }
.notif-text p { font-size:12px; color:#6b7280; }
.toggle-switch { position:relative; width:48px; height:26px; cursor:pointer; }
.toggle-switch input { opacity:0; width:0; height:0; position:absolute; }
.toggle-slider { position:absolute; top:0; left:0; right:0; bottom:0; background:#d1d5db; transition:0.3s; border-radius:26px; cursor:pointer; }
.toggle-slider::before { position:absolute; content:""; height:18px; width:18px; left:4px; bottom:4px; background:white; transition:0.3s; border-radius:50%; }
.toggle-switch input:checked + .toggle-slider { background:#10b981; }
.toggle-switch input:checked + .toggle-slider::before { transform:translateX(22px); }
.timeline { position:relative; padding-left:40px; }
.timeline::before { content:''; position:absolute; left:16px; top:8px; bottom:8px; width:2px; background:#e5e7eb; }
.profile-page.dark .timeline::before { background:#334155; }
.timeline-item { position:relative; margin-bottom:24px; }
.timeline-dot { position:absolute; left:-28px; top:4px; width:12px; height:12px; border-radius:50%; background:#10b981; border:3px solid white; box-shadow:0 0 0 2px #e5e7eb; }
.timeline-content { background:#f9fafb; padding:16px; border-radius:10px; border:1px solid #e5e7eb; }
.profile-page.dark .timeline-content { background:#0f172a; border-color:#334155; }
.timeline-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px; }
.timeline-title { font-size:14px; font-weight:600; color:#1a1a1a; }
.profile-page.dark .timeline-title { color:#f1f5f9; }
.timeline-time { font-size:12px; color:#6b7280; }
.timeline-meta { display:flex; gap:16px; font-size:12px; color:#6b7280; }
.timeline-meta-item { display:flex; align-items:center; gap:4px; }
.success-toast { position:fixed; bottom:24px; right:24px; color:white; padding:12px 20px; border-radius:10px; font-weight:600; font-size:14px; z-index:9999; animation:slideIn 0.3s ease; }
.success-toast.success { background:#10b981; }
.success-toast.error { background:#ef4444; }
@keyframes slideIn { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
.skeleton { border-radius:6px; animation:shimmer 1.4s infinite; }
.profile-page.dark .skeleton { background:linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%); background-size:400px 100%; }
.skeleton:not(.profile-page.dark *) { background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%); background-size:400px 100%; }
.log-event-badge { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:3px 8px; border-radius:20px; }
.log-event-badge.login { background:#dbeafe; color:#1d4ed8; }
.log-event-badge.password { background:#fef3c7; color:#b45309; }
.log-event-badge.profile { background:#d1fae5; color:#065f46; }
.log-empty { text-align:center; padding:40px; color:#9ca3af; font-size:14px; }
.pass-field { position:relative; }
.pass-field input { padding-right:44px; width:100%; box-sizing:border-box; }
.eye-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:#6b7280; padding:4px; display:flex; align-items:center; }
.eye-btn:hover { color:#374151; }
.profile-page.dark .eye-btn { color:#94a3b8; }
.profile-page.dark .eye-btn:hover { color:#e2e8f0; }
.pass-field input::-ms-reveal { display:none; }
.pass-field input::-ms-clear { display:none; }
.pass-field input::-webkit-contacts-auto-fill-button { display:none; }
.pass-field input::-webkit-credentials-auto-fill-button { display:none; }
.profile-page.dark .helper-text { color:#64748b; }
.profile-page.dark .lock-badge { background:#334155; color:#94a3b8; }
.profile-page.dark .back-link:hover { color:#cbd5e1; background:#334155; }
.profile-page.dark .tab-btn.active { color:#4779c4; }
.profile-page.dark .tab-btn.active::after { background:#4779c4; }
.profile-page.dark .tab-btn:hover { color:#cbd5e1; }
.profile-page.dark .requirements-box { background:#0f2a47; border-color:#1d4ed8; }
.profile-page.dark .requirements-title { color:#93c5fd; }
.profile-page.dark .req-item { color:#93c5fd; }
.profile-page.dark .notif-text p { color:#64748b; }
.profile-page.dark .timeline-time { color:#64748b; }
.profile-page.dark .timeline-meta { color:#64748b; }
.profile-page.dark .form-field input::placeholder { color:#64748b; }
.profile-page.dark .timeline-dot { border-color:#1e293b; box-shadow:0 0 0 2px #334155; }
`;

// ── Detect real browser + OS from User-Agent ─────────────────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Browser
  if (ua.includes('Edg/'))        browser = 'Microsoft Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

  // OS
  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Mac OS X')) {
    const m = ua.match(/Mac OS X ([\d_]+)/);
    os = m ? `macOS ${m[1].replace(/_/g,'.')}` : 'macOS';
  }
  else if (ua.includes('Android')) {
    const m = ua.match(/Android ([\d.]+)/);
    os = m ? `Android ${m[1]}` : 'Android';
  }
  else if (ua.includes('iPhone') || ua.includes('iPad')) {
    const m = ua.match(/OS ([\d_]+)/);
    os = m ? `iOS ${m[1].replace(/_/g,'.')}` : 'iOS';
  }
  else if (ua.includes('Linux')) os = 'Linux';

  // Device type
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const deviceType = isMobile ? '📱' : '💻';

  return { browser, os, device: `${browser} on ${os}`, deviceType };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');

  // Profile fields
  const [currentUser, setCurrentUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Notification prefs
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifApp, setNotifApp] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  // Activity log
  const [activityLog, setActivityLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);

  const langRef = useRef(null);
  const t = translations[language];
  const meta = langMeta[language];

  const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const createdAt = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
    : 'N/A';

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    setLanguage(localStorage.getItem('govcare-language') || 'en');

    // Listen to auth state, then load Firestore user profile
    const unsubAuth = onAuthStateChanged(auth, async user => {
      if (!user) { navigate('/login'); return; }
      setCurrentUser(user);
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');

      // Load profile from Firestore and decrypt client-side
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = await decryptFields(snap.data(), ['fullName', 'email', 'phone', 'icNumber']);
          setPhone(data.phone     || '');
          setIcNumber(data.icNumber || '');
          setNotifEmail(data.notifEmail ?? true);
          setNotifSms(data.notifSms   ?? true);
          setNotifApp(data.notifApp   ?? true);
        } else {
          // First login — create encrypted profile
          const encrypted = await encryptFields(
            { fullName: user.displayName || '', email: user.email || '', phone: '', icNumber: '' },
            ['fullName', 'email', 'phone', 'icNumber'],
          );
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid, ...encrypted,
            notifEmail: true, notifSms: true, notifApp: true,
            createdAt: new Date().toISOString(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (e) { console.error('Error loading profile:', e); }
      setLoading(false);

      // Log login event only ONCE per browser session
      const sessionKey = `govcare-logged-${user.uid}`;
      if (!sessionStorage.getItem(sessionKey)) {
        try {
          const { device } = getDeviceInfo();
          await addDoc(collection(db, 'activityLogs'), {
            userId: user.uid,
            event: 'Successful Login',
            device,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString(),
          });
          sessionStorage.setItem(sessionKey, '1');
        } catch (e) { /* ignore logging errors */ }
      }
    });

    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const bg = darkMode ? '#0f172a' : '#f9fafb';
    document.body.style.background = bg;
    document.documentElement.style.background = bg;
    return () => {
      document.body.style.background = '';
      document.documentElement.style.background = '';
    };
  }, [darkMode]);

  useEffect(() => {
    const handler = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Load activity log when tab is opened
  useEffect(() => {
    if (activeTab !== 'activity' || !currentUser) return;
    setLoadingLog(true);
    const q = query(
      collection(db, 'activityLogs'),
      where('userId', '==', currentUser.uid)
    );
    getDocs(q).then(snap => {
      const logs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aT = a.timestamp?.toMillis?.() || new Date(a.createdAt || 0).getTime();
          const bT = b.timestamp?.toMillis?.() || new Date(b.createdAt || 0).getTime();
          return bT - aT; // newest first
        });
      setActivityLog(logs);
      setLoadingLog(false);
    }).catch(() => setLoadingLog(false));
  }, [activeTab, currentUser]);

  function toggleDark() { const next = !darkMode; setDarkMode(next); localStorage.setItem('govcare-theme', next ? 'dark' : 'light'); }
  function changeLang(lang) { setLanguage(lang); setLangOpen(false); localStorage.setItem('govcare-language', lang); }

  function showToast(msg, type = 'success') {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }

  async function handleLogout() {
    await signOut(auth); localStorage.removeItem('govcare-user'); navigate('/');
  }

  // ── Save personal info to Firebase Auth + Firestore ──────────────────────
  async function handleSaveProfile() {
    if (!currentUser) return;
    setSaving(true);
    try {
      // Update displayName in Firebase Auth
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }
      // Encrypt and save to Firestore
      const encrypted = await encryptFields(
        { fullName: displayName, email, phone, icNumber },
        ['fullName', 'email', 'phone', 'icNumber'],
      );
      await setDoc(doc(db, 'users', currentUser.uid), {
        uid: currentUser.uid, ...encrypted,
        notifEmail, notifSms, notifApp,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Log profile update
      const { device } = getDeviceInfo();
      await addDoc(collection(db, 'activityLogs'), {
        userId: currentUser.uid,
        event: 'Profile Updated',
        device,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });

      showToast('Profile saved successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile. Please try again.', 'error');
    }
    setSaving(false);
  }

  // ── Update password via Firebase Auth ─────────────────────────────────────
  async function handleUpdatePassword(e) {
    e.preventDefault(); setPassError('');
    if (newPass !== confirmPass) { setPassError('Passwords do not match'); return; }
    if (newPass.length < 8) { setPassError('Password must be at least 8 characters'); return; }
    setPassLoading(true);
    try {
      const credential = EmailAuthProvider.credential(email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPass);

      setCurrentPass(''); setNewPass(''); setConfirmPass('');

      // Log password change
      const { device } = getDeviceInfo();
      await addDoc(collection(db, 'activityLogs'), {
        userId: currentUser.uid,
        event: 'Password Changed',
        device,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });

      showToast('Password updated successfully!');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        setPassError('Current password is incorrect');
      else setPassError('Failed to update password. Please try again.');
    }
    setPassLoading(false);
  }

  // ── Save notification preferences to Firestore ───────────────────────────
  async function handleSaveNotifications() {
    if (!currentUser) return;
    setSavingNotif(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        notifEmail, notifSms, notifApp,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      showToast('Notification preferences saved!');
    } catch {
      showToast('Failed to save preferences.', 'error');
    }
    setSavingNotif(false);
  }

  // ── Format timestamp from Firestore ──────────────────────────────────────
  function formatLogTime(item) {
    if (!item.timestamp?.toDate) return item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently';
    const d = item.timestamp.toDate();
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    if (diffDay === 1) return 'Yesterday at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' at ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  const passReqs = [
    { id: 'len', label: 'At least 8 characters', met: newPass.length >= 8 },
    { id: 'mix', label: 'Contains letters and numbers', met: /[a-zA-Z]/.test(newPass) && /\d/.test(newPass) },
    { id: 'special', label: 'Contains special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(newPass) },
  ];

  return (
    <>
      <style>{css}</style>
      <div className={`profile-page${darkMode ? ' dark' : ''}`}>
        {toast && <div className={`success-toast ${toastType}`}>{toast}</div>}

        {/* Top Nav */}
        <div className="top-nav">
          <Link to="/dashboard" className="logo-container">
            <div className="jata-negara"><img src="/pictures/Malaysia.svg" alt="Jata Negara" /></div>
            <div className="brand-name">GovCare+</div>
          </Link>
          <div className="nav-right">
            <button className="theme-toggle" onClick={toggleDark}>
              {darkMode ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>
            <div className="lang-wrapper" ref={langRef}>
              <div className="lang-btn" onClick={() => setLangOpen(!langOpen)}>
                <span>{meta.flag}</span><span>{meta.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div className={`lang-dropdown${langOpen ? ' open' : ''}`}>
                {Object.entries(langMeta).map(([code, { flag, label }]) => (
                  <div key={code} className={`lang-option${language === code ? ' active' : ''}`} onClick={() => changeLang(code)}>
                    <span>{flag}</span><span>{label === 'EN' ? 'English' : label === 'BM' ? 'Bahasa Melayu' : label}</span>
                    {language === code && <svg style={{marginLeft:'auto'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                ))}
              </div>
            </div>
            <Link to="/dashboard" className="back-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="container">
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-banner"></div>
            <div className="profile-info-section">
              <div className="profile-avatar-wrapper">
                <div className="profile-avatar">
                  {initials}
                  <div className="avatar-badge">✓</div>
                </div>
              </div>
              <div className="profile-header-content">
                <div className="profile-name">{displayName}</div>
                <div className="profile-email-text">{email}</div>
                <div className="profile-stats">
                  <div className="stat-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/><path d="M3 3l18 18"/></svg>
                    {t.active}
                  </div>
                  <div className="stat-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    {t.verified}
                  </div>
                  <div className="stat-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Joined {createdAt}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs-nav">
              {[['personal', t.personalInfo], ['security', t.security], ['notifications', t.notifications], ['activity', t.activityLog]].map(([id, label]) => (
                <button key={id} className={`tab-btn${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
              ))}
            </div>

            {/* Personal Info */}
            {activeTab === 'personal' && (
              <div className="tab-content">
                <div className="section-title">{t.accountInfo}</div>
                {loading ? (
                  <div style={{display:'grid', gap:16}}>
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:48, borderRadius:8}} />)}
                  </div>
                ) : (
                  <>
                    <div className="form-row">
                      <div className="form-field">
                        <label>{t.fullName}</label>
                        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your full name" />
                      </div>
                      <div className="form-field">
                        <label>{t.emailAddress} <span className="lock-badge">{t.locked}</span></label>
                        <input type="email" value={email} disabled />
                        <div className="helper-text">{t.emailLocked}</div>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-field">
                        <label>{t.phoneNumber}</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+601X-XXXXXXX" />
                      </div>
                      <div className="form-field">
                        <label>{t.icNumber} <span className="lock-badge">{t.locked}</span></label>
                        <input type="text" value={icNumber} disabled placeholder="XXXXXX-XX-XXXX" />
                        <div className="helper-text">{t.icLocked}</div>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-field">
                        <label>{t.regDate}</label>
                        <input type="text" value={createdAt} disabled />
                      </div>
                      <div className="form-field">
                        <label>{t.accountStatus}</label>
                        <input type="text" value="Active ✓" disabled style={{color:'#10b981'}} />
                      </div>
                    </div>
                    <div className="button-group">
                      <button className="btn btn-secondary" onClick={() => { setDisplayName(currentUser?.displayName || ''); }}>{t.cancel}</button>
                      <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                        {saving ? 'Saving…' : t.saveChanges}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="tab-content">
                <div className="section-title">{t.changePassword}</div>
                <form onSubmit={handleUpdatePassword}>
                  <div className="form-row">
                    <div className="form-field">
                      <label>{t.currentPassword}</label>
                      <div className="pass-field">
                        <input type={showCurrentPass ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="••••••••" required />
                        <button type="button" className="eye-btn" onClick={() => setShowCurrentPass(p => !p)}>
                          {showCurrentPass
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>{t.newPassword}</label>
                      <div className="pass-field">
                        <input type={showNewPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" required />
                        <button type="button" className="eye-btn" onClick={() => setShowNewPass(p => !p)}>
                          {showNewPass
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                    <div className="form-field">
                      <label>{t.confirmPassword}</label>
                      <div className="pass-field">
                        <input type={showConfirmPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" required />
                        <button type="button" className="eye-btn" onClick={() => setShowConfirmPass(p => !p)}>
                          {showConfirmPass
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                  {passError && <div style={{color:'#ef4444', fontSize:'13px', marginBottom:'12px'}}>{passError}</div>}
                  <div className="requirements-box">
                    <div className="requirements-title">{t.passwordReq}</div>
                    {passReqs.map(r => <div key={r.id} className={`req-item${r.met ? ' met' : ''}`}>{r.label}</div>)}
                  </div>
                  <div className="button-group">
                    <button type="submit" className="btn btn-primary" disabled={passLoading}>
                      {passLoading ? 'Updating…' : t.updatePassword}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="tab-content">
                <div className="section-title">{t.notifications}</div>
                {[
                  { key: 'email', icon: 'email', color: '#1976d2', title: 'Email Notifications', desc: 'Receive complaint updates and status changes via email', val: notifEmail, set: setNotifEmail,
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
                  { key: 'sms', icon: 'sms', color: '#10b981', title: 'SMS Alerts', desc: 'Get important updates and urgent notifications via text message', val: notifSms, set: setNotifSms,
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
                  { key: 'app', icon: 'app', color: '#f59e0b', title: 'In-App Notifications', desc: 'Show notifications within the GovCare+ dashboard', val: notifApp, set: setNotifApp,
                    svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
                ].map(n => (
                  <div key={n.key} className="notif-item-row">
                    <div className="notif-item-left">
                      <div className={`notif-icon-box ${n.icon}`}>{n.svg}</div>
                      <div className="notif-text"><h4>{n.title}</h4><p>{n.desc}</p></div>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={n.val} onChange={e => n.set(e.target.checked)} />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                ))}
                <div className="button-group">
                  <button className="btn btn-primary" onClick={handleSaveNotifications} disabled={savingNotif}>
                    {savingNotif ? 'Saving…' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {/* Activity Log */}
            {activeTab === 'activity' && (
              <div className="tab-content">
                <div className="section-title">Recent Account Activity</div>
                {loadingLog ? (
                  <div style={{display:'flex', flexDirection:'column', gap:12}}>
                    {[1,2,3].map(i => <div key={i} className="skeleton" style={{height:72, borderRadius:10}} />)}
                  </div>
                ) : activityLog.length === 0 ? (
                  <div className="log-empty">No activity recorded yet.</div>
                ) : (
                  <div className="timeline">
                    {activityLog.map((item) => {
                      const badgeClass = item.event?.includes('Login') ? 'login'
                        : item.event?.includes('Password') ? 'password' : 'profile';
                      return (
                        <div key={item.id} className="timeline-item">
                          <div className="timeline-dot"></div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <div className="timeline-title" style={{display:'flex', alignItems:'center', gap:8}}>
                                <span className={`log-event-badge ${badgeClass}`}>
                                  {item.event}
                                </span>
                              </div>
                              <div className="timeline-time">{formatLogTime(item)}</div>
                            </div>
                            <div className="timeline-meta">
                              <div className="timeline-meta-item">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                                {item.device}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
