import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { encryptFields } from '../crypto';
import ReCAPTCHA from 'react-google-recaptcha';

const RECAPTCHA_SITE_KEY = '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

const translations = {
  en: {
    createAccount: 'Create Account', subtitle: 'Register to submit and track your complaints',
    fullName: 'Full Name', fullNamePlaceholder: 'Enter your full name as per IC',
    fullNameError: '⚠ Please enter your full name (at least 3 characters)',
    email: 'Email Address', emailPlaceholder: 'example@email.com',
    emailHint: "We'll send complaint updates to this email",
    emailError: '⚠ Please enter a valid email address',
    phone: 'Phone Number', phonePlaceholder: '+60 12-345 6789',
    phoneError: '⚠ Please enter a valid Malaysian phone number',
    icNumber: 'Malaysian IC Number', icPlaceholder: 'XXXXXX-XX-XXXX',
    icHint: 'For identity verification purposes',
    icError: '⚠ Please enter a valid IC number (format: XXXXXX-XX-XXXX)',
    password: 'Password', passwordPlaceholder: 'Create a strong password',
    confirmPassword: 'Confirm Password', confirmPasswordPlaceholder: 'Re-enter your password',
    confirmPasswordError: '⚠ Passwords do not match',
    req1: 'At least 8 characters', req2: 'Contains letters and numbers',
    req3: 'Contains uppercase and lowercase', req4: 'Contains special character (!@#$%)',
    weak: 'Weak', medium: 'Medium', strong: 'Strong',
    termsText: 'I acknowledge that I have read and agree to the',
    privacyPolicy: 'Privacy Policy', and: 'and', termsOfService: 'Terms of Service',
    createBtn: 'Create Account', creating: 'Creating Account...',
    alreadyHave: 'Already have an account?', loginHere: 'Login here',
    copyright: '© 2026 Government of Malaysia', secured: 'SECURED',
    protectedBy: 'Your data is protected by TLS/SSL encryption',
    required: '*', privacyTitle: 'Privacy Policy', termsTitle: 'Terms of Service',
    acceptError: 'Please accept the Terms of Service and Privacy Policy.',
    fillError: 'Please fill in all fields correctly.',
  },
  ms: {
    createAccount: 'Buat Akaun', subtitle: 'Daftar untuk menghantar dan menjejak aduan anda',
    fullName: 'Nama Penuh', fullNamePlaceholder: 'Masukkan nama penuh seperti dalam IC',
    fullNameError: '⚠ Sila masukkan nama penuh anda (sekurang-kurangnya 3 aksara)',
    email: 'Alamat E-mel', emailPlaceholder: 'contoh@emel.com',
    emailHint: 'Kami akan menghantar kemas kini aduan ke e-mel ini',
    emailError: '⚠ Sila masukkan alamat e-mel yang sah',
    phone: 'Nombor Telefon', phonePlaceholder: '+60 12-345 6789',
    phoneError: '⚠ Sila masukkan nombor telefon Malaysia yang sah',
    icNumber: 'Nombor IC Malaysia', icPlaceholder: 'XXXXXX-XX-XXXX',
    icHint: 'Untuk tujuan pengesahan identiti',
    icError: '⚠ Sila masukkan nombor IC yang sah (format: XXXXXX-XX-XXXX)',
    password: 'Kata Laluan', passwordPlaceholder: 'Buat kata laluan yang kukuh',
    confirmPassword: 'Sahkan Kata Laluan', confirmPasswordPlaceholder: 'Masukkan semula kata laluan anda',
    confirmPasswordError: '⚠ Kata laluan tidak sepadan',
    req1: 'Sekurang-kurangnya 8 aksara', req2: 'Mengandungi huruf dan nombor',
    req3: 'Mengandungi huruf besar dan kecil', req4: 'Mengandungi aksara khas (!@#$%)',
    weak: 'Lemah', medium: 'Sederhana', strong: 'Kukuh',
    termsText: 'Saya mengakui bahawa saya telah membaca dan bersetuju dengan',
    privacyPolicy: 'Dasar Privasi', and: 'dan', termsOfService: 'Terma Perkhidmatan',
    createBtn: 'Buat Akaun', creating: 'Mencipta Akaun...',
    alreadyHave: 'Sudah ada akaun?', loginHere: 'Log masuk di sini',
    copyright: '© 2026 Kerajaan Malaysia', secured: 'SELAMAT',
    protectedBy: 'Data anda dilindungi oleh penyulitan TLS/SSL',
    required: '*', privacyTitle: 'Dasar Privasi', termsTitle: 'Terma Perkhidmatan',
    acceptError: 'Sila terima Terma Perkhidmatan dan Dasar Privasi.',
    fillError: 'Sila isi semua medan dengan betul.',
  },
  zh: {
    createAccount: '创建账户', subtitle: '注册以提交和跟踪您的投诉',
    fullName: '全名', fullNamePlaceholder: '请输入与身份证相同的全名',
    fullNameError: '⚠ 请输入您的全名（至少3个字符）',
    email: '电子邮件地址', emailPlaceholder: '示例@邮箱.com',
    emailHint: '我们将把投诉更新发送到此邮箱',
    emailError: '⚠ 请输入有效的电子邮件地址',
    phone: '电话号码', phonePlaceholder: '+60 12-345 6789',
    phoneError: '⚠ 请输入有效的马来西亚电话号码',
    icNumber: '马来西亚身份证号码', icPlaceholder: 'XXXXXX-XX-XXXX',
    icHint: '用于身份验证目的',
    icError: '⚠ 请输入有效的身份证号码（格式：XXXXXX-XX-XXXX）',
    password: '密码', passwordPlaceholder: '创建一个强密码',
    confirmPassword: '确认密码', confirmPasswordPlaceholder: '重新输入您的密码',
    confirmPasswordError: '⚠ 密码不匹配',
    req1: '至少8个字符', req2: '包含字母和数字',
    req3: '包含大写和小写字母', req4: '包含特殊字符（!@#$%）',
    weak: '弱', medium: '中等', strong: '强',
    termsText: '我确认我已阅读并同意',
    privacyPolicy: '隐私政策', and: '和', termsOfService: '服务条款',
    createBtn: '创建账户', creating: '创建账户中...',
    alreadyHave: '已有账户？', loginHere: '在此登录',
    copyright: '© 2026 马来西亚政府', secured: '安全',
    protectedBy: '您的数据受TLS/SSL加密保护',
    required: '*', privacyTitle: '隐私政策', termsTitle: '服务条款',
    acceptError: '请接受服务条款和隐私政策。',
    fillError: '请正确填写所有字段。',
  },
  ta: {
    createAccount: 'கணக்கு உருவாக்கு', subtitle: 'புகார்களை சமர்ப்பிக்கவும் கண்காணிக்கவும் பதிவு செய்யுங்கள்',
    fullName: 'முழு பெயர்', fullNamePlaceholder: 'IC படி உங்கள் முழு பெயரை உள்ளிடுங்கள்',
    fullNameError: '⚠ உங்கள் முழு பெயரை உள்ளிடுங்கள் (குறைந்தது 3 எழுத்துகள்)',
    email: 'மின்னஞ்சல் முகவரி', emailPlaceholder: 'example@email.com',
    emailHint: 'இந்த மின்னஞ்சலுக்கு புகார் புதுப்பிப்புகள் அனுப்பப்படும்',
    emailError: '⚠ சரியான மின்னஞ்சல் முகவரியை உள்ளிடுங்கள்',
    phone: 'தொலைபேசி எண்', phonePlaceholder: '+60 12-345 6789',
    phoneError: '⚠ சரியான மலேசிய தொலைபேசி எண்ணை உள்ளிடுங்கள்',
    icNumber: 'மலேசிய IC எண்', icPlaceholder: 'XXXXXX-XX-XXXX',
    icHint: 'அடையாள சரிபார்ப்புக்காக',
    icError: '⚠ சரியான IC எண்ணை உள்ளிடுங்கள் (வடிவம்: XXXXXX-XX-XXXX)',
    password: 'கடவுச்சொல்', passwordPlaceholder: 'வலுவான கடவுச்சொல் உருவாக்குங்கள்',
    confirmPassword: 'கடவுச்சொல் உறுதிப்படுத்தவும்', confirmPasswordPlaceholder: 'கடவுச்சொல்லை மீண்டும் உள்ளிடுங்கள்',
    confirmPasswordError: '⚠ கடவுச்சொற்கள் பொருந்தவில்லை',
    req1: 'குறைந்தது 8 எழுத்துகள்', req2: 'எழுத்துகள் மற்றும் எண்கள் உள்ளடங்கும்',
    req3: 'பெரிய மற்றும் சிறிய எழுத்துகள் உள்ளடங்கும்', req4: 'சிறப்பு எழுத்து உள்ளடங்கும் (!@#$%)',
    weak: 'பலவீனம்', medium: 'நடுத்தரம்', strong: 'வலிமையான',
    termsText: 'நான் படித்து ஒப்புக்கொள்கிறேன்',
    privacyPolicy: 'தனியுரிமை கொள்கை', and: 'மற்றும்', termsOfService: 'சேவை விதிமுறைகள்',
    createBtn: 'கணக்கு உருவாக்கு', creating: 'கணக்கு உருவாக்கப்படுகிறது...',
    alreadyHave: 'ஏற்கனவே கணக்கு உள்ளதா?', loginHere: 'இங்கே உள்நுழையுங்கள்',
    copyright: '© 2026 மலேசிய அரசாங்கம்', secured: 'பாதுகாப்பானது',
    protectedBy: 'உங்கள் தரவு TLS/SSL குறியாக்கத்தால் பாதுகாக்கப்படுகிறது',
    required: '*', privacyTitle: 'தனியுரிமை கொள்கை', termsTitle: 'சேவை விதிமுறைகள்',
    acceptError: 'தனியுரிமை கொள்கை மற்றும் சேவை விதிமுறைகளை ஏற்றுக்கொள்ளுங்கள்.',
    fillError: 'அனைத்து புலங்களையும் சரியாக நிரப்பவும்.',
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

  .register-page {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #92b6f0 0%, #6b9ee8 100%);
    min-height: 100vh; display: flex; align-items: center;
    justify-content: center; padding: 40px 20px;
    -webkit-font-smoothing: antialiased;
  }
  .register-page.dark { background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); }

  .register-container {
    background: #ffffff; border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    width: 100%; max-width: 520px; padding: 48px; position: relative;
  }
  .register-page.dark .register-container { background: #1e293b; border: 1px solid #334155; }

  /* Page controls */
  .page-controls { position: absolute; top: 16px; right: 16px; display: flex; align-items: center; gap: 8px; }
  .theme-toggle {
    width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e5e7eb;
    background: white; cursor: pointer; display: flex; align-items: center;
    justify-content: center; transition: all 0.2s; color: #4b5563;
  }
  .theme-toggle:hover { background: #f3f4f6; }
  .register-page.dark .theme-toggle { background: #334155; border-color: #475569; color: #f1f5f9; }
  .register-page.dark .theme-toggle:hover { background: #475569; }

  .language-wrapper { position: relative; }
  .language-toggle {
    display: flex; align-items: center; gap: 6px; padding: 8px 12px;
    background: white; border: 1px solid #e5e7eb; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; color: #4b5563;
  }
  .language-toggle:hover { background: #f3f4f6; }
  .register-page.dark .language-toggle { background: #334155; border-color: #475569; color: #f1f5f9; }
  .register-page.dark .language-toggle:hover { background: #475569; }
  .language-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0; background: white;
    border: 1px solid #e5e7eb; border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15); min-width: 160px;
    opacity: 0; visibility: hidden; transform: translateY(-10px);
    transition: all 0.2s; z-index: 1000;
  }
  .language-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }
  .register-page.dark .language-dropdown { background: #1e293b; border-color: #475569; }
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
  .register-page.dark .language-option { color: #e2e8f0; }
  .register-page.dark .language-option:hover { background: #334155; }

  .register-header { text-align: center; margin-bottom: 40px; margin-top: 24px; }
  .logo-container {
    display: flex; align-items: center; justify-content: center;
    gap: 12px; margin-bottom: 24px; text-decoration: none;
  }
  .jata-negara-small { width: 40px; height: 40px; }
  .jata-negara-small img { width: 100%; height: 100%; object-fit: contain; }
  .brand-name-small { color: #090088; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .register-header h1 { color: #1a1a1a; font-size: 28px; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.5px; }
  .register-header p { color: #6b7280; font-size: 14px; }
  .register-page.dark .brand-name-small { color: #ffffff; }
  .register-page.dark .register-header h1 { color: #f1f5f9; }
  .register-page.dark .register-header p { color: #94a3b8; }

  .form-group { margin-bottom: 24px; }
  .form-group label { display: block; color: #374151; font-size: 14px; font-weight: 600; margin-bottom: 8px; }
  .form-group label .required { color: #ef4444; margin-left: 2px; }
  .register-page.dark .form-group label { color: #e2e8f0; }
  .input-wrapper { position: relative; }
  .form-group input {
    width: 100%; padding: 12px 44px 12px 16px; border: 1.5px solid #d1d5db;
    border-radius: 10px; font-size: 14px; background: #ffffff;
    transition: all 0.2s; font-family: inherit; color: #1a1a1a;
  }
  .form-group input:focus { outline: none; border-color: #090088; box-shadow: 0 0 0 3px rgba(9,0,136,0.1); }
  .form-group input.input-error { border-color: #ef4444; }
  .form-group input.input-success { border-color: #10b981; }
  .register-page.dark .form-group input { background: #0f172a; border-color: #475569; color: #f1f5f9; }
  .register-page.dark .form-group input::placeholder { color: #64748b; }
  .register-page.dark .form-group input:focus { border-color: #4779c4; box-shadow: 0 0 0 3px rgba(71,121,196,0.2); }

  .input-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 16px; display: none; }
  .input-icon.show-success { color: #10b981; display: block; }
  .input-icon.show-error { color: #ef4444; display: block; }

  .eye-toggle {
    position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; padding: 0;
    color: #9ca3af; display: flex; align-items: center; transition: color 0.2s;
  }
  .eye-toggle:hover { color: #4b5563; }
  .register-page.dark .eye-toggle { color: #64748b; }
  .register-page.dark .eye-toggle:hover { color: #94a3b8; }

  .input-hint { color: #9ca3af; font-size: 12px; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
  .register-page.dark .input-hint { color: #64748b; }
  .field-error { color: #ef4444; font-size: 12px; margin-top: 6px; display: none; align-items: center; gap: 4px; font-weight: 500; }
  .field-error.show { display: flex; }

  .strength-label { font-size: 11px; color: #6b7280; margin-bottom: 6px; font-weight: 500; }
  .strength-bar-container { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-top: 8px; }
  .register-page.dark .strength-bar-container { background: #334155; }
  .strength-bar { height: 100%; width: 0%; transition: all 0.3s; border-radius: 3px; }
  .strength-bar.weak { width: 33%; background: #ef4444; }
  .strength-bar.medium { width: 66%; background: #f59e0b; }
  .strength-bar.strong { width: 100%; background: #10b981; }
  .strength-text { font-size: 11px; margin-top: 4px; font-weight: 600; }
  .strength-text.weak { color: #ef4444; }
  .strength-text.medium { color: #f59e0b; }
  .strength-text.strong { color: #10b981; }

  .password-requirements {
    background: #f9fafb; border: 1px solid #e5e7eb;
    border-radius: 8px; padding: 12px; margin-top: 8px; font-size: 12px;
  }
  .register-page.dark .password-requirements { background: #0f172a; border-color: #334155; }
  .password-requirements ul { list-style: none; margin: 0; padding: 0; }
  .password-requirements li { padding: 4px 0; color: #6b7280; display: flex; align-items: center; gap: 8px; }
  .register-page.dark .password-requirements li { color: #64748b; }
  .password-requirements li.met { color: #10b981; }
  .password-requirements li.met::before { content: "✓"; color: #10b981; font-weight: bold; }
  .password-requirements li:not(.met)::before { content: "○"; color: #d1d5db; }

  .checkbox-group {
    display: flex; align-items: flex-start; gap: 12px; margin: 32px 0;
    padding: 16px; background: #f9fafb; border-radius: 10px; border: 1.5px solid #e5e7eb;
  }
  .register-page.dark .checkbox-group { background: #0f172a; border-color: #334155; }
  .checkbox-group input[type="checkbox"] { width: 20px; height: 20px; margin-top: 2px; cursor: pointer; accent-color: #090088; }
  .checkbox-group label { color: #4b5563; font-size: 13px; line-height: 1.6; cursor: pointer; flex: 1; }
  .register-page.dark .checkbox-group label { color: #94a3b8; }
  .checkbox-group label a { color: #090088; text-decoration: none; font-weight: 600; transition: color 0.2s; }
  .checkbox-group label a:hover { color: #070066; text-decoration: underline; }
  .register-page.dark .checkbox-group label a { color: #ffffff; }
  .register-page.dark .checkbox-group label a:hover { color: #e2e8f0; }

  .btn-register {
    width: 100%; padding: 14px; background: #090088; color: white; border: none;
    border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer;
    transition: all 0.2s; font-family: inherit;
  }
  .btn-register:hover:not(:disabled) { background: #070066; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(9,0,136,0.3); }
  .btn-register:active { transform: translateY(0); }
  .btn-register:disabled { opacity: 0.7; cursor: not-allowed; }
  .register-page.dark .btn-register { background: #4779c4; }
  .register-page.dark .btn-register:hover:not(:disabled) { background: #3a6ab5; box-shadow: 0 8px 20px rgba(71,121,196,0.4); }

  .login-link { text-align: center; margin-top: 24px; color: #6b7280; font-size: 14px; }
  .login-link a { color: #090088; text-decoration: none; font-weight: 600; }
  .login-link a:hover { color: #070066; text-decoration: underline; }
  .register-page.dark .login-link { color: #94a3b8; }
  .register-page.dark .login-link a { color: #ffffff; }

  .footer-note { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .footer-note p { color: #9ca3af; font-size: 12px; margin-bottom: 4px; }
  .register-page.dark .footer-note { border-top-color: #334155; }
  .register-page.dark .footer-note p { color: #64748b; }
  .security-note { display: flex; align-items: center; justify-content: center; gap: 6px; color: #6b7280; font-size: 11px; margin-top: 8px; }
  .register-page.dark .security-note { color: #64748b; }
  .security-badge { background: #dcfce7; color: #16a34a; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 10px; }

  .captcha-wrapper { display: flex; justify-content: center; margin: 0 0 8px; }

  /* Modal */
  .modal-overlay {
    display: none; position: fixed; z-index: 1000; left: 0; top: 0;
    width: 100%; height: 100%; background: rgba(0,0,0,0.5);
    align-items: center; justify-content: center; animation: fadeIn 0.3s;
  }
  .modal-overlay.show { display: flex; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-content {
    background: #ffffff; margin: auto; padding: 32px; border-radius: 16px;
    width: 90%; max-width: 600px; max-height: 80vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3); animation: slideUp 0.3s;
  }
  .register-page.dark .modal-content { background: #1e293b; border: 1px solid #334155; }
  @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
  .modal-header h2 { color: #1a1a1a; font-size: 24px; font-weight: 700; }
  .register-page.dark .modal-header { border-bottom-color: #334155; }
  .register-page.dark .modal-header h2 { color: #f1f5f9; }
  .modal-close { color: #6b7280; font-size: 28px; font-weight: bold; cursor: pointer; line-height: 1; }
  .modal-close:hover { color: #1a1a1a; }
  .register-page.dark .modal-close:hover { color: #f1f5f9; }
  .modal-body { color: #4b5563; font-size: 14px; line-height: 1.8; }
  .register-page.dark .modal-body { color: #94a3b8; }
  .modal-body h3 { color: #1a1a1a; font-size: 18px; margin-top: 20px; margin-bottom: 12px; font-weight: 600; }
  .register-page.dark .modal-body h3 { color: #f1f5f9; }
  .modal-body p { margin-bottom: 12px; }
`;

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function getPasswordStrength(password) {
  const req1 = password.length >= 8;
  const req2 = /[a-zA-Z]/.test(password) && /\d/.test(password);
  const req3 = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const req4 = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const score = [req1, req2, req3, req4].filter(Boolean).length;
  return { req1, req2, req3, req4, score };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const recaptchaRef = useRef(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', icNumber: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState({});
  const [termsChecked, setTermsChecked] = useState(false);
  const [modal, setModal] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const strength = getPasswordStrength(form.password);
  const t = translations[language];

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    const savedLang = localStorage.getItem('govcare-language') || 'en';
    setLanguage(savedLang);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('govcare-theme', next ? 'dark' : 'light');
  }

  function changeLanguage(lang) {
    setLanguage(lang);
    setDropdownOpen(false);
    localStorage.setItem('govcare-language', lang);
  }

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function formatIC(value) {
    let v = value.replace(/[^\d]/g, '');
    if (v.length > 6) v = v.slice(0, 6) + '-' + v.slice(6);
    if (v.length > 9) v = v.slice(0, 9) + '-' + v.slice(9, 13);
    return v;
  }

  function validateField(field, value) {
    let isValid = false;
    switch (field) {
      case 'fullName': isValid = value.length >= 3; break;
      case 'email': isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); break;
      case 'phone': isValid = /^(\+?6?01)[0-9]{8,9}$/.test(value.replace(/[\s-]/g, '')); break;
      case 'icNumber': isValid = value.length === 14; break;
      case 'confirmPassword': isValid = value === form.password && value.length > 0; break;
      default: isValid = value.length > 0;
    }
    if (isValid) {
      setErrors(e => { const n = { ...e }; delete n[field]; return n; });
      setSuccess(s => ({ ...s, [field]: true }));
    } else if (value) {
      setErrors(e => ({ ...e, [field]: true }));
      setSuccess(s => { const n = { ...s }; delete n[field]; return n; });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    if (!termsChecked) { setSubmitError(t.acceptError); return; }
    if (!captchaToken) { setSubmitError('Please complete the CAPTCHA verification before registering.'); return; }
    const { fullName, email, phone, icNumber, password, confirmPassword } = form;
    if (fullName.length < 3 || !email || !phone || icNumber.length !== 14 || password !== confirmPassword) {
      setSubmitError(t.fillError); return;
    }
    setLoading(true);

    // ── Step 1: Create Firebase Auth account ────────────────────────────────
    let user;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      await updateProfile(user, { displayName: fullName });
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      switch (err.code) {
        case 'auth/email-already-in-use':
          setSubmitError('This email is already registered. Please login instead.'); break;
        case 'auth/weak-password':
          setSubmitError('Password is too weak. Please use a stronger password.'); break;
        case 'auth/invalid-email':
          setSubmitError('Invalid email address.'); break;
        default:
          setSubmitError('Registration failed. Please try again.');
      }
      setLoading(false);
      return;
    }

    // ── Step 2: Save encrypted profile to Firestore ──────────────────────────
    // Non-fatal: auth account is usable even if this fails.
    try {
      const encrypted = await encryptFields(
        { fullName, email, phone: phone || '', icNumber: icNumber || '' },
        ['fullName', 'email', 'phone', 'icNumber'],
      );
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        ...encrypted,
        notifEmail: true, notifSms: true, notifApp: true,
        createdAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('Profile save failed:', err.message);
    }

    setLoading(false);
    navigate('/login');
  }

  const iconClass = (field) => {
    if (success[field]) return 'input-icon show-success';
    if (errors[field]) return 'input-icon show-error';
    return 'input-icon';
  };

  const inputClass = (field) => {
    if (success[field]) return 'input-success';
    if (errors[field]) return 'input-error';
    return '';
  };

  const meta = langMeta[language];

  return (
    <>
      <style>{css}</style>
      <div className={`register-page${darkMode ? ' dark' : ''}`}>
        <div className="register-container">

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

          <div className="register-header">
            <a href="/" className="logo-container">
              <div className="jata-negara-small"><img src="/pictures/Malaysia.svg" alt="Jata Negara" /></div>
              <div className="brand-name-small">GovCare+</div>
            </a>
            <h1>{t.createAccount}</h1>
            <p>{t.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label>{t.fullName} <span className="required">{t.required}</span></label>
              <div className="input-wrapper">
                <input type="text" className={inputClass('fullName')} placeholder={t.fullNamePlaceholder}
                  value={form.fullName} onChange={e => update('fullName', e.target.value.toUpperCase())}
                  onBlur={e => validateField('fullName', e.target.value)} style={{textTransform:'uppercase'}} required />
                <span className={iconClass('fullName')}>{errors.fullName ? '✗' : '✓'}</span>
              </div>
              <div className={`field-error${errors.fullName ? ' show' : ''}`}>{t.fullNameError}</div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label>{t.email} <span className="required">{t.required}</span></label>
              <div className="input-wrapper">
                <input type="email" className={inputClass('email')} placeholder={t.emailPlaceholder}
                  value={form.email} onChange={e => update('email', e.target.value)}
                  onBlur={e => validateField('email', e.target.value)} required />
                <span className={iconClass('email')}>{errors.email ? '✗' : '✓'}</span>
              </div>
              <div className="input-hint">{t.emailHint}</div>
              <div className={`field-error${errors.email ? ' show' : ''}`}>{t.emailError}</div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label>{t.phone} <span className="required">{t.required}</span></label>
              <div className="input-wrapper">
                <input type="tel" className={inputClass('phone')} placeholder={t.phonePlaceholder}
                  value={form.phone} onChange={e => update('phone', e.target.value)}
                  onBlur={e => validateField('phone', e.target.value)} required />
                <span className={iconClass('phone')}>{errors.phone ? '✗' : '✓'}</span>
              </div>
              <div className={`field-error${errors.phone ? ' show' : ''}`}>{t.phoneError}</div>
            </div>

            {/* IC Number */}
            <div className="form-group">
              <label>{t.icNumber} <span className="required">{t.required}</span></label>
              <div className="input-wrapper">
                <input type="text" className={inputClass('icNumber')} placeholder={t.icPlaceholder} maxLength="14"
                  value={form.icNumber}
                  onChange={e => update('icNumber', formatIC(e.target.value))}
                  onBlur={e => validateField('icNumber', e.target.value)} required />
                <span className={iconClass('icNumber')}>{errors.icNumber ? '✗' : '✓'}</span>
              </div>
              <div className="input-hint">{t.icHint}</div>
              <div className={`field-error${errors.icNumber ? ' show' : ''}`}>{t.icError}</div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label>{t.password} <span className="required">{t.required}</span></label>
              <div className="input-wrapper">
                <input type={showPassword ? 'text' : 'password'} placeholder={t.passwordPlaceholder}
                  value={form.password} onChange={e => update('password', e.target.value)} required />
                <button type="button" className="eye-toggle" onClick={() => setShowPassword(!showPassword)}>
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {form.password && (
                <>
                  <div className="strength-bar-container">
                    <div className={`strength-bar${strength.score <= 2 ? ' weak' : strength.score === 3 ? ' medium' : ' strong'}`}></div>
                  </div>
                  <div className={`strength-text${strength.score <= 2 ? ' weak' : strength.score === 3 ? ' medium' : ' strong'}`}>
                    {strength.score <= 2 ? t.weak : strength.score === 3 ? t.medium : t.strong}
                  </div>
                </>
              )}
              <div className="password-requirements">
                <ul>
                  <li className={strength.req1 ? 'met' : ''}>{t.req1}</li>
                  <li className={strength.req2 ? 'met' : ''}>{t.req2}</li>
                  <li className={strength.req3 ? 'met' : ''}>{t.req3}</li>
                  <li className={strength.req4 ? 'met' : ''}>{t.req4}</li>
                </ul>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label>{t.confirmPassword} <span className="required">{t.required}</span></label>
              <div className="input-wrapper">
                <input type={showConfirm ? 'text' : 'password'} className={inputClass('confirmPassword')} placeholder={t.confirmPasswordPlaceholder}
                  value={form.confirmPassword}
                  onChange={e => { update('confirmPassword', e.target.value); validateField('confirmPassword', e.target.value); }}
                  required />
                <button type="button" className="eye-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              <div className={`field-error${errors.confirmPassword ? ' show' : ''}`}>{t.confirmPasswordError}</div>
            </div>

            {/* Terms */}
            <div className="checkbox-group">
              <input type="checkbox" id="terms" checked={termsChecked} onChange={e => setTermsChecked(e.target.checked)} required />
              <label htmlFor="terms">
                {t.termsText}{' '}
                <a href="#" onClick={e => { e.preventDefault(); setModal('privacy'); }}>{t.privacyPolicy}</a> {t.and}{' '}
                <a href="#" onClick={e => { e.preventDefault(); setModal('terms'); }}>{t.termsOfService}</a>
              </label>
            </div>

            {submitError && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',color:'#991b1b',padding:'12px 16px',borderRadius:'8px',fontSize:'13px',marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
                <span>⚠</span><span>{submitError}</span>
              </div>
            )}

            <div className="captcha-wrapper">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={token => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>

            <button type="submit" className="btn-register" disabled={loading || !captchaToken}>
              {loading ? t.creating : t.createBtn}
            </button>

            <div className="login-link">
              {t.alreadyHave} <a href="/login">{t.loginHere}</a>
            </div>
          </form>

          <div className="footer-note">
            <p>{t.copyright}</p>
          </div>
        </div>
      </div>

      {/* Privacy Modal */}
      <div className={`modal-overlay${modal === 'privacy' ? ' show' : ''}`} onClick={e => { if (e.target.classList.contains('modal-overlay')) setModal(null); }}>
        <div className={`register-page${darkMode ? ' dark' : ''}`} style={{display:'contents'}}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t.privacyTitle}</h2>
              <span className="modal-close" onClick={() => setModal(null)}>&times;</span>
            </div>
            <div className="modal-body">
              <p><strong>Last Updated: February 2026</strong></p>
              <h3>1. Information We Collect</h3>
              <p>We collect personal information including your name, IC number, email address, and phone number for identity verification and complaint management.</p>
              <h3>2. How We Use Your Information</h3>
              <p>Your information is used to process complaints, route them to appropriate ministries, and communicate updates regarding your submissions.</p>
              <h3>3. Data Protection</h3>
              <p>All data is encrypted using TLS/SSL during transmission and AES-256 at rest. We comply with Malaysia's Personal Data Protection Act (PDPA) 2010.</p>
              <h3>4. Data Sharing</h3>
              <p>Your information is shared only with relevant government ministries for complaint resolution. We do not sell or share your data with third parties.</p>
              <h3>5. Your Rights</h3>
              <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@govcare.gov.my for data requests.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <div className={`modal-overlay${modal === 'terms' ? ' show' : ''}`} onClick={e => { if (e.target.classList.contains('modal-overlay')) setModal(null); }}>
        <div className={`register-page${darkMode ? ' dark' : ''}`} style={{display:'contents'}}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{t.termsTitle}</h2>
              <span className="modal-close" onClick={() => setModal(null)}>&times;</span>
            </div>
            <div className="modal-body">
              <p><strong>Last Updated: February 2026</strong></p>
              <h3>1. Acceptance of Terms</h3>
              <p>By registering for GovCare+, you agree to these Terms of Service and our Privacy Policy.</p>
              <h3>2. Account Registration</h3>
              <p>You must provide accurate information during registration. You are responsible for maintaining the confidentiality of your account credentials.</p>
              <h3>3. Acceptable Use</h3>
              <p>You agree to use GovCare+ only for legitimate complaint submissions. Misuse may result in account suspension.</p>
              <h3>4. Complaint Processing</h3>
              <p>Complaints are processed using AI classification and routed to appropriate ministries. Processing times may vary.</p>
              <h3>5. Limitation of Liability</h3>
              <p>GovCare+ is provided "as is" without warranties. The Government of Malaysia is not liable for any delays in complaint resolution.</p>
              <h3>6. Changes to Terms</h3>
              <p>We reserve the right to modify these terms. Users will be notified of significant changes via email.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
