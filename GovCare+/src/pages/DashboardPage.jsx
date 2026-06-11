import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { decryptFields } from '../crypto';

const translations = {
  en: {
    welcomeBack: 'Welcome back', overview: "Here's an overview of your complaint activity",
    totalSubmitted: 'Total Submitted', pendingReview: 'Pending Review',
    inProgress: 'In Progress', resolved: 'Resolved',
    newComplaintQuestion: 'Have a new complaint?',
    submitRoute: "Submit your complaint and we'll route it to the right ministry",
    submitNewComplaint: 'Submit New Complaint',
    recentActivity: 'Recent Activity', viewAll: 'View All →',
    menu: 'Menu', home: 'Home', submitComplaint: 'Submit Complaint',
    trackStatus: 'Track Status', profile: 'Profile',
    support: 'Support', helpCenter: 'Help Center', faq: 'FAQ', logout: 'Logout',
    notifications: 'Notifications', markAllRead: 'Mark all as read',
    viewAllNotifications: 'View all notifications',
    inProgressBadge: 'In Progress', pendingBadge: 'Pending Review',
    resolvedBadge: 'Resolved', submittedBadge: 'Submitted',
  },
  ms: {
    welcomeBack: 'Selamat kembali', overview: 'Berikut adalah gambaran keseluruhan aktiviti aduan anda',
    totalSubmitted: 'Jumlah Dihantar', pendingReview: 'Menunggu Semakan',
    inProgress: 'Dalam Proses', resolved: 'Selesai',
    newComplaintQuestion: 'Ada aduan baru?',
    submitRoute: 'Hantar aduan anda dan kami akan menghalakannya ke kementerian yang betul',
    submitNewComplaint: 'Hantar Aduan Baru',
    recentActivity: 'Aktiviti Terkini', viewAll: 'Lihat Semua →',
    menu: 'Menu', home: 'Utama', submitComplaint: 'Hantar Aduan',
    trackStatus: 'Jejak Status', profile: 'Profil',
    support: 'Sokongan', helpCenter: 'Pusat Bantuan', faq: 'Soalan Lazim', logout: 'Log Keluar',
    notifications: 'Pemberitahuan', markAllRead: 'Tandakan semua dibaca',
    viewAllNotifications: 'Lihat semua pemberitahuan',
    inProgressBadge: 'Dalam Proses', pendingBadge: 'Menunggu Semakan',
    resolvedBadge: 'Selesai', submittedBadge: 'Dihantar',
  },
  zh: {
    welcomeBack: '欢迎回来', overview: '以下是您投诉活动的概况',
    totalSubmitted: '已提交总数', pendingReview: '待审核',
    inProgress: '进行中', resolved: '已解决',
    newComplaintQuestion: '有新投诉？',
    submitRoute: '提交您的投诉，我们将其转至相关部门',
    submitNewComplaint: '提交新投诉',
    recentActivity: '最近活动', viewAll: '查看全部 →',
    menu: '菜单', home: '首页', submitComplaint: '提交投诉',
    trackStatus: '跟踪状态', profile: '个人资料',
    support: '支持', helpCenter: '帮助中心', faq: '常见问题', logout: '登出',
    notifications: '通知', markAllRead: '全部标为已读',
    viewAllNotifications: '查看所有通知',
    inProgressBadge: '进行中', pendingBadge: '待审核',
    resolvedBadge: '已解决', submittedBadge: '已提交',
  },
  ta: {
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்', overview: 'உங்கள் புகார் நடவடிக்கையின் கண்ணோட்டம் இங்கே',
    totalSubmitted: 'மொத்தம் சமர்ப்பிக்கப்பட்டது', pendingReview: 'மதிப்பாய்வு நிலுவையில்',
    inProgress: 'செயல்பாட்டில்', resolved: 'தீர்க்கப்பட்டது',
    newComplaintQuestion: 'புதிய புகார் உள்ளதா?',
    submitRoute: 'உங்கள் புகாரை சமர்ப்பிக்கவும், சரியான அமைச்சகத்திற்கு அனுப்புவோம்',
    submitNewComplaint: 'புதிய புகார் சமர்ப்பிக்க',
    recentActivity: 'சமீபத்திய நடவடிக்கை', viewAll: 'அனைத்தையும் காண →',
    menu: 'மெனு', home: 'முகப்பு', submitComplaint: 'புகார் சமர்ப்பி',
    trackStatus: 'நிலையை கண்காணி', profile: 'சுயவிவரம்',
    support: 'ஆதரவு', helpCenter: 'உதவி மையம்', faq: 'அடிக்கடி கேட்கும் கேள்விகள்', logout: 'வெளியேறு',
    notifications: 'அறிவிப்புகள்', markAllRead: 'அனைத்தையும் படித்ததாக குறி',
    viewAllNotifications: 'அனைத்து அறிவிப்புகளையும் காண்க',
    inProgressBadge: 'செயல்பாட்டில்', pendingBadge: 'மதிப்பாய்வு நிலுவையில்',
    resolvedBadge: 'தீர்க்கப்பட்டது', submittedBadge: 'சமர்ப்பிக்கப்பட்டது',
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
  body { font-family: 'Inter', sans-serif; }

  .dashboard-page { font-family: 'Inter', sans-serif; background: #f9fafb; min-height: 100vh; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
  .dashboard-page.dark { background: #0f172a; color: #e2e8f0; }

  /* Top Nav */
  .top-nav {
    background: #ffffff; height: 70px; border-bottom: 1px solid #e5e7eb;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; position: sticky; top: 0; z-index: 100;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .dashboard-page.dark .top-nav { background: #1e293b; border-color: #334155; }
  .nav-left { display: flex; align-items: center; gap: 16px; }
  .logo-container { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .jata-negara { width: 36px; height: 36px; }
  .jata-negara img { width: 100%; height: 100%; object-fit: contain; }
  .brand-name { color: #090088; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .dashboard-page.dark .brand-name { color: #ffffff; }
  .nav-right { display: flex; align-items: center; gap: 16px; }

  /* Theme Toggle */
  .theme-toggle {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; background: #f3f4f6; border: 1px solid #e5e7eb;
    border-radius: 10px; cursor: pointer; transition: all 0.2s; color: #374151;
  }
  .theme-toggle:hover { background: #e5e7eb; }
  .dashboard-page.dark .theme-toggle { background: #334155; border-color: #475569; color: #fbbf24; }
  .dashboard-page.dark .theme-toggle:hover { background: #475569; }

  /* Language */
  .language-wrapper { position: relative; }
  .language-btn {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 500; color: #374151; transition: all 0.2s;
  }
  .language-btn:hover { background: #e5e7eb; }
  .dashboard-page.dark .language-btn { background: #334155; border-color: #475569; color: #e2e8f0; }
  .dashboard-page.dark .language-btn:hover { background: #475569; }
  .lang-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0; width: 180px;
    background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border: 1px solid #e5e7eb; z-index: 1000; overflow: hidden;
    opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s;
  }
  .lang-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
  .dashboard-page.dark .lang-dropdown { background: #1e293b; border-color: #334155; }
  .lang-option {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    cursor: pointer; font-size: 14px; color: #374151; transition: background 0.2s;
  }
  .lang-option:hover { background: #f3f4f6; }
  .lang-option.active { background: #ede9fe; color: #090088; font-weight: 600; }
  .lang-option .check { margin-left: auto; }
  .dashboard-page.dark .lang-option { color: #e2e8f0; }
  .dashboard-page.dark .lang-option:hover { background: #334155; }
  .dashboard-page.dark .lang-option.active { background: #312e81; color: #a5b4fc; }

  /* Notification */
  .notification-wrapper { position: relative; }
  .notif-icon {
    position: relative; cursor: pointer; padding: 8px; border-radius: 8px;
    transition: background 0.2s; color: #374151;
  }
  .notif-icon:hover { background: #f3f4f6; }
  .dashboard-page.dark .notif-icon { color: #e2e8f0; }
  .dashboard-page.dark .notif-icon:hover { background: #334155; }
  .notif-badge {
    position: absolute; top: 6px; right: 6px; width: 8px; height: 8px;
    background: #ef4444; border-radius: 50%; border: 2px solid white;
  }
  .dashboard-page.dark .notif-badge { border-color: #1e293b; }
  .notif-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0; width: 380px;
    background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border: 1px solid #e5e7eb; z-index: 1000;
    opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s;
  }
  .notif-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
  .dashboard-page.dark .notif-dropdown { background: #1e293b; border-color: #334155; }
  .notif-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 20px; border-bottom: 1px solid #e5e7eb;
  }
  .dashboard-page.dark .notif-header { border-color: #334155; }
  .notif-header h3 { font-size: 16px; font-weight: 700; color: #1a1a1a; }
  .dashboard-page.dark .notif-header h3 { color: #f1f5f9; }
  .notif-header span { font-size: 12px; color: #090088; cursor: pointer; font-weight: 600; }
  .dashboard-page.dark .notif-header span { color: #818cf8; }
  .notif-header span:hover { text-decoration: underline; }
  .notif-list { max-height: 400px; overflow-y: auto; }
  .notif-item {
    padding: 16px 20px; border-bottom: 1px solid #f3f4f6;
    display: flex; gap: 12px; cursor: pointer; transition: background 0.2s; align-items: flex-start;
  }
  .notif-item:hover { background: #f9fafb; }
  .notif-item.unread { background: #f0f9ff; }
  .notif-item.unread:hover { background: #e0f2fe; }
  .dashboard-page.dark .notif-item { border-color: #334155; }
  .dashboard-page.dark .notif-item:hover { background: #334155; }
  .dashboard-page.dark .notif-item.unread { background: #1e3a5f; }
  .notif-item-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .notif-item-icon.success { background: #d1fae5; color: #059669; }
  .notif-item-icon.info { background: #dbeafe; color: #2563eb; }
  .notif-item-icon.warning { background: #fef3c7; color: #d97706; }
  .notif-item-icon.error { background: #fee2e2; color: #dc2626; }
  .notif-item-icon.note  { background: #ede9fe; color: #7c3aed; }
  .notif-item-content { flex: 1; min-width: 0; }
  .notif-item-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .dashboard-page.dark .notif-item-title { color: #f1f5f9; }
  .notif-item-text { font-size: 13px; color: #6b7280; margin-bottom: 6px; }
  .dashboard-page.dark .notif-item-text { color: #94a3b8; }
  .notif-item-time { font-size: 12px; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
  .dashboard-page.dark .notif-item-time { color: #64748b; }
  .unread-dot { width: 8px; height: 8px; background: #090088; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
  .notif-footer { padding: 12px 20px; text-align: center; border-top: 1px solid #e5e7eb; }
  .dashboard-page.dark .notif-footer { border-color: #334155; }
  .notif-footer a { font-size: 14px; color: #090088; text-decoration: none; font-weight: 600; }
  .dashboard-page.dark .notif-footer a { color: #818cf8; }
  .notif-footer a:hover { text-decoration: underline; }

  /* User Profile */
  .user-profile {
    display: flex; align-items: center; gap: 12px; cursor: pointer;
    padding: 8px 12px; border-radius: 10px; transition: background 0.2s; text-decoration: none;
  }
  .user-profile:hover { background: #f3f4f6; }
  .dashboard-page.dark .user-profile:hover { background: #334155; }
  .user-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, #090088, #1976d2);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;
  }
  .user-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .dashboard-page.dark .user-name { color: #f1f5f9; }
  .user-email { font-size: 12px; color: #6b7280; }
  .dashboard-page.dark .user-email { color: #94a3b8; }

  /* Layout */
  .dashboard-layout { display: flex; min-height: calc(100vh - 70px); }

  /* Sidebar */
  .sidebar {
    width: 260px; background: #ffffff; border-right: 1px solid #e5e7eb; padding: 24px 16px; flex-shrink: 0;
  }
  .dashboard-page.dark .sidebar { background: #1e293b; border-color: #334155; }
  .sidebar-section { margin-bottom: 32px; }
  .sidebar-title {
    color: #6b7280; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding: 0 12px;
  }
  .dashboard-page.dark .sidebar-title { color: #94a3b8; }
  .sidebar-menu { list-style: none; }
  .sidebar-menu li { margin-bottom: 4px; }
  .sidebar-menu a {
    display: flex; align-items: center; gap: 12px; padding: 12px; color: #4b5563;
    text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;
    transition: all 0.2s; cursor: pointer; background: none; border: none; width: 100%;
    font-family: inherit;
  }
  .sidebar-menu a:hover { background: #f3f4f6; color: #1a1a1a; }
  .sidebar-menu a.active { background: #ede9fe; color: #090088; font-weight: 600; }
  .dashboard-page.dark .sidebar-menu a { color: #cbd5e1; }
  .dashboard-page.dark .sidebar-menu a:hover { background: #334155; color: #f1f5f9; }
  .dashboard-page.dark .sidebar-menu a.active { background: #312e81; color: #a5b4fc; }
  .sidebar-logout {
    display: flex; align-items: center; gap: 12px; padding: 12px;
    width: 100%; border: none; font-family: inherit; cursor: pointer;
    font-size: 14px; font-weight: 500; border-radius: 8px; text-align: left;
    transition: all 0.2s;
    color: #ef4444; background: rgba(239,68,68,0.08);
  }
  .sidebar-logout:hover { background: rgba(239,68,68,0.15); color: #dc2626; }
  .dashboard-page.dark .sidebar-logout { color: #f87171; background: rgba(239,68,68,0.1); }
  .dashboard-page.dark .sidebar-logout:hover { background: rgba(239,68,68,0.2); color: #f87171; }
  .menu-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  /* Main Content */
  .main-content { flex: 1; padding: 32px; overflow-y: auto; }
  .page-header { margin-bottom: 32px; }
  .page-header h1 { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
  .dashboard-page.dark .page-header h1 { color: #f1f5f9; }
  .page-header p { font-size: 14px; color: #6b7280; }
  .dashboard-page.dark .page-header p { color: #94a3b8; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 32px; }
  .stat-card {
    background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;
    padding: 20px; transition: all 0.2s;
  }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .dashboard-page.dark .stat-card { background: #1e293b; border-color: #334155; }
  .stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .stat-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
  }
  .stat-icon.blue { background: #dbeafe; color: #1976d2; }
  .stat-icon.orange { background: #fed7aa; color: #f97316; }
  .stat-icon.green { background: #d1fae5; color: #10b981; }
  .stat-icon.purple { background: #e9d5ff; color: #a855f7; }
  .stat-trend { font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 6px; }
  .stat-trend.up { background: #dcfce7; color: #16a34a; }
  .stat-trend.neutral { background: #f3f4f6; color: #6b7280; }
  .stat-number { font-size: 32px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
  .dashboard-page.dark .stat-number { color: #f1f5f9; }
  .stat-label { font-size: 13px; color: #6b7280; font-weight: 500; }

  /* Submit Section */
  .submit-section {
    background: linear-gradient(135deg, #090088 0%, #1976d2 100%);
    border-radius: 16px; padding: 32px; margin-bottom: 32px;
    color: white; display: flex; justify-content: space-between; align-items: center;
  }
  .submit-content h2 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: white; }
  .submit-content p { font-size: 14px; opacity: 0.9; color: white; }
  .btn-submit {
    padding: 14px 32px; background: white; color: #090088; border: none;
    border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer;
    transition: all 0.2s; font-family: inherit; display: flex; align-items: center; gap: 8px; flex-shrink: 0;
  }
  .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
  .dashboard-page.dark .btn-submit { background: #818cf8; color: #0f172a; }
  .dashboard-page.dark .btn-submit:hover { background: #a5b4fc; }

  /* Activity Section */
  .activity-section {
    background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px;
  }
  .dashboard-page.dark .activity-section { background: #1e293b; border-color: #334155; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .section-header h2 { font-size: 18px; font-weight: 700; color: #1a1a1a; }
  .dashboard-page.dark .section-header h2 { color: #f1f5f9; }
  .view-all { color: #090088; text-decoration: none; font-size: 14px; font-weight: 600; transition: color 0.2s; }
  .view-all:hover { color: #070066; }
  .dashboard-page.dark .view-all { color: #818cf8; }
  .activity-list { display: flex; flex-direction: column; gap: 12px; }
  .activity-item {
    border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; cursor: pointer;
    transition: all 0.2s; display: flex; align-items: center; gap: 16px;
  }
  .activity-item:hover { background: #f9fafb; border-color: #090088; transform: translateX(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
  .dashboard-page.dark .activity-item { border-color: #334155; }
  .dashboard-page.dark .activity-item:hover { background: #334155; }
  .activity-icon {
    width: 48px; height: 48px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 20px;
  }
  .activity-content { flex: 1; }
  .activity-title { font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
  .dashboard-page.dark .activity-title { color: #f1f5f9; }
  .activity-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #6b7280; }
  .dashboard-page.dark .activity-meta { color: #94a3b8; }
  .activity-id { font-weight: 600; color: #090088; }
  .dashboard-page.dark .activity-id { color: #94a3b8; }
  .activity-date { display: flex; align-items: center; gap: 4px; }
  .activity-status { margin-left: auto; flex-shrink: 0; }
  .status-badge { padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .status-badge.submitted { background: #dbeafe; color: #1976d2; }
  .status-badge.pending-review { background: #fed7aa; color: #ea580c; }
  .status-badge.in-progress { background: #d1fae5; color: #059669; }
  .status-badge.resolved { background: #e9d5ff; color: #9333ea; }
  .status-badge.rejected { background: #fee2e2; color: #dc2626; }

  /* Skeleton loader */
  @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  .skeleton { border-radius: 6px; background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 400px 100%; animation: shimmer 1.4s infinite; }
  .dashboard-page.dark .skeleton { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%); background-size: 400px 100%; }
  .skeleton-num { height: 36px; width: 48px; margin-bottom: 8px; }
  .skeleton-label { height: 14px; width: 80px; }
  .skeleton-item { height: 72px; border-radius: 12px; margin-bottom: 12px; }

  /* System Log Section */
  .log-section {
    background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; margin-top: 24px;
  }
  .dashboard-page.dark .log-section { background: #1e293b; border-color: #334155; }
  .log-item {
    display: flex; align-items: center; gap: 16px; padding: 12px 0;
    border-bottom: 1px solid #f3f4f6; font-size: 13px;
  }
  .log-item:last-child { border-bottom: none; }
  .dashboard-page.dark .log-item { border-color: #334155; }
  .log-icon {
    width: 36px; height: 36px; border-radius: 8px; background: #dbeafe; color: #1976d2;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .log-event { font-weight: 600; color: #1a1a1a; margin-bottom: 2px; }
  .dashboard-page.dark .log-event { color: #f1f5f9; }
  .log-meta { color: #6b7280; font-size: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
  .dashboard-page.dark .log-meta { color: #94a3b8; }

  /* Empty state */
  .empty-state { text-align: center; padding: 48px 24px; color: #9ca3af; }
  .empty-state svg { margin-bottom: 12px; opacity: 0.4; }
  .empty-state p { font-size: 14px; }

  /* FAQ Banner */
  .faq-banner {
    background: white; border: 1px solid #e5e7eb; border-radius: 12px;
    padding: 20px 24px; margin-bottom: 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    transition: box-shadow 0.2s;
  }
  .faq-banner:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
  .dashboard-page.dark .faq-banner { background: #1e293b; border-color: #334155; }
  .faq-banner-left { display: flex; align-items: center; gap: 16px; }
  .faq-banner-icon {
    width: 44px; height: 44px; border-radius: 10px; flex-shrink: 0;
    background: #ede9fe; display: flex; align-items: center; justify-content: center; font-size: 20px;
  }
  .faq-banner-title { font-size: 15px; font-weight: 700; color: #1a1a1a; margin-bottom: 3px; }
  .dashboard-page.dark .faq-banner-title { color: #f1f5f9; }
  .faq-banner-sub { font-size: 13px; color: #6b7280; line-height: 1.5; }
  .dashboard-page.dark .faq-banner-sub { color: #94a3b8; }
  .faq-banner-btn {
    padding: 10px 20px; background: #090088; color: white; border: none;
    border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
    transition: all 0.2s; font-family: inherit; display: flex; align-items: center; gap: 7px; flex-shrink: 0;
  }
  .faq-banner-btn:hover { background: #070066; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(9,0,136,0.25); }
  .dashboard-page.dark .faq-banner-btn { background: #818cf8; color: #0f172a; }
  .dashboard-page.dark .faq-banner-btn:hover { background: #a5b4fc; }
`;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  const langRef = useRef(null);
  const notifRef = useRef(null);
  const t = translations[language];
  const meta = langMeta[language];

  // Derive display values from currentUser state
  const displayName = currentUser?.displayName || 'User';
  const email = currentUser?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Load theme/language preferences
  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    setLanguage(localStorage.getItem('govcare-language') || 'en');
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (!user) { setLoading(false); setComplaints([]); return; }

      // Activity logs (not encrypted — direct Firestore read is fine)
      const qLogs = query(collection(db, 'activityLogs'), where('userId', '==', user.uid));
      const unsubLogs = onSnapshot(qLogs, snap => {
        setActivityLogs(snap.docs.map(d => ({ docId: d.id, ...d.data() }))
          .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0)));
      });

      // Real-time complaints — decrypt each document client-side
      const qC = query(collection(db, 'complaints'), where('citizenId', '==', user.uid));
      const unsubC = onSnapshot(qC, async snap => {
        const data = await Promise.all(snap.docs.map(async d => {
          const raw = d.data();
          const dec = await decryptFields(raw, ['title', 'description', 'citizenName', 'citizenEmail']);
          return {
            docId:         d.id,
            id:            raw.id || d.id,
            title:         dec.title,
            description:   dec.description,
            citizenName:   dec.citizenName,
            citizenEmail:  dec.citizenEmail,
            ministry:      raw.ministry,
            ministryLabel: raw.ministryLabel,
            priority:      raw.priority,
            status:        raw.status,
            date:          raw.date,
            adminNotes:    raw.adminNotes,
            nlpClassified: raw.nlpClassified,
            nlpConfidence: raw.nlpConfidence,
          };
        }));
        const sorted = data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setComplaints(sorted);

        const savedReadIds = JSON.parse(localStorage.getItem('govcare-citizen-notif-read') || '[]');
        const notifs = [];
        sorted.forEach(c => {
          const timeLabel = timeAgo(c.date);
          const statusKey = `status-${c.docId || c.id}-${c.status}`;
          if (c.status === 'Submitted')
            notifs.push({ id: statusKey, type: 'info', title: 'Complaint Submitted', text: `Your complaint ${c.id} has been received and is awaiting review.`, time: timeLabel });
          else if (c.status === 'Pending Review')
            notifs.push({ id: statusKey, type: 'warning', title: 'Under Review', text: `Admin is reviewing your complaint ${c.id}.`, time: timeLabel });
          else if (c.status === 'In Progress')
            notifs.push({ id: statusKey, type: 'info', title: 'Complaint In Progress', text: `${c.ministry || 'The ministry'} is now handling your complaint ${c.id}.`, time: timeLabel });
          else if (c.status === 'Resolved')
            notifs.push({ id: statusKey, type: 'success', title: 'Complaint Resolved', text: `Your complaint ${c.id} has been successfully resolved.`, time: timeLabel });
          else if (c.status === 'Rejected')
            notifs.push({ id: statusKey, type: 'error', title: 'Complaint Rejected', text: `Your complaint ${c.id} has been rejected by the admin.`, time: timeLabel });
          if (c.adminNotes && c.adminNotes.trim()) {
            const noteKey = `note-${c.docId || c.id}`;
            notifs.push({ id: noteKey, type: 'note', title: 'Admin Left a Note', text: `Re: ${c.id} — "${c.adminNotes.slice(0, 80)}${c.adminNotes.length > 80 ? '...' : ''}"`, time: timeLabel });
          }
        });
        setNotifications(notifs.map(n => ({ ...n, unread: !savedReadIds.includes(n.id) })).slice(0, 10));
        setLoading(false);
      });

      return () => { unsubLogs(); unsubC(); };
    });
    return () => unsubAuth();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const days = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  // ── Computed stats from live Firebase data ────────────────────────────────
  const stats = {
    total:      complaints.length,
    pending:    complaints.filter(c => c.status === 'Pending Review').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved:   complaints.filter(c => c.status === 'Resolved').length,
  };

  // ── Map status → visual style ─────────────────────────────────────────────
  const STATUS_STYLE = {
    'In Progress':   {
      iconBg: '#d1fae5', badgeClass: 'in-progress', statusKey: 'inProgressBadge',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    },
    'Pending Review': {
      iconBg: '#fed7aa', badgeClass: 'pending-review', statusKey: 'pendingBadge',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    'Resolved': {
      iconBg: '#e9d5ff', badgeClass: 'resolved', statusKey: 'resolvedBadge',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    },
    'Submitted': {
      iconBg: '#dbeafe', badgeClass: 'submitted', statusKey: 'submittedBadge',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    },
    'Rejected': {
      iconBg: '#fee2e2', badgeClass: 'rejected', statusKey: 'submittedBadge',
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    },
  };

  // ── Build activity items from real data ───────────────────────────────────
  const activities = complaints.slice(0, 6).map(c => {
    const style = STATUS_STYLE[c.status] || STATUS_STYLE['Submitted'];
    return {
      id: c.id,
      docId: c.docId,
      title: c.title,
      time: timeAgo(c.date),
      statusLabel: t[style.statusKey] || c.status,
      badgeClass: style.badgeClass,
      iconBg: style.iconBg,
      icon: style.icon,
    };
  });

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
    const ids = notifications.map(n => n.id);
    localStorage.setItem('govcare-citizen-notif-read', JSON.stringify(ids));
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem('govcare-user');
    navigate('/');
  }

  const unreadCount = notifications.filter(n => n.unread).length;

  const notifIconMap = {
    success: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    info:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    warning: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    error:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    note:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  };

  return (
    <>
      <style>{css}</style>
      <div className={`dashboard-page${darkMode ? ' dark' : ''}`}>

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
                  {notifications.map(n => (
                    <div key={n.id} className={`notif-item${n.unread ? ' unread' : ''}`} onClick={() => navigate('/track-status')}>
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

        {/* Dashboard Layout */}
        <div className="dashboard-layout">

          {/* Sidebar */}
          <div className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">{t.menu}</div>
              <ul className="sidebar-menu">
                <li>
                  <Link to="/dashboard" className="active">
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
                  <Link to="/help-center">
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                    {t.helpCenter}
                  </Link>
                </li>
                <li>
                  <Link to="/faq">
                    <span className="menu-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 9h8"/><path d="M8 13h5"/><path d="M12 17v.01"/></svg></span>
                    {t.faq}
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
              <h1>{t.welcomeBack}, {displayName}!</h1>
              <p>{t.overview}</p>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                  <div className="stat-trend neutral">—</div>
                </div>
                {loading ? <div className="skeleton skeleton-num" /> : <div className="stat-number">{stats.total}</div>}
                <div className="stat-label">{t.totalSubmitted}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
                  <div className={`stat-trend ${stats.pending > 0 ? 'up' : 'neutral'}`}>{stats.pending > 0 ? `+${stats.pending}` : '—'}</div>
                </div>
                {loading ? <div className="skeleton skeleton-num" /> : <div className="stat-number">{stats.pending}</div>}
                <div className="stat-label">{t.pendingReview}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
                  <div className="stat-trend neutral">—</div>
                </div>
                {loading ? <div className="skeleton skeleton-num" /> : <div className="stat-number">{stats.inProgress}</div>}
                <div className="stat-label">{t.inProgress}</div>
              </div>
              <div className="stat-card">
                <div className="stat-header">
                  <div className="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
                  <div className={`stat-trend ${stats.resolved > 0 ? 'up' : 'neutral'}`}>{stats.resolved > 0 ? `+${stats.resolved}` : '—'}</div>
                </div>
                {loading ? <div className="skeleton skeleton-num" /> : <div className="stat-number">{stats.resolved}</div>}
                <div className="stat-label">{t.resolved}</div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="submit-section">
              <div className="submit-content">
                <h2>{t.newComplaintQuestion}</h2>
                <p>{t.submitRoute}</p>
              </div>
              <button className="btn-submit" onClick={() => navigate('/submit-complaint')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {t.submitNewComplaint}
              </button>
            </div>

            {/* FAQ Quick Access */}
            <div className="faq-banner">
              <div className="faq-banner-left">
                <div className="faq-banner-icon">❓</div>
                <div>
                  <div className="faq-banner-title">Have questions about GovCare+?</div>
                  <div className="faq-banner-sub">Browse our Help Centre for answers on submitting complaints, tracking status, and AI routing.</div>
                </div>
              </div>
              <button className="faq-banner-btn" onClick={() => navigate('/faq')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {t.faq}
              </button>
            </div>

            {/* Recent Activity */}
            <div className="activity-section">              <div className="section-header">
                <h2>{t.recentActivity}</h2>
                <Link to="/track-status" className="view-all">{t.viewAll}</Link>
              </div>
              <div className="activity-list">
                {loading ? (
                  // Skeleton loaders while fetching
                  [1,2,3].map(i => <div key={i} className="skeleton skeleton-item" />)
                ) : activities.length === 0 ? (
                  <div className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <p>No complaints yet. Submit your first complaint above.</p>
                  </div>
                ) : (
                  activities.map(a => (
                    <div key={a.docId} className="activity-item" onClick={() => navigate('/track-status')}>
                      <div className="activity-icon" style={{ background: a.iconBg }}>{a.icon}</div>
                      <div className="activity-content">
                        <div className="activity-title">{a.title}</div>
                        <div className="activity-meta">
                          <span className="activity-id">{a.id}</span>
                          <span>•</span>
                          <span className="activity-date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {a.time}
                          </span>
                        </div>
                      </div>
                      <div className="activity-status">
                        <span className={`status-badge ${a.badgeClass}`}>{a.statusLabel}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System / Activity Log */}
            <div className="log-section">
              <div className="section-header">
                <h2>System Log</h2>
              </div>
              <div>
                {activityLogs.length === 0 ? (
                  <div className="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    <p>No activity logs found.</p>
                  </div>
                ) : (
                  activityLogs.slice(0, 10).map(log => (
                    <div key={log.docId} className="log-item">
                      <div className="log-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <div>
                        <div className="log-event">{log.event}</div>
                        <div className="log-meta">
                          <span>{log.device}</span>
                          <span>•</span>
                          <span>{log.timestamp?.toDate?.().toLocaleString() || log.createdAt}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
