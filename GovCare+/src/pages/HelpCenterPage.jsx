import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const translations = {
  en: {
    menu: 'Menu', home: 'Home', submitComplaint: 'Submit Complaint',
    trackStatus: 'Track Status', profile: 'Profile',
    support: 'Support', helpCenter: 'Help Center', logout: 'Logout',
    notifications: 'Notifications', markAllRead: 'Mark all as read',
    viewAllNotifications: 'View all notifications',
    helpCenterTitle: 'Help Center',
    helpCenterDesc: 'Get support and contact us through various channels',
    generalHotline: 'General Hotline', available24: '● Available 24/7',
    hotlineDesc: 'Call our toll-free number for general inquiries and complaint assistance',
    callNow: 'Call Now', emailSupport: 'Email Support',
    responseTime: 'Response within 24 hours',
    emailDesc: 'Send us detailed inquiries or documentation via email',
    sendEmail: 'Send Email', liveChat: 'Live Chat', chatWithUs: 'Chat with Us',
    chatHours: 'Mon-Fri, 8AM-6PM',
    chatDesc: 'Get instant help from our support agents via live chat',
    startChat: 'Start Chat', ministryLines: 'Ministry Direct Lines',
    clickToCall: 'Click on any phone number to call directly',
    emergencyHotline: 'Emergency Hotline',
    emergencyDesc: 'For urgent matters requiring immediate government attention',
    callEmergency: 'Call 999',
    faqTitle: 'Frequently Asked Questions',
  },
  ms: {
    menu: 'Menu', home: 'Utama', submitComplaint: 'Hantar Aduan',
    trackStatus: 'Jejak Status', profile: 'Profil',
    support: 'Sokongan', helpCenter: 'Pusat Bantuan', logout: 'Log Keluar',
    notifications: 'Pemberitahuan', markAllRead: 'Tandakan semua dibaca',
    viewAllNotifications: 'Lihat semua pemberitahuan',
    helpCenterTitle: 'Pusat Bantuan',
    helpCenterDesc: 'Dapatkan sokongan dan hubungi kami melalui pelbagai saluran',
    generalHotline: 'Talian Hotline Am', available24: '● Tersedia 24/7',
    hotlineDesc: 'Hubungi nombor bebas tol kami untuk pertanyaan am dan bantuan aduan',
    callNow: 'Hubungi Sekarang', emailSupport: 'Sokongan E-mel',
    responseTime: 'Respons dalam 24 jam',
    emailDesc: 'Hantar pertanyaan terperinci atau dokumentasi melalui e-mel',
    sendEmail: 'Hantar E-mel', liveChat: 'Sembang Langsung', chatWithUs: 'Sembang dengan Kami',
    chatHours: 'Isn-Jum, 8PG-6PTG',
    chatDesc: 'Dapatkan bantuan segera daripada ejen sokongan kami melalui sembang',
    startChat: 'Mula Sembang', ministryLines: 'Talian Terus Kementerian',
    clickToCall: 'Klik mana-mana nombor telefon untuk menelefon terus',
    emergencyHotline: 'Talian Kecemasan',
    emergencyDesc: 'Untuk perkara mendesak yang memerlukan perhatian kerajaan segera',
    callEmergency: 'Hubungi 999',
    faqTitle: 'Soalan Lazim',
  },
  zh: {
    menu: '菜单', home: '首页', submitComplaint: '提交投诉',
    trackStatus: '跟踪状态', profile: '个人资料',
    support: '支持', helpCenter: '帮助中心', logout: '登出',
    notifications: '通知', markAllRead: '全部标为已读',
    viewAllNotifications: '查看所有通知',
    helpCenterTitle: '帮助中心',
    helpCenterDesc: '通过各种渠道获取支持并联系我们',
    generalHotline: '服务热线', available24: '● 全天候服务',
    hotlineDesc: '拨打我们的免费电话进行一般咨询和投诉协助',
    callNow: '立即拨打', emailSupport: '电子邮件支持',
    responseTime: '24小时内回复',
    emailDesc: '通过电子邮件发送详细咨询或文档',
    sendEmail: '发送邮件', liveChat: '在线聊天', chatWithUs: '与我们聊天',
    chatHours: '周一至周五 8AM-6PM',
    chatDesc: '通过在线聊天从我们的支持人员获得即时帮助',
    startChat: '开始聊天', ministryLines: '部门直线电话',
    clickToCall: '点击任何电话号码直接拨打',
    emergencyHotline: '紧急热线',
    emergencyDesc: '对于需要立即政府关注的紧急事项',
    callEmergency: '拨打999',
    faqTitle: '常见问题',
  },
  ta: {
    menu: 'மெனு', home: 'முகப்பு', submitComplaint: 'புகார் சமர்ப்பி',
    trackStatus: 'நிலையை கண்காணி', profile: 'சுயவிவரம்',
    support: 'ஆதரவு', helpCenter: 'உதவி மையம்', logout: 'வெளியேறு',
    notifications: 'அறிவிப்புகள்', markAllRead: 'அனைத்தையும் படித்ததாக குறி',
    viewAllNotifications: 'அனைத்து அறிவிப்புகளையும் காண்க',
    helpCenterTitle: 'உதவி மையம்',
    helpCenterDesc: 'பல்வேறு சேனல்கள் மூலம் ஆதரவைப் பெறுங்கள் மற்றும் எங்களைத் தொடர்பு கொள்ளுங்கள்',
    generalHotline: 'பொது ஹாட்லைன்', available24: '● 24/7 கிடைக்கும்',
    hotlineDesc: 'பொதுவான விசாரணைகள் மற்றும் புகார் உதவிக்கு எங்கள் இலவச எண்ணை அழைக்கவும்',
    callNow: 'இப்போது அழைக்கவும்', emailSupport: 'மின்னஞ்சல் ஆதரவு',
    responseTime: '24 மணி நேரத்தில் பதில்',
    emailDesc: 'மின்னஞ்சல் மூலம் விரிவான விசாரணைகள் அல்லது ஆவணங்களை அனுப்புங்கள்',
    sendEmail: 'மின்னஞ்சல் அனுப்பு', liveChat: 'நேரடி அரட்டை', chatWithUs: 'எங்களுடன் அரட்டையடிக்கவும்',
    chatHours: 'திங்-வெள், 8AM-6PM',
    chatDesc: 'நேரடி அரட்டை மூலம் எங்கள் ஆதரவு முகவர்களிடமிருந்து உடனடி உதவி பெறுங்கள்',
    startChat: 'அரட்டையைத் தொடங்கு', ministryLines: 'அமைச்சக நேரடி தொடர்பு',
    clickToCall: 'நேரடியாக அழைக்க எந்த தொலைபேசி எண்ணையும் கிளிக் செய்யவும்',
    emergencyHotline: 'அவசர ஹாட்லைன்',
    emergencyDesc: 'உடனடி அரசு கவனிப்பு தேவைப்படும் அவசர விஷயங்களுக்கு',
    callEmergency: '999 அழைக்கவும்',
    faqTitle: 'அடிக்கடி கேட்கப்படும் கேள்விகள்',
  },
};

const langMeta = {
  en: { flag: '🇬🇧', label: 'EN' },
  ms: { flag: '🇲🇾', label: 'BM' },
  zh: { flag: '🇨🇳', label: '中文' },
  ta: { flag: '🇮🇳', label: 'தமிழ்' },
};

const ministries = [
  { name: 'Ministry of Health', phone: '+60388810200', display: '+603-8881 0200', bg: '#dbeafe', iconColor: '#2563eb', iconType: 'activity' },
  { name: 'Ministry of Transport', phone: '+60388866000', display: '+603-8886 6000', bg: '#fed7aa', iconColor: '#ea580c', iconType: 'lock' },
  { name: 'Ministry of Education', phone: '+60388846000', display: '+603-8884 6000', bg: '#fef3c7', iconColor: '#d97706', iconType: 'book' },
  { name: 'Ministry of Works', phone: '+60388851400', display: '+603-8885 1400', bg: '#d1fae5', iconColor: '#059669', iconType: 'home' },
  { name: 'Ministry of Home Affairs', phone: '+60388866000', display: '+603-8886 6000', bg: '#e9d5ff', iconColor: '#9333ea', iconType: 'shield' },
  { name: 'Ministry of Environment', phone: '+60388861111', display: '+603-8886 1111', bg: '#ccfbf1', iconColor: '#0d9488', iconType: 'globe' },
];

const faqs = [
  { q: 'How do I submit a new complaint?', a: 'Click on "Submit Complaint" in the sidebar menu. Fill in your complaint details, select the appropriate category, and upload any supporting documents. Our AI system will automatically route your complaint to the right ministry.' },
  { q: 'How can I track my complaint status?', a: 'Go to "Track Status" in the sidebar. You can view all your submitted complaints and their current status. Use the reference number (e.g., C-2026-0234) to search for specific complaints.' },
  { q: 'What is the expected response time?', a: 'Initial acknowledgment is provided within 24 hours. Resolution time varies based on complaint complexity — simple issues may be resolved within 3-5 working days, while complex cases may take up to 14 working days.' },
  { q: 'How does the AI classification work?', a: 'Our BERT-based NLP model analyzes your complaint text and automatically categorizes it into one of six ministry categories: Health, Transport, Education, Infrastructure, Public Safety, or Environment. The system achieves 87.5% accuracy in classification.' },
  { q: 'Is my personal information secure?', a: "Yes, GovCare+ uses TLS 1.3 encryption for data transmission and AES-256 encryption for data storage. We comply with Malaysia's Personal Data Protection Act (PDPA) 2010. Your IC number is partially masked in the system." },
];

function getBotResponse(message) {
  const m = message.toLowerCase();
  if (m.includes('hello') || m.includes('hi') || m.includes('hey')) return "Hello! 👋 Welcome to GovCare+ support. How can I help you today?";
  if (m.includes('track') || m.includes('status')) return "To track your complaint, go to 'Track Status' in the sidebar menu. Enter your complaint reference number (e.g., C-2026-0234) to see the current status and timeline.";
  if (m.includes('submit') || m.includes('new complaint') || m.includes('file complaint')) return "To submit a new complaint, click 'Submit Complaint' in the sidebar. Fill in the required details and our AI system will automatically route it to the appropriate ministry. The process takes about 2-3 minutes.";
  if (m.includes('how long') || m.includes('response time') || m.includes('waiting')) return "Our typical response times are:\n• Initial acknowledgment: Within 24 hours\n• Simple issues: 3-5 working days\n• Complex cases: Up to 14 working days\n\nYou'll receive email notifications for every status update.";
  if (m.includes('phone') || m.includes('call') || m.includes('hotline') || m.includes('contact')) return "You can reach us through:\n📞 General Hotline: 1-800-88-7080 (24/7)\n📧 Email: support@govcare.gov.my\n🚨 Emergency: 999";
  if (m.includes('ministry') || m.includes('department')) return "GovCare+ routes complaints to 6 ministries:\n• Ministry of Health\n• Ministry of Transport\n• Ministry of Education\n• Ministry of Works\n• Ministry of Home Affairs\n• Ministry of Environment";
  if (m.includes('account') || m.includes('profile') || m.includes('password')) return "You can manage your account settings by clicking 'Profile' in the sidebar. There you can update your personal information, change your password, and manage notification preferences.";
  if (m.includes('thank')) return "You're welcome! 😊 Is there anything else I can help you with today?";
  if (m.includes('bye') || m.includes('goodbye')) return "Goodbye! Thank you for using GovCare+ support. Have a great day! 🙏";
  if (m.includes('human') || m.includes('agent') || m.includes('real person')) return "I understand you'd like to speak with a human agent. Our support team is available Monday-Friday, 8AM-6PM.\n\n📞 Call us directly at 1-800-88-7080 to speak with an agent immediately.";
  if (m.includes('secure') || m.includes('privacy') || m.includes('safe') || m.includes('data')) return "Your data security is our priority! GovCare+ uses:\n🔒 TLS 1.3 encryption for all data transmission\n🔐 AES-256 encryption for stored data\n✅ Full PDPA 2010 compliance";
  return "I'm here to help! You can ask me about:\n• Submitting a new complaint\n• Tracking complaint status\n• Response times\n• Contact information\n• Account settings";
}

const notifIconMap = {
  success: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  warning: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

function MinistryIcon({ type, color }) {
  const p = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2 };
  if (type === 'activity') return <svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
  if (type === 'lock') return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  if (type === 'book') return <svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
  if (type === 'home') return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (type === 'shield') return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (type === 'globe') return <svg {...p}><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><circle cx="12" cy="12" r="10"/></svg>;
  return null;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; }

  .help-page { font-family: 'Inter', sans-serif; background: #f9fafb; min-height: 100vh; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
  .help-page.dark { background: #0f172a; color: #e2e8f0; }

  .top-nav { background: #ffffff; height: 70px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .help-page.dark .top-nav { background: #1e293b; border-color: #334155; }
  .nav-left { display: flex; align-items: center; gap: 16px; }
  .logo-container { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .jata-negara { width: 36px; height: 36px; }
  .jata-negara img { width: 100%; height: 100%; object-fit: contain; }
  .brand-name { color: #090088; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .help-page.dark .brand-name { color: #ffffff; }
  .nav-right { display: flex; align-items: center; gap: 16px; }

  .theme-toggle { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: all 0.2s; color: #374151; }
  .theme-toggle:hover { background: #e5e7eb; }
  .help-page.dark .theme-toggle { background: #334155; border-color: #475569; color: #fbbf24; }
  .help-page.dark .theme-toggle:hover { background: #475569; }

  .language-wrapper { position: relative; }
  .language-btn { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; color: #374151; transition: all 0.2s; }
  .language-btn:hover { background: #e5e7eb; }
  .help-page.dark .language-btn { background: #334155; border-color: #475569; color: #e2e8f0; }
  .help-page.dark .language-btn:hover { background: #475569; }
  .lang-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 180px; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; z-index: 1000; overflow: hidden; opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s; }
  .lang-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
  .help-page.dark .lang-dropdown { background: #1e293b; border-color: #334155; }
  .lang-option { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; font-size: 14px; color: #374151; transition: background 0.2s; }
  .lang-option:hover { background: #f3f4f6; }
  .lang-option.active { background: #ede9fe; color: #090088; font-weight: 600; }
  .lang-option .check { margin-left: auto; }
  .help-page.dark .lang-option { color: #e2e8f0; }
  .help-page.dark .lang-option:hover { background: #334155; }
  .help-page.dark .lang-option.active { background: #312e81; color: #a5b4fc; }

  .notification-wrapper { position: relative; }
  .notif-icon { position: relative; cursor: pointer; padding: 8px; border-radius: 8px; transition: background 0.2s; color: #374151; }
  .notif-icon:hover { background: #f3f4f6; }
  .help-page.dark .notif-icon { color: #e2e8f0; }
  .help-page.dark .notif-icon:hover { background: #334155; }
  .notif-badge { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 2px solid white; }
  .help-page.dark .notif-badge { border-color: #1e293b; }
  .notif-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 380px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); border: 1px solid #e5e7eb; z-index: 1000; opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s; }
  .notif-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
  .help-page.dark .notif-dropdown { background: #1e293b; border-color: #334155; }
  .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
  .help-page.dark .notif-header { border-color: #334155; }
  .notif-header h3 { font-size: 16px; font-weight: 700; color: #1a1a1a; }
  .help-page.dark .notif-header h3 { color: #f1f5f9; }
  .notif-header span { font-size: 12px; color: #090088; cursor: pointer; font-weight: 600; }
  .help-page.dark .notif-header span { color: #818cf8; }
  .notif-header span:hover { text-decoration: underline; }
  .notif-list { max-height: 400px; overflow-y: auto; }
  .notif-item { padding: 16px 20px; border-bottom: 1px solid #f3f4f6; display: flex; gap: 12px; cursor: pointer; transition: background 0.2s; align-items: flex-start; }
  .notif-item:hover { background: #f9fafb; }
  .notif-item.unread { background: #f0f9ff; }
  .notif-item.unread:hover { background: #e0f2fe; }
  .help-page.dark .notif-item { border-color: #334155; }
  .help-page.dark .notif-item:hover { background: #334155; }
  .help-page.dark .notif-item.unread { background: #1e3a5f; }
  .notif-item-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .notif-item-icon.success { background: #d1fae5; color: #059669; }
  .notif-item-icon.info { background: #dbeafe; color: #2563eb; }
  .notif-item-icon.warning { background: #fef3c7; color: #d97706; }
  .notif-item-content { flex: 1; min-width: 0; }
  .notif-item-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .help-page.dark .notif-item-title { color: #f1f5f9; }
  .notif-item-text { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
  .help-page.dark .notif-item-text { color: #94a3b8; }
  .notif-item-time { font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
  .unread-dot { width: 8px; height: 8px; background: #090088; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
  .notif-footer { padding: 12px 20px; text-align: center; border-top: 1px solid #e5e7eb; }
  .help-page.dark .notif-footer { border-color: #334155; }
  .notif-footer a { font-size: 14px; color: #090088; text-decoration: none; font-weight: 600; }
  .help-page.dark .notif-footer a { color: #818cf8; }
  .notif-footer a:hover { text-decoration: underline; }

  .user-profile { display: flex; align-items: center; gap: 12px; cursor: pointer; padding: 8px 12px; border-radius: 10px; transition: background 0.2s; text-decoration: none; }
  .user-profile:hover { background: #f3f4f6; }
  .help-page.dark .user-profile:hover { background: #334155; }
  .user-avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #090088, #1976d2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; flex-shrink: 0; }
  .user-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .help-page.dark .user-name { color: #f1f5f9; }
  .user-email { font-size: 12px; color: #6b7280; }
  .help-page.dark .user-email { color: #94a3b8; }

  .help-layout { display: flex; min-height: calc(100vh - 70px); }

  .sidebar { width: 260px; background: #ffffff; border-right: 1px solid #e5e7eb; padding: 24px 16px; flex-shrink: 0; }
  .help-page.dark .sidebar { background: #1e293b; border-color: #334155; }
  .sidebar-section { margin-bottom: 32px; }
  .sidebar-title { color: #6b7280; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding: 0 12px; }
  .help-page.dark .sidebar-title { color: #94a3b8; }
  .sidebar-menu { list-style: none; }
  .sidebar-menu li { margin-bottom: 4px; }
  .sidebar-menu a, .sidebar-logout { display: flex; align-items: center; gap: 12px; padding: 12px; color: #4b5563; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; transition: all 0.2s; cursor: pointer; background: none; border: none; width: 100%; font-family: inherit; }
  .sidebar-menu a:hover, .sidebar-logout:hover { background: #f3f4f6; color: #1a1a1a; }
  .sidebar-menu a.active { background: #ede9fe; color: #090088; font-weight: 600; }
  .help-page.dark .sidebar-menu a, .help-page.dark .sidebar-logout { color: #cbd5e1; }
  .help-page.dark .sidebar-menu a:hover, .help-page.dark .sidebar-logout:hover { background: #334155; color: #f1f5f9; }
  .help-page.dark .sidebar-menu a.active { background: #312e81; color: #a5b4fc; }
  .menu-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  .main-content { flex: 1; padding: 32px; overflow-y: auto; }
  .page-header { margin-bottom: 32px; }
  .page-header h1 { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
  .help-page.dark .page-header h1 { color: #f1f5f9; }
  .page-header p { font-size: 14px; color: #6b7280; }
  .help-page.dark .page-header p { color: #94a3b8; }

  .emergency-section { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 16px; padding: 32px; margin-bottom: 32px; color: white; display: flex; align-items: center; justify-content: space-between; }
  .emergency-content h2 { font-size: 22px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; color: white; }
  .emergency-content p { font-size: 14px; opacity: 0.9; color: white; }
  .emergency-btn { display: flex; align-items: center; gap: 12px; background: white; color: #dc2626; padding: 16px 32px; border-radius: 12px; font-size: 18px; font-weight: 700; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
  .emergency-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }

  .contact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 32px; }
  .contact-card { background: white; border-radius: 16px; padding: 28px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; transition: all 0.3s; text-align: center; }
  .contact-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); border-color: #090088; }
  .help-page.dark .contact-card { background: #1e293b; border-color: #334155; }
  .contact-icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  .contact-card h3 { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
  .help-page.dark .contact-card h3 { color: #f1f5f9; }
  .contact-card p { font-size: 13px; color: #6b7280; margin-bottom: 16px; line-height: 1.5; }
  .help-page.dark .contact-card p { color: #94a3b8; }
  .phone-number { font-size: 20px; font-weight: 700; color: #059669; margin-bottom: 8px; display: block; }
  .help-page.dark .phone-number { color: #34d399; }
  .availability { font-size: 12px; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 16px; }
  .contact-link { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; transition: all 0.2s; border: none; cursor: pointer; font-family: inherit; }
  .contact-link:hover { transform: scale(1.02); opacity: 0.9; }

  .ministry-section { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; margin-bottom: 32px; }
  .help-page.dark .ministry-section { background: #1e293b; border-color: #334155; }
  .section-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
  .help-page.dark .section-title { color: #f1f5f9; }
  .section-subtitle { color: #6b7280; font-size: 14px; margin-bottom: 20px; }
  .help-page.dark .section-subtitle { color: #94a3b8; }
  .ministry-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .ministry-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; transition: all 0.2s; }
  .ministry-card:hover { border-color: #090088; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .help-page.dark .ministry-card { background: #334155; border-color: #475569; }
  .help-page.dark .ministry-card:hover { border-color: #818cf8; }
  .ministry-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ministry-info { flex: 1; }
  .ministry-name { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .help-page.dark .ministry-name { color: #f1f5f9; }
  .ministry-phone { font-size: 13px; color: #059669; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 6px; }
  .ministry-phone:hover { color: #047857; text-decoration: underline; }
  .call-btn { width: 40px; height: 40px; border-radius: 10px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; text-decoration: none; transition: all 0.2s; flex-shrink: 0; }
  .call-btn:hover { background: #047857; transform: scale(1.1); }

  .faq-section { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
  .help-page.dark .faq-section { background: #1e293b; border-color: #334155; }
  .faq-item { border-bottom: 1px solid #e5e7eb; padding: 20px 0; }
  .faq-item:last-child { border-bottom: none; padding-bottom: 0; }
  .faq-item:first-child { padding-top: 0; }
  .help-page.dark .faq-item { border-color: #334155; }
  .faq-question { display: flex; align-items: center; justify-content: space-between; cursor: pointer; font-size: 15px; font-weight: 600; color: #1a1a1a; padding: 8px 0; transition: color 0.2s; }
  .faq-question:hover { color: #090088; }
  .help-page.dark .faq-question { color: #f1f5f9; }
  .help-page.dark .faq-question:hover { color: #a5b4fc; }
  .faq-toggle { width: 24px; height: 24px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: transform 0.2s; }
  .help-page.dark .faq-toggle { background: #334155; }
  .faq-toggle.open { transform: rotate(180deg); }
  .faq-answer { font-size: 14px; color: #6b7280; line-height: 1.7; margin-top: 8px; padding-right: 32px; }
  .help-page.dark .faq-answer { color: #94a3b8; }

  .chat-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: flex-end; justify-content: flex-end; padding: 32px; }
  .chat-widget { width: 400px; height: 600px; background: white; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
  .help-page.dark .chat-widget { background: #1e293b; }
  .chat-header { background: linear-gradient(135deg, #090088, #1976d2); padding: 16px 20px; display: flex; align-items: center; gap: 12px; color: white; }
  .chat-header-avatar { position: relative; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .online-dot { position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background: #22c55e; border: 2px solid white; border-radius: 50%; }
  .chat-header-info { flex: 1; }
  .chat-header-title { font-size: 16px; font-weight: 700; }
  .chat-header-status { font-size: 12px; opacity: 0.9; }
  .chat-close-btn { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .chat-close-btn:hover { background: rgba(255,255,255,0.3); transform: scale(1.1); }
  .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; background: #f8fafc; }
  .help-page.dark .chat-messages { background: #0f172a; }
  @keyframes msgIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .chat-message { display: flex; gap: 10px; max-width: 85%; animation: msgIn 0.3s ease; }
  .chat-message.user { align-self: flex-end; flex-direction: row-reverse; }
  .chat-msg-avatar { width: 32px; height: 32px; border-radius: 50%; background: #090088; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .chat-message.user .chat-msg-avatar { background: linear-gradient(135deg, #090088, #1976d2); }
  .chat-msg-content { display: flex; flex-direction: column; gap: 4px; }
  .chat-bubble { padding: 12px 16px; border-radius: 18px; font-size: 14px; line-height: 1.5; white-space: pre-line; }
  .chat-message.bot .chat-bubble { background: white; color: #1a1a1a; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; }
  .chat-message.user .chat-bubble { background: #090088; color: white; border-bottom-right-radius: 4px; }
  .help-page.dark .chat-message.bot .chat-bubble { background: #1e293b; color: #e2e8f0; border-color: #334155; }
  .chat-msg-time { font-size: 11px; color: #9ca3af; padding: 0 4px; }
  .chat-message.user .chat-msg-time { text-align: right; }
  .quick-replies { padding: 8px 16px; background: white; border-top: 1px solid #f3f4f6; display: flex; gap: 8px; flex-wrap: wrap; }
  .help-page.dark .quick-replies { background: #1e293b; border-color: #334155; }
  .quick-reply-btn { padding: 6px 12px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 20px; font-size: 12px; color: #374151; cursor: pointer; font-weight: 500; font-family: inherit; transition: all 0.2s; }
  .quick-reply-btn:hover { background: #ede9fe; border-color: #090088; color: #090088; }
  .help-page.dark .quick-reply-btn { background: #334155; border-color: #475569; color: #cbd5e1; }
  .chat-input-area { padding: 16px 20px; background: white; border-top: 1px solid #e5e7eb; }
  .help-page.dark .chat-input-area { background: #1e293b; border-color: #334155; }
  .chat-input-wrapper { display: flex; gap: 12px; align-items: flex-end; }
  .chat-input { flex: 1; padding: 12px 16px; border: 1.5px solid #e5e7eb; border-radius: 24px; font-size: 14px; font-family: inherit; resize: none; max-height: 100px; outline: none; transition: border-color 0.2s; background: white; color: #1a1a1a; }
  .chat-input:focus { border-color: #090088; }
  .help-page.dark .chat-input { background: #0f172a; border-color: #334155; color: #e2e8f0; }
  .chat-send-btn { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #090088, #1976d2); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
  .chat-send-btn:hover { transform: scale(1.05); }
  .typing-indicator { display: flex; gap: 4px; padding: 12px 16px; background: white; border-radius: 18px; border: 1px solid #e5e7eb; width: fit-content; }
  .typing-dot { width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: typingBounce 1.4s infinite ease-in-out; }
  .typing-dot:nth-child(1) { animation-delay: 0s; }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-4px); } }
  .chat-fab { position: fixed; bottom: 32px; right: 32px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #090088, #1976d2); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(9,0,136,0.4); z-index: 999; transition: transform 0.2s; }
  .chat-fab:hover { transform: scale(1.1); }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
`;

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'bot', text: "Hello! 👋 Welcome to GovCare+ support. I'm here to help you with your complaints and inquiries. How can I assist you today?", time: 'Just now' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const langRef = useRef(null);
  const notifRef = useRef(null);
  const messagesEndRef = useRef(null);

  const t = translations[language];
  const meta = langMeta[language];

  const displayName = currentUser?.displayName || 'User';
  const email = currentUser?.email || '';
  const initials = displayName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    const savedLang = localStorage.getItem('govcare-language') || 'en';
    setLanguage(savedLang);
  }, []);

  // Auth + real-time notifications from Firebase complaints
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) return;
      setCurrentUser(user);

      const q = query(
        collection(db, 'complaints'),
        where('citizenId', '==', user.uid)
      );

      const unsubSnap = onSnapshot(q, snap => {
        // Read which notif IDs have been marked read from localStorage
        const readIds = JSON.parse(localStorage.getItem('govcare-read-notifs') || '[]');

        const notifs = [];
        snap.docs.forEach(d => {
          const c = { docId: d.id, ...d.data() };

          // Generate a notification based on status
          let type = 'info', title = '', text = '';

          if (c.status === 'Resolved') {
            type = 'success';
            title = 'Complaint Resolved';
            text = `Your complaint ${c.id} has been resolved successfully.`;
          } else if (c.status === 'In Progress') {
            type = 'info';
            title = 'Complaint In Progress';
            text = `${c.ministryLabel || c.ministry} is working on complaint ${c.id}.`;
          } else if (c.status === 'Pending Review') {
            type = 'warning';
            title = 'Under Review';
            text = `Complaint ${c.id} is being reviewed by ${c.ministryLabel || c.ministry}.`;
          } else if (c.status === 'Rejected') {
            type = 'error';
            title = 'Complaint Rejected';
            text = `Your complaint ${c.id} could not be processed.`;
          } else {
            // Submitted — just a basic acknowledgment
            type = 'info';
            title = 'Complaint Submitted';
            text = `Your complaint ${c.id} has been received and is awaiting review.`;
          }

          // Time formatting
          const timeAgo = (dateStr) => {
            if (!dateStr) return '';
            const days = Math.floor((new Date() - new Date(dateStr)) / 86400000);
            if (days === 0) return 'Today';
            if (days === 1) return '1 day ago';
            return `${days} days ago`;
          };

          notifs.push({
            id: `${c.docId}-${c.status}`,
            type,
            title,
            text,
            time: timeAgo(c.date),
            unread: !readIds.includes(`${c.docId}-${c.status}`),
          });
        });

        // Sort: unread first, then by most recent
        notifs.sort((a, b) => (b.unread - a.unread));
        setNotifications(notifs.slice(0, 10)); // max 10
      });

      return () => unsubSnap();
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('govcare-theme', next ? 'dark' : 'light');
  }

  function changeLanguage(lang) {
    setLanguage(lang);
    setLangOpen(false);
    localStorage.setItem('govcare-language', lang);
  }

  function markAllRead() {
    const allIds = notifications.map(n => n.id);
    const existing = JSON.parse(localStorage.getItem('govcare-read-notifs') || '[]');
    localStorage.setItem('govcare-read-notifs', JSON.stringify([...new Set([...existing, ...allIds])]));
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem('govcare-user');
    navigate('/');
  }

  function handleSendMessage(text) {
    const msg = text || chatInput.trim();
    if (!msg) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setChatMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: msg, time: now }]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const response = getBotResponse(msg);
      setChatMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: response, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) }]);
    }, 1000 + Math.random() * 1000);
  }

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <style>{css}</style>
      <div className={`help-page${darkMode ? ' dark' : ''}`}>

        {/* Top Nav */}
        <div className="top-nav">
          <div className="nav-left">
            <Link to="/dashboard" className="logo-container">
              <div className="jata-negara"><img src="/pictures/Malaysia.svg" alt="Jata Negara Malaysia" /></div>
              <div className="brand-name">GovCare+</div>
            </Link>
          </div>
          <div className="nav-right">

            {/* Theme Toggle */}
            <button className="theme-toggle" onClick={toggleDark} title="Toggle Dark/Light Mode">
              {darkMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>

            {/* Language */}
            <div className="language-wrapper" ref={langRef}>
              <div className="language-btn" onClick={() => { setLangOpen(!langOpen); setNotifOpen(false); }}>
                <span>{meta.flag}</span><span>{meta.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div className={`lang-dropdown${langOpen ? ' open' : ''}`}>
                {Object.entries(langMeta).map(([code, { flag, label }]) => (
                  <div key={code} className={`lang-option${language === code ? ' active' : ''}`} onClick={() => changeLanguage(code)}>
                    <span>{flag}</span>
                    <span>{label === 'EN' ? 'English' : label === 'BM' ? 'Bahasa Melayu' : label}</span>
                    {language === code && <svg className="check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div className="notification-wrapper" ref={notifRef}>
              <div className="notif-icon" onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false); }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && <div className="notif-badge"></div>}
              </div>
              <div className={`notif-dropdown${notifOpen ? ' open' : ''}`}>
                <div className="notif-header">
                  <h3>{t.notifications}</h3>
                  <span onClick={markAllRead}>{t.markAllRead}</span>
                </div>
                <div className="notif-list">
                  {notifications.length === 0 ? (
                    <div style={{textAlign:'center', padding:'24px 16px', color:'#9ca3af', fontSize:'13px'}}>
                      No notifications yet
                    </div>
                  ) : notifications.map(n => (
                    <div key={n.id} className={`notif-item${n.unread ? ' unread' : ''}`} onClick={() => {
                      // Mark this one as read
                      const existing = JSON.parse(localStorage.getItem('govcare-read-notifs') || '[]');
                      localStorage.setItem('govcare-read-notifs', JSON.stringify([...new Set([...existing, n.id])]));
                      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
                      navigate('/track-status');
                    }}>
                      <div className={`notif-item-icon ${n.type}`}>{notifIconMap[n.type]}</div>
                      <div className="notif-item-content">
                        <div className="notif-item-title">{n.title}</div>
                        <div className="notif-item-text">{n.text}</div>
                        <div className="notif-item-time">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {n.time}
                        </div>
                      </div>
                      {n.unread && <div className="unread-dot"></div>}
                    </div>
                  ))}
                </div>
                <div className="notif-footer">
                  <Link to="/track-status">{t.viewAllNotifications}</Link>
                </div>
              </div>
            </div>

            {/* User Profile */}
            <Link to="/profile" className="user-profile">
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <div className="user-name">{displayName}</div>
                <div className="user-email">{email}</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Layout */}
        <div className="help-layout">

          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">{t.menu}</div>
              <ul className="sidebar-menu">
                <li>
                  <Link to="/dashboard">
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></span>
                    {t.home}
                  </Link>
                </li>
                <li>
                  <Link to="/submit-complaint">
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                    {t.submitComplaint}
                  </Link>
                </li>
                <li>
                  <Link to="/track-status">
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></span>
                    {t.trackStatus}
                  </Link>
                </li>
                <li>
                  <Link to="/profile">
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                    {t.profile}
                  </Link>
                </li>
              </ul>
            </div>
            <div className="sidebar-section">
              <div className="sidebar-title">{t.support}</div>
              <ul className="sidebar-menu">
                <li>
                  <Link to="/help-center" className="active">
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                    {t.helpCenter}
                  </Link>
                </li>
                <li>
                  <button className="sidebar-logout" onClick={handleLogout}>
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
                    {t.logout}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="main-content">
            <div className="page-header">
              <h1>{t.helpCenterTitle}</h1>
              <p>{t.helpCenterDesc}</p>
            </div>

            {/* Emergency */}
            <div className="emergency-section">
              <div className="emergency-content">
                <h2>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  {t.emergencyHotline}
                </h2>
                <p>{t.emergencyDesc}</p>
              </div>
              <a href="tel:999" className="emergency-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                {t.callEmergency}
              </a>
            </div>

            {/* Contact Cards */}
            <div className="contact-grid">
              <div className="contact-card">
                <div className="contact-icon" style={{ background: '#d1fae5' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <h3>{t.generalHotline}</h3>
                <span className="phone-number">1-800-88-7080</span>
                <span className="availability" style={{ background: '#d1fae5', color: '#10b981' }}>{t.available24}</span>
                <p>{t.hotlineDesc}</p>
                <a href="tel:1800887080" className="contact-link" style={{ background: '#059669', color: 'white' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  {t.callNow}
                </a>
              </div>

              <div className="contact-card">
                <div className="contact-icon" style={{ background: '#dbeafe' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <h3>{t.emailSupport}</h3>
                <span className="phone-number" style={{ color: '#2563eb', fontSize: 15 }}>support@govcare.gov.my</span>
                <span className="availability" style={{ background: '#dbeafe', color: '#1e40af' }}>{t.responseTime}</span>
                <p>{t.emailDesc}</p>
                <a href="mailto:support@govcare.gov.my" className="contact-link" style={{ background: '#2563eb', color: 'white' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  {t.sendEmail}
                </a>
              </div>

              <div className="contact-card">
                <div className="contact-icon" style={{ background: '#fef3c7' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <h3>{t.liveChat}</h3>
                <span className="phone-number" style={{ color: '#d97706' }}>{t.chatWithUs}</span>
                <span className="availability" style={{ background: '#fef3c7', color: '#92400e' }}>{t.chatHours}</span>
                <p>{t.chatDesc}</p>
                <button className="contact-link" style={{ background: '#d97706', color: 'white' }} onClick={() => setChatOpen(true)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {t.startChat}
                </button>
              </div>
            </div>

            {/* Ministry Direct Lines */}
            <div className="ministry-section">
              <div className="section-title">{t.ministryLines}</div>
              <div className="section-subtitle">{t.clickToCall}</div>
              <div className="ministry-grid">
                {ministries.map((m, i) => (
                  <div key={i} className="ministry-card">
                    <div className="ministry-icon" style={{ background: m.bg }}>
                      <MinistryIcon type={m.iconType} color={m.iconColor} />
                    </div>
                    <div className="ministry-info">
                      <div className="ministry-name">{m.name}</div>
                      <a href={`tel:${m.phone}`} className="ministry-phone">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        {m.display}
                      </a>
                    </div>
                    <a href={`tel:${m.phone}`} className="call-btn" title={`Call ${m.name}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div className="faq-section">
              <div className="section-title" style={{ marginBottom: 20 }}>{t.faqTitle}</div>
              {faqs.map((faq, i) => (
                <div key={i} className="faq-item">
                  <div className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    <span>{faq.q}</span>
                    <div className={`faq-toggle${openFaq === i ? ' open' : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  {openFaq === i && <div className="faq-answer">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat FAB */}
        {!chatOpen && (
          <button className="chat-fab" onClick={() => setChatOpen(true)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        )}

        {/* Chat Overlay */}
        {chatOpen && (
          <div className="chat-overlay" onClick={() => setChatOpen(false)}>
            <div className="chat-widget" onClick={e => e.stopPropagation()}>
              <div className="chat-header">
                <div className="chat-header-avatar">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <div className="online-dot"></div>
                </div>
                <div className="chat-header-info">
                  <div className="chat-header-title">GovCare+ Support</div>
                  <div className="chat-header-status"><span style={{ color: '#22c55e' }}>●</span> Online now</div>
                </div>
                <button className="chat-close-btn" onClick={() => setChatOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="chat-messages">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`chat-message ${msg.sender}`}>
                    <div className="chat-msg-avatar">
                      {msg.sender === 'bot'
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      }
                    </div>
                    <div className="chat-msg-content">
                      <div className="chat-bubble">{msg.text}</div>
                      <div className="chat-msg-time">{msg.time}</div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="chat-message bot">
                    <div className="chat-msg-avatar">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    </div>
                    <div className="typing-indicator">
                      <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="quick-replies">
                {['Submit complaint', 'Track status', 'Response times', 'Human agent'].map(r => (
                  <button key={r} className="quick-reply-btn" onClick={() => handleSendMessage(r)}>{r}</button>
                ))}
              </div>

              <div className="chat-input-area">
                <div className="chat-input-wrapper">
                  <textarea
                    className="chat-input"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Type your message..."
                    rows={1}
                  />
                  <button className="chat-send-btn" onClick={() => handleSendMessage()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
