import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, doc, getDocs, updateDoc, setDoc, deleteDoc, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { decryptFields, verifyIntegrity } from '../crypto';
import AdminFAQSection from './AdminFAQSection';

const MINISTRIES = ['All', 'Health', 'Transport', 'Education', 'Works & Infrastructure', 'Home Affairs', 'Environment & Cleanliness'];
const STATUSES = ['All', 'Submitted', 'Pending Review', 'In Progress', 'Resolved', 'Rejected'];

const STATUS_COLORS = {
  'Submitted':      { bg: '#dbeafe', color: '#1d4ed8' },
  'Pending Review': { bg: '#fef3c7', color: '#b45309' },
  'In Progress':    { bg: '#d1fae5', color: '#065f46' },
  'Resolved':       { bg: '#e9d5ff', color: '#6b21a8' },
  'Rejected':       { bg: '#fee2e2', color: '#991b1b' },
};

const MINISTRY_COLORS = {
  'Health':                  '#3b82f6',
  'Transport':               '#f97316',
  'Education':               '#eab308',
  'Works & Infrastructure':  '#10b981',
  'Home Affairs':            '#8b5cf6',
  'Environment & Cleanliness':'#06b6d4',
};

// ─── Priority Determination Engine ───────────────────────────────────────────
function determinePriority(title = '', description = '', ministry = '') {
  const titleL = title.toLowerCase();
  const textL  = `${title} ${description}`.toLowerCase();

  // TIER 1 — LOW
  // Suggestion, feedback, inquiry — no active problem
  const lowPatterns = [
    'suggestion','suggest','propose','proposal','idea','feedback',
    'recommend','recommendation','request for','would like to','it would be',
    'please consider','looking forward','hope that','wish','inquiry','enquiry',
    'information on','asking about','how to','where can','when will',
    'cadangan','saranan','cadangkan','mohon maklumkan','ingin bertanya',
    'harap pertimbangkan','soalan','pertanyaan',
  ];
  if (lowPatterns.some(p => textL.includes(p))) return 'Low';

  // TIER 2 — HIGH
  // Immediate threat to life, safety, or large-scale emergency
  const highPatterns = [
    'emergency','life threatening','life-threatening','danger to life',
    'death','died','dead','killed','murder','suicide',
    'injury','injured','badly hurt','critically hurt','bleeding','unconscious',
    'robbery','assault','rape','sexual assault',
    'shooting','stabbing','kidnap','abduction','bomb threat','explosion',
    'gangster','armed','weapon','gun','knife attack',
    'fire','building on fire','house fire','structure collapse','roof collapse',
    'bridge collapse','gas leak','gas explosion','building collapse',
    'flash flood','severe flood','landslide','disaster','catastrophe',
    'ambulance needed','medical emergency','overdose','poisoning','contamination',
    'epidemic','outbreak','mass illness','dengue outbreak','food poisoning',
    'major blackout','total water cut','sewage overflow','road collapse',
    'kecemasan','darurat','bahaya nyawa','kebakaran','bangunan terbakar',
    'banjir besar','tanah runtuh','bunuh','rogol','rompak bersenjata',
    'serangan','bom','letupan','kemalangan maut','mangsa cedera parah',
    'wabak','keracunan','penyakit berjangkit','runtuhan bangunan',
  ];
  if (highPatterns.some(p => textL.includes(p))) return 'High';

  const highTitleWords = [
    'fire','murder','robbery','assault','explosion','bomb','flood',
    'collapse','emergency','stabbing','shooting','rape','overdose',
    'kebakaran','bunuh','rompak','letupan','banjir','runtuh','kecemasan',
  ];
  if (highTitleWords.some(w => titleL.includes(w))) return 'High';

  // TIER 3 — MEDIUM
  // Real active problem affecting daily life but not life-threatening
  const mediumPatterns = [
    'broken','not working','malfunction','damaged','out of order','faulty',
    'no water','water supply','no electricity','power trip','streetlight broken',
    'pothole','road damage','cracked road','blocked drain','burst pipe',
    'traffic light','public transport issue','bus not coming',
    'long wait','waiting too long','hours waiting','slow service','no response',
    'no action taken','ignored','not attended','unattended','inefficient',
    'poor service','bad service','rude staff','unprofessional',
    'corruption','bribery','bribe','fraud','scam','overcharged','cheated',
    'misuse of power','misconduct','abuse of authority',
    'harassment','threatening','intimidation','stalking','vandalism',
    'illegal dumping','noise pollution','excessive noise','disturbing','pest',
    'stray dogs','stray animals','mosquito','rat infestation',
    'dirty','unsanitary','unhygienic','rubbish','garbage','litter','smell',
    'pollution','contaminated water','sewage smell',
    'rosak','tidak berfungsi','tiada air','tiada elektrik','bekalan air',
    'lubang jalan','longkang tersumbat','paip pecah','menunggu lama',
    'perkhidmatan buruk','tidak dilayan','rasuah','suapan','penipuan',
    'bising','pembuangan sampah haram','anjing liar','tikus','nyamuk',
    'kotor','berbau','pencemaran','longkang','sampah sarap',
  ];
  if (mediumPatterns.some(p => textL.includes(p))) return 'Medium';

  // DEFAULT — Medium
  // Unknown complaints are treated as needing attention
  return 'Medium';
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; }

  .admin-page { font-family: 'Inter', sans-serif; background: #0f172a; min-height: 100vh; color: #e2e8f0; -webkit-font-smoothing: antialiased; }
  .admin-page.light { background: #f1f5f9; color: #1a1a1a; }

  .admin-nav { background: #1e293b; height: 64px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; position: sticky; top: 0; z-index: 100; }
  .admin-page.light .admin-nav { background: white; border-color: #e5e7eb; }
  .admin-nav-left { display: flex; align-items: center; gap: 16px; }
  .admin-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .admin-logo img { width: 32px; height: 32px; object-fit: contain; }
  .admin-logo-name { color: white; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
  .admin-page.light .admin-logo-name { color: #090088; }
  .admin-badge { background: rgba(184,137,197,0.25); border: 1px solid rgba(184,137,197,0.5); color: #B889C5; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px; text-transform: uppercase; }
  .admin-page.light .admin-badge { background: rgba(184,137,197,0.15); border-color: #B889C5; color: #8a4fa0; }
  .admin-divider { width: 1px; height: 28px; background: #334155; }
  .admin-page.light .admin-divider { background: #e5e7eb; }
  .admin-nav-title { font-size: 14px; font-weight: 600; color: #94a3b8; }
  .admin-page.light .admin-nav-title { color: #6b7280; }
  .admin-nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-icon-btn { width: 36px; height: 36px; background: #334155; border: none; border-radius: 8px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .nav-icon-btn:hover { background: #475569; color: #e2e8f0; }
  .admin-page.light .nav-icon-btn { background: #f3f4f6; border: 1px solid #e5e7eb; color: #6b7280; }
  .admin-page.light .nav-icon-btn:hover { background: #e5e7eb; color: #1a1a1a; }

  /* Notification Bell */
  .notif-wrapper { position: relative; }
  .notif-bell { background: none; border: none; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 8px; position: relative; transition: color 0.2s; }
  .notif-bell:hover { color: #e2e8f0; }
  .admin-page.light .notif-bell { color: #374151; }
  .admin-page.light .notif-bell:hover { color: #1a1a1a; }
  .notif-dot { position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 2px solid #1e293b; }
  .admin-page.light .notif-dot { border-color: #f8fafc; }

  .notif-panel { position: absolute; top: calc(100% + 14px); right: -8px; width: 360px; background: #1e293b; border: 1px solid #334155; border-radius: 14px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); z-index: 500; overflow: hidden; animation: notifIn 0.18s ease; }
  @keyframes notifIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  .admin-page.light .notif-panel { background: white; border-color: #e5e7eb; box-shadow: 0 10px 40px rgba(0,0,0,0.12); }

  .notif-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid #334155; }
  .admin-page.light .notif-head { border-color: #f3f4f6; }
  .notif-head-left { display: flex; align-items: center; gap: 8px; }
  .notif-heading { font-size: 14px; font-weight: 700; color: #f1f5f9; }
  .admin-page.light .notif-heading { color: #1a1a1a; }
  .notif-count-badge { background: #ef4444; color: white; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 20px; }
  .notif-markall { font-size: 12px; font-weight: 600; color: #B889C5; background: none; border: none; cursor: pointer; font-family: inherit; padding: 0; }
  .notif-markall:hover { text-decoration: underline; }

  .notif-list { max-height: 340px; overflow-y: auto; }
  .notif-list::-webkit-scrollbar { width: 4px; }
  .notif-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
  .notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; transition: background 0.15s; }
  .notif-item:last-child { border-bottom: none; }
  .notif-item:hover { background: rgba(255,255,255,0.04); }
  .notif-item.unread { background: rgba(184,137,197,0.07); }
  .notif-item.unread:hover { background: rgba(184,137,197,0.13); }
  .admin-page.light .notif-item { border-color: #f3f4f6; }
  .admin-page.light .notif-item:hover { background: #f9fafb; }
  .admin-page.light .notif-item.unread { background: rgba(184,137,197,0.08); }
  .notif-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .notif-icon.new { background: rgba(184,137,197,0.18); color: #B889C5; }
  .notif-icon.urgent { background: rgba(239,68,68,0.15); color: #f87171; }
  .notif-body { flex: 1; min-width: 0; }
  .notif-text { font-size: 13px; color: #cbd5e1; line-height: 1.45; margin-bottom: 5px; }
  .admin-page.light .notif-text { color: #374151; }
  .notif-text strong { color: #f1f5f9; font-weight: 700; }
  .admin-page.light .notif-text strong { color: #1a1a1a; }
  .notif-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .notif-time { font-size: 11px; color: #475569; }
  .notif-mini-badge { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px; }
  .notif-mini-badge.new { background: rgba(184,137,197,0.18); color: #B889C5; }
  .notif-mini-badge.urgent { background: rgba(239,68,68,0.15); color: #f87171; }
  .notif-unread-dot { width: 7px; height: 7px; background: #B889C5; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }

  .notif-empty { padding: 40px 20px; text-align: center; color: #475569; }
  .notif-empty svg { margin-bottom: 10px; opacity: 0.35; display: block; margin-left: auto; margin-right: auto; }
  .notif-empty p { font-size: 13px; }

  .notif-foot { padding: 12px 18px; border-top: 1px solid #334155; text-align: center; }
  .admin-page.light .notif-foot { border-color: #f3f4f6; }
  .notif-viewall { font-size: 13px; font-weight: 600; color: #B889C5; background: none; border: none; cursor: pointer; font-family: inherit; }
  .notif-viewall:hover { text-decoration: underline; }
  .admin-user-btn { display: flex; align-items: center; gap: 10px; padding: 6px 12px; background: #334155; border: none; border-radius: 8px; color: #e2e8f0; font-family: inherit; }
  .admin-page.light .admin-user-btn { background: #f3f4f6; border: 1px solid #e5e7eb; color: #1a1a1a; }
  .admin-avatar { width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(135deg, #4f46e5, #090088); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 700; }
  .admin-user-name { font-size: 13px; font-weight: 600; }
  .admin-user-role { font-size: 11px; color: #64748b; }
  .logout-btn { display: flex; align-items: center; gap: 8px; padding: 8px 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; color: #fca5a5; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; font-family: inherit; }
  .logout-btn:hover { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); }
  .admin-page.light .logout-btn { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

  .admin-layout { display: flex; min-height: calc(100vh - 64px); }

  /* Sidebar */
  .admin-sidebar { width: 240px; background: #1e293b; border-right: 1px solid #334155; padding: 20px 12px; flex-shrink: 0; }
  .admin-page.light .admin-sidebar { background: white; border-color: #e5e7eb; }
  .sidebar-section-label { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.8px; padding: 0 12px; margin-bottom: 6px; margin-top: 20px; }
  .sidebar-section-label:first-child { margin-top: 0; }
  .admin-page.light .sidebar-section-label { color: #9ca3af; }
  .sidebar-nav { list-style: none; }
  .sidebar-nav li { margin-bottom: 2px; }
  .sidebar-nav a, .sidebar-nav button {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    color: #cbd5e1; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500;
    transition: all 0.2s; width: 100%; background: none; border: none; cursor: pointer; font-family: inherit; text-align: left;
  }
  .sidebar-nav a:hover, .sidebar-nav button:hover { background: #334155; color: #f1f5f9; }
  .sidebar-nav a.active { background: rgba(79,70,229,0.2); color: #a5b4fc; font-weight: 600; }
  .admin-page.light .sidebar-nav a, .admin-page.light .sidebar-nav button { color: #4b5563; }
  .admin-page.light .sidebar-nav a:hover, .admin-page.light .sidebar-nav button:hover { background: #f3f4f6; color: #1a1a1a; }
  .admin-page.light .sidebar-nav a.active { background: #ede9fe; color: #090088; }
  .sidebar-icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sidebar-count { margin-left: auto; background: #ef4444; color: white; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center; }

  /* Main */
  .admin-main { flex: 1; padding: 28px; overflow-y: auto; }
  .page-title { font-size: 24px; font-weight: 800; color: #f1f5f9; margin-bottom: 4px; letter-spacing: -0.5px; }
  .admin-page.light .page-title { color: #1a1a1a; }
  .page-subtitle { font-size: 14px; color: #64748b; margin-bottom: 28px; }

  /* Stats */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px; transition: all 0.2s; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .admin-page.light .stat-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .stat-icon-wrap { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .stat-trend { font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 6px; }
  .stat-trend.up { background: rgba(16,185,129,0.15); color: #34d399; }
  .stat-trend.neutral { background: #334155; color: #64748b; }
  .admin-page.light .stat-trend.up { background: #dcfce7; color: #16a34a; }
  .admin-page.light .stat-trend.neutral { background: #f3f4f6; color: #6b7280; }
  .stat-number { font-size: 32px; font-weight: 800; color: #f1f5f9; margin-bottom: 4px; }
  .admin-page.light .stat-number { color: #1a1a1a; }
  .stat-label { font-size: 13px; color: #64748b; }

  /* Toolbar */
  .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  .search-box { display: flex; align-items: center; gap: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px 14px; flex: 1; min-width: 200px; }
  .search-box input { background: none; border: none; outline: none; color: #e2e8f0; font-size: 14px; width: 100%; font-family: inherit; }
  .search-box input::placeholder { color: #475569; }
  .admin-page.light .search-box { background: white; border-color: #e5e7eb; }
  .admin-page.light .search-box input { color: #1a1a1a; }
  .admin-page.light .search-box input::placeholder { color: #9ca3af; }
  .filter-select { padding: 10px 14px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; color: #94a3b8; font-size: 13px; font-family: inherit; cursor: pointer; outline: none; transition: all 0.2s; }
  .filter-select:hover { border-color: #475569; }
  .admin-page.light .filter-select { background: white; border-color: #e5e7eb; color: #4b5563; }
  .report-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px; color: #34d399; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
  .report-btn:hover { background: rgba(16,185,129,0.2); }
  .admin-page.light .report-btn { background: #d1fae5; border-color: #a7f3d0; color: #065f46; }
  .export-btn { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(79,70,229,0.1); border: 1px solid rgba(79,70,229,0.3); border-radius: 10px; color: #a5b4fc; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
  .export-btn:hover { background: rgba(79,70,229,0.2); }
  .admin-page.light .export-btn { background: #ede9fe; border-color: #c4b5fd; color: #5b21b6; }

  /* Table */
  .complaints-table-wrap { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
  .admin-page.light .complaints-table-wrap { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .table-header-row { display: flex; align-items: center; padding: 12px 20px; border-bottom: 1px solid #334155; background: #0f172a; }
  .admin-page.light .table-header-row { background: #f8fafc; border-color: #e5e7eb; }
  .table-header-row span { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
  .admin-page.light .table-header-row span { color: #9ca3af; }
  .col-id { width: 120px; flex-shrink: 0; }
  .col-title { flex: 1; min-width: 0; padding-right: 16px; }
  .col-ministry { width: 130px; flex-shrink: 0; }
  .col-status { width: 130px; flex-shrink: 0; }
  .col-priority { width: 80px; flex-shrink: 0; }
  .col-date { width: 100px; flex-shrink: 0; }
  .col-action { width: 80px; flex-shrink: 0; text-align: right; }
  .complaint-row { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #1e293b; cursor: pointer; transition: background 0.15s; }
  .complaint-row:last-child { border-bottom: none; }
  .complaint-row:hover { background: #0f172a; }
  .admin-page.light .complaint-row { border-color: #f3f4f6; }
  .admin-page.light .complaint-row:hover { background: #f9fafb; }
  .complaint-id { font-size: 13px; font-weight: 700; color: #6366f1; }
  .admin-page.light .complaint-id { color: #090088; }
  .complaint-title { font-size: 14px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-page.light .complaint-title { color: #1a1a1a; }
  .complaint-citizen { font-size: 12px; color: #64748b; margin-top: 2px; }
  .ministry-tag { display: inline-flex; align-items: center; gap: 5px; }
  .ministry-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .status-pill { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; }
  .priority-badge { font-size: 11px; font-weight: 700; }
  .priority-high { color: #f87171; }
  .priority-medium { color: #fbbf24; }
  .priority-low { color: #34d399; }
  .complaint-date { font-size: 12px; color: #64748b; }
  .action-btn { width: 32px; height: 32px; background: #334155; border: none; border-radius: 6px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; margin-left: auto; }
  .action-btn:hover { background: #4f46e5; color: white; }
  .admin-page.light .action-btn { background: #f3f4f6; }
  .admin-page.light .action-btn:hover { background: #4f46e5; color: white; }
  .empty-state { padding: 60px 20px; text-align: center; color: #475569; }
  .empty-state svg { margin-bottom: 16px; opacity: 0.4; }
  .empty-state p { font-size: 15px; }

  /* Overview ministry grid */
  .section-label { font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 14px; }
  .admin-page.light .section-label { color: #1a1a1a; }
  .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
  .ministry-stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 14px; cursor: pointer; transition: all 0.2s; }
  .ministry-stat-card:hover { transform: translateY(-2px); }
  .admin-page.light .ministry-stat-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .ministry-dot-lg { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .ministry-stat-name { font-size: 13px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; }
  .admin-page.light .ministry-stat-name { color: #1a1a1a; }
  .ministry-stat-count { font-size: 24px; font-weight: 800; color: #f1f5f9; }
  .admin-page.light .ministry-stat-count { color: #1a1a1a; }
  .ministry-stat-sub { font-size: 11px; color: #64748b; }

  /* ── Overview Dashboard ── */
  .ov-top-bar { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
  .ov-top-btns { display: flex; gap: 10px; align-items: center; }
  .ov-btn-ghost { display: flex; align-items: center; gap: 7px; padding: 9px 16px; background: rgba(223,200,230,0.12); border: 1px solid rgba(223,200,230,0.4); border-radius: 8px; color: #DFC8E6; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; white-space: nowrap; }
  .ov-btn-ghost:hover { background: rgba(223,200,230,0.22); border-color: #DFC8E6; }
  .admin-page.light .ov-btn-ghost { background: rgba(223,200,230,0.2); border-color: #c9a8d8; color: #8a4fa0; }
  .admin-page.light .ov-btn-ghost:hover { background: rgba(223,200,230,0.4); }
  .ov-btn-primary { display: flex; align-items: center; gap: 7px; padding: 9px 18px; background: linear-gradient(135deg, #B889C5, #9b6aae); border: none; border-radius: 8px; color: white; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; white-space: nowrap; }
  .ov-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(184,137,197,0.45); }

  .ov-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 22px; }
  .ov-kpi { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px 22px; transition: all 0.2s; }
  .ov-kpi:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .admin-page.light .ov-kpi { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .ov-kpi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .ov-kpi-icon { width: 36px; height: 36px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .ov-kpi-badge { font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
  .ov-kpi-badge.pos { background: rgba(16,185,129,0.15); color: #34d399; }
  .ov-kpi-badge.neg { background: rgba(239,68,68,0.12); color: #f87171; }
  .admin-page.light .ov-kpi-badge.pos { background: #dcfce7; color: #16a34a; }
  .admin-page.light .ov-kpi-badge.neg { background: #fef2f2; color: #dc2626; }
  .ov-kpi-num { font-size: 36px; font-weight: 800; color: #f1f5f9; letter-spacing: -1px; margin-bottom: 5px; line-height: 1; }
  .admin-page.light .ov-kpi-num { color: #1a1a1a; }
  .ov-kpi-lbl { font-size: 13px; color: #64748b; }

  .ov-mid-row { display: grid; grid-template-columns: 1fr 320px; gap: 16px; margin-bottom: 22px; }

  .ov-chart-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px; }
  .admin-page.light .ov-chart-card { background: white; border-color: #e5e7eb; }
  .ov-chart-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .ov-chart-title { font-size: 15px; font-weight: 700; color: #f1f5f9; }
  .admin-page.light .ov-chart-title { color: #1a1a1a; }
  .ov-chart-sel { padding: 7px 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #94a3b8; font-size: 12px; font-family: inherit; cursor: pointer; outline: none; }
  .admin-page.light .ov-chart-sel { background: #f9fafb; border-color: #e5e7eb; color: #4b5563; }
  .ov-chart-body { height: 200px; border: 1px dashed #2d3f55; border-radius: 10px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
  .admin-page.light .ov-chart-body { border-color: #e2e8f0; }
  .ov-chart-line-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .ov-chart-ghost { font-size: 13px; color: #334155; position: relative; z-index: 1; }
  .admin-page.light .ov-chart-ghost { color: #cbd5e1; }

  .ov-dist-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px; }
  .admin-page.light .ov-dist-card { background: white; border-color: #e5e7eb; }
  .ov-dist-title { font-size: 15px; font-weight: 700; color: #f1f5f9; margin-bottom: 18px; }
  .admin-page.light .ov-dist-title { color: #1a1a1a; }
  .ov-dist-row { display: flex; align-items: center; gap: 10px; margin-bottom: 13px; }
  .ov-dist-row:last-child { margin-bottom: 0; }
  .ov-dist-icon { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .ov-dist-name { font-size: 13px; font-weight: 600; color: #e2e8f0; width: 96px; flex-shrink: 0; }
  .admin-page.light .ov-dist-name { color: #374151; }
  .ov-dist-bar-bg { flex: 1; height: 7px; background: #1e3a5f; border-radius: 4px; overflow: hidden; }
  .admin-page.light .ov-dist-bar-bg { background: #f1f5f9; }
  .ov-dist-bar-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
  .ov-dist-val { font-size: 13px; font-weight: 700; color: #94a3b8; width: 24px; text-align: right; flex-shrink: 0; }
  .admin-page.light .ov-dist-val { color: #6b7280; }

  .ov-pq-wrap { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px; margin-bottom: 22px; }
  .admin-page.light .ov-pq-wrap { background: white; border-color: #e5e7eb; }
  .ov-pq-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
  .ov-pq-heading { font-size: 15px; font-weight: 700; color: #f1f5f9; }
  .admin-page.light .ov-pq-heading { color: #1a1a1a; }
  .ov-pq-viewall { font-size: 13px; font-weight: 600; color: #6366f1; background: none; border: none; cursor: pointer; font-family: inherit; }
  .ov-pq-viewall:hover { color: #818cf8; text-decoration: underline; }
  .admin-page.light .ov-pq-viewall { color: #090088; }
  .ov-pq-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 16px; border-left: 3px solid transparent; background: #0f172a; border-radius: 0 8px 8px 0; margin-bottom: 8px; cursor: pointer; transition: background 0.15s; }
  .ov-pq-row:last-child { margin-bottom: 0; }
  .ov-pq-row:hover { background: #162032; }
  .ov-pq-row.red { border-left-color: #ef4444; }
  .ov-pq-row.amber { border-left-color: #f59e0b; }
  .admin-page.light .ov-pq-row { background: #f8fafc; }
  .admin-page.light .ov-pq-row:hover { background: #f1f5f9; }
  .ov-pq-row-title { font-size: 14px; font-weight: 600; color: #f1f5f9; margin-bottom: 5px; }
  .admin-page.light .ov-pq-row-title { color: #1a1a1a; }
  .ov-pq-row-meta { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; }
  .ov-pq-row-id { color: #6366f1; font-weight: 600; }
  .admin-page.light .ov-pq-row-id { color: #090088; }
  .ov-badge { font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 5px; letter-spacing: 0.5px; border: 1px solid; flex-shrink: 0; }
  .ov-badge.urgent { color: #f87171; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.12); }
  .ov-badge.lowconf { color: #fbbf24; border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.12); }
  .ov-badge.overdue { color: #f87171; border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.07); }
  .admin-page.light .ov-badge.urgent { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
  .admin-page.light .ov-badge.lowconf { color: #b45309; border-color: #fde68a; background: #fffbeb; }
  .admin-page.light .ov-badge.overdue { color: #dc2626; border-color: #fecaca; background: #fef2f2; }

  .ov-bottom-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .ov-metric { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 22px 24px; }
  .admin-page.light .ov-metric { background: white; border-color: #e5e7eb; }
  .ov-metric-lbl { font-size: 13px; color: #64748b; margin-bottom: 8px; }
  .ov-metric-val { font-size: 34px; font-weight: 800; color: #f1f5f9; letter-spacing: -0.5px; margin-bottom: 6px; }
  .admin-page.light .ov-metric-val { color: #1a1a1a; }
  .ov-metric-sub { font-size: 13px; font-weight: 600; }
  .ov-metric-sub.green { color: #34d399; }
  .ov-metric-sub.blue { color: #60a5fa; }
  .ov-metric-sub.purple { color: #a78bfa; }
  .admin-page.light .ov-metric-sub.green { color: #16a34a; }
  .admin-page.light .ov-metric-sub.blue { color: #2563eb; }
  .admin-page.light .ov-metric-sub.purple { color: #7c3aed; }

  /* Priority Queue page */
  .pq-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
  .pq-high-badge { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; }
  .admin-page.light .pq-high-badge { background: #fef2f2; border-color: #fecaca; color: #dc2626; }
  .pq-filter-row { display: flex; gap: 8px; margin-bottom: 20px; }
  .pq-filter-btn { padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid #334155; background: none; color: #64748b; cursor: pointer; font-family: inherit; transition: all 0.2s; }
  .pq-filter-btn:hover { background: #334155; color: #e2e8f0; }
  .pq-filter-btn.active-all { background: rgba(79,70,229,0.15); border-color: rgba(79,70,229,0.4); color: #a5b4fc; }
  .pq-filter-btn.active-high { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); color: #f87171; }
  .pq-filter-btn.active-medium { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); color: #fbbf24; }
  .pq-filter-btn.active-low { background: rgba(52,211,153,0.15); border-color: rgba(52,211,153,0.4); color: #34d399; }
  .admin-page.light .pq-filter-btn { border-color: #e5e7eb; color: #6b7280; }
  .admin-page.light .pq-filter-btn:hover { background: #f3f4f6; color: #1a1a1a; }
  .pq-list { display: flex; flex-direction: column; gap: 12px; }
  .pq-card { background: #1e293b; border: 1px solid #334155; border-left: 4px solid transparent; border-radius: 12px; padding: 18px 20px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 16px; }
  .pq-card:hover { transform: translateX(4px); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
  .pq-card.high { border-left-color: #ef4444; }
  .pq-card.medium { border-left-color: #f59e0b; }
  .pq-card.low { border-left-color: #34d399; }
  .admin-page.light .pq-card { background: white; border-color: #e5e7eb; border-left-color: transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .admin-page.light .pq-card.high { border-left-color: #ef4444; }
  .admin-page.light .pq-card.medium { border-left-color: #f59e0b; }
  .admin-page.light .pq-card.low { border-left-color: #34d399; }
  .pq-rank { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; flex-shrink: 0; }
  .pq-rank.high { background: rgba(239,68,68,0.15); color: #f87171; }
  .pq-rank.medium { background: rgba(245,158,11,0.15); color: #fbbf24; }
  .pq-rank.low { background: rgba(52,211,153,0.15); color: #34d399; }
  .pq-info { flex: 1; min-width: 0; }
  .pq-title { font-size: 14px; font-weight: 700; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px; }
  .admin-page.light .pq-title { color: #1a1a1a; }
  .pq-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12px; color: #64748b; }
  .pq-id { color: #6366f1; font-weight: 700; }
  .admin-page.light .pq-id { color: #090088; }
  .pq-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
  .pq-urgency { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }
  .pq-urgency.critical { background: rgba(239,68,68,0.15); color: #f87171; }
  .pq-urgency.urgent { background: rgba(239,68,68,0.1); color: #fca5a5; }
  .pq-urgency.moderate { background: rgba(245,158,11,0.15); color: #fbbf24; }
  .pq-urgency.normal { background: rgba(52,211,153,0.15); color: #34d399; }
  .pq-days { font-size: 11px; color: #475569; }

  /* Manual review */
  .mrq-info-bar { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.25); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; font-size: 13px; color: #fbbf24; font-weight: 500; }
  .admin-page.light .mrq-info-bar { background: #fffbeb; border-color: #fde68a; color: #b45309; }

  /* Placeholder */

  /* ═══ CITIZENS PAGE ════════════════════════════════════════════════════════ */
  .cit-page { display: flex; flex-direction: column; gap: 24px; }
  .cit-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .cit-search-bar { display: flex; align-items: center; gap: 8px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 8px 14px; width: 280px; }
  .admin-page.light .cit-search-bar { background: white; border-color: #e5e7eb; }
  .cit-search-bar input { background: none; border: none; outline: none; color: #e2e8f0; font-size: 13px; font-family: inherit; width: 100%; }
  .admin-page.light .cit-search-bar input { color: #1a1a1a; }
  .cit-search-bar input::placeholder { color: #475569; }
  .cit-table-wrap { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
  .admin-page.light .cit-table-wrap { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .cit-table-head { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr 100px; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #334155; }
  .admin-page.light .cit-table-head { border-color: #f3f4f6; }
  .cit-table-head span { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; }
  .cit-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr 100px; gap: 12px; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); align-items: center; cursor: pointer; transition: background 0.15s; }
  .admin-page.light .cit-row { border-color: #f3f4f6; }
  .cit-row:last-child { border-bottom: none; }
  .cit-row:hover { background: rgba(255,255,255,0.03); }
  .admin-page.light .cit-row:hover { background: #f9fafb; }
  .cit-avatar { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: white; flex-shrink: 0; }
  .cit-name-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .cit-name { font-size: 13px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-page.light .cit-name { color: #1a1a1a; }
  .cit-email { font-size: 11px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cit-cell { font-size: 13px; color: #94a3b8; }
  .admin-page.light .cit-cell { color: #475569; }
  .cit-cell.bold { font-weight: 700; color: #e2e8f0; }
  .admin-page.light .cit-cell.bold { color: #1a1a1a; }
  .cit-status-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
  .cit-status-badge.active { background: rgba(16,185,129,0.15); color: #10b981; }
  .cit-status-badge.inactive { background: rgba(100,116,139,0.15); color: #64748b; }
  .cit-view-btn { font-size: 12px; font-weight: 600; color: #a5b4fc; background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); border-radius: 7px; padding: 5px 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
  .cit-view-btn:hover { background: rgba(99,102,241,0.2); }
  .cit-empty { padding: 60px 20px; text-align: center; color: #475569; font-size: 13px; }
  /* Citizen detail modal */
  .cit-modal-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
  .cit-modal-avatar { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: white; flex-shrink: 0; }
  .cit-modal-name { font-size: 18px; font-weight: 800; color: #f1f5f9; }
  .admin-page.light .cit-modal-name { color: #0f172a; }
  .cit-modal-email { font-size: 13px; color: #64748b; }
  .cit-modal-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .cit-modal-stat { background: #0f172a; border-radius: 10px; padding: 12px; text-align: center; }
  .admin-page.light .cit-modal-stat { background: #f8fafc; }
  .cit-modal-stat-num { font-size: 22px; font-weight: 800; color: #f1f5f9; }
  .admin-page.light .cit-modal-stat-num { color: #0f172a; }
  .cit-modal-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-top: 2px; }
  .cit-modal-complaints { display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; }
  .cit-modal-complaint-row { background: #0f172a; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .admin-page.light .cit-modal-complaint-row { background: #f8fafc; }
  .cit-modal-complaint-title { font-size: 13px; font-weight: 600; color: #e2e8f0; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-page.light .cit-modal-complaint-title { color: #1a1a1a; }
  .cit-modal-complaint-id { font-size: 11px; color: #64748b; white-space: nowrap; }
  .cit-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 1001; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
  .cit-modal-panel { background: #1e293b; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 520px; max-height: 85vh; overflow-y: auto; padding: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
  .admin-page.light .cit-modal-panel { background: white; border-color: #e5e7eb; }
  .cit-modal-close { float: right; background: none; border: none; color: #64748b; cursor: pointer; font-size: 18px; padding: 0; margin-top: -4px; }
  .cit-modal-close:hover { color: #e2e8f0; }
  .admin-page.light .cit-modal-close:hover { color: #1a1a1a; }
  .cit-modal-section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 10px; }


  /* ═══ USER MANAGEMENT ═══════════════════════════════════════════════════ */
  .um-page { display: flex; flex-direction: column; gap: 24px; }
  .um-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .um-search-bar { display: flex; align-items: center; gap: 8px; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 8px 14px; width: 280px; }
  .admin-page.light .um-search-bar { background: white; border-color: #e5e7eb; }
  .um-search-bar input { background: none; border: none; outline: none; color: #e2e8f0; font-size: 13px; font-family: inherit; width: 100%; }
  .admin-page.light .um-search-bar input { color: #1a1a1a; }
  .um-search-bar input::placeholder { color: #475569; }
  .um-table-wrap { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
  .admin-page.light .um-table-wrap { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .um-table-head { display: grid; grid-template-columns: 2.5fr 2fr 1fr 1fr 1fr 120px; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #334155; }
  .admin-page.light .um-table-head { border-color: #f3f4f6; }
  .um-table-head span { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; }
  .um-row { display: grid; grid-template-columns: 2.5fr 2fr 1fr 1fr 1fr 120px; gap: 12px; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); align-items: center; transition: background 0.15s; }
  .admin-page.light .um-row { border-color: #f3f4f6; }
  .um-row:last-child { border-bottom: none; }
  .um-row:hover { background: rgba(255,255,255,0.03); }
  .admin-page.light .um-row:hover { background: #f9fafb; }
  .um-avatar { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: white; flex-shrink: 0; }
  .um-name-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .um-name { font-size: 13px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-page.light .um-name { color: #1a1a1a; }
  .um-uid { font-size: 11px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace; }
  .um-cell { font-size: 13px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-page.light .um-cell { color: #475569; }
  .um-role-badge { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
  .um-role-badge.admin { background: rgba(168,85,247,0.15); color: #c084fc; }
  .um-role-badge.citizen { background: rgba(59,130,246,0.15); color: #60a5fa; }
  .um-status-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
  .um-status-badge.active { background: rgba(16,185,129,0.15); color: #10b981; }
  .um-status-badge.suspended { background: rgba(239,68,68,0.15); color: #ef4444; }
  .um-actions { display: flex; align-items: center; gap: 6px; }
  .um-btn { font-size: 11px; font-weight: 600; padding: 5px 10px; border-radius: 7px; cursor: pointer; font-family: inherit; border: 1px solid; transition: all 0.15s; white-space: nowrap; }
  .um-btn.view { color: #a5b4fc; background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.2); }
  .um-btn.view:hover { background: rgba(99,102,241,0.2); }
  .um-btn.suspend { color: #fca5a5; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); }
  .um-btn.suspend:hover { background: rgba(239,68,68,0.2); }
  .um-btn.restore { color: #6ee7b7; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); }
  .um-btn.restore:hover { background: rgba(16,185,129,0.2); }
  .um-empty { padding: 60px 20px; text-align: center; color: #475569; font-size: 13px; }
  .um-loading { padding: 60px 20px; text-align: center; color: #475569; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .um-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 1001; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
  .um-modal-panel { background: #1e293b; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 500px; max-height: 88vh; overflow-y: auto; padding: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
  .admin-page.light .um-modal-panel { background: white; border-color: #e5e7eb; }
  .um-modal-close { float: right; background: none; border: none; color: #64748b; cursor: pointer; font-size: 18px; padding: 0; margin-top: -4px; }
  .um-modal-close:hover { color: #e2e8f0; }
  .admin-page.light .um-modal-close:hover { color: #1a1a1a; }
  .um-modal-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
  .um-modal-avatar { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: white; flex-shrink: 0; }
  .um-modal-name { font-size: 18px; font-weight: 800; color: #f1f5f9; }
  .admin-page.light .um-modal-name { color: #0f172a; }
  .um-modal-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
  .um-modal-section { margin-bottom: 20px; }
  .um-modal-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; margin-bottom: 10px; }
  .um-modal-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .um-modal-field { background: #0f172a; border-radius: 8px; padding: 10px 14px; }
  .admin-page.light .um-modal-field { background: #f8fafc; }
  .um-modal-field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; font-weight: 600; margin-bottom: 4px; }
  .um-modal-field-value { font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .admin-page.light .um-modal-field-value { color: #0f172a; }
  .um-modal-role-select { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 8px 12px; color: #e2e8f0; font-family: inherit; font-size: 13px; outline: none; cursor: pointer; margin-top: 6px; }
  .admin-page.light .um-modal-role-select { background: white; border-color: #e5e7eb; color: #1a1a1a; }
  .um-modal-actions { display: flex; gap: 10px; margin-top: 20px; }
  .um-modal-btn { flex: 1; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.15s; border: none; }
  .um-modal-btn.primary { background: #4f46e5; color: white; }
  .um-modal-btn.primary:hover { background: #4338ca; }
  .um-modal-btn.danger { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
  .um-modal-btn.danger:hover { background: rgba(239,68,68,0.2); }
  .um-modal-btn.ghost { background: #334155; color: #94a3b8; border: none; }
  .um-modal-btn.ghost:hover { background: #475569; }
  .admin-page.light .um-modal-btn.ghost { background: #f1f5f9; color: #475569; }
  .um-confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); z-index: 1002; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
  .um-confirm-panel { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; max-width: 380px; width: 100%; box-shadow: 0 25px 60px rgba(0,0,0,0.5); text-align: center; }
  .admin-page.light .um-confirm-panel { background: white; border-color: #e5e7eb; }
  .um-confirm-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
  .um-confirm-title { font-size: 16px; font-weight: 800; color: #f1f5f9; margin-bottom: 8px; }
  .admin-page.light .um-confirm-title { color: #0f172a; }
  .um-confirm-desc { font-size: 13px; color: #64748b; margin-bottom: 20px; line-height: 1.6; }
  .um-confirm-btns { display: flex; gap: 10px; }
  .um-confirm-btn { flex: 1; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; transition: all 0.15s; }


  /* ═══ SETTINGS PAGE ═════════════════════════════════════════════════════ */
  .st-page { display: flex; flex-direction: column; gap: 24px; }
  .st-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .st-save-btn { display: flex; align-items: center; gap: 7px; padding: 9px 20px; background: #4f46e5; color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.15s; }
  .st-save-btn:hover { background: #4338ca; }
  .st-save-btn.saved { background: #10b981; }
  .st-tabs { display: flex; gap: 4px; background: #0f172a; border-radius: 12px; padding: 4px; width: fit-content; }
  .admin-page.light .st-tabs { background: #e5e7eb; }
  .st-tab { padding: 7px 16px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: none; color: #64748b; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
  .st-tab.active { background: #1e293b; color: #e2e8f0; }
  .admin-page.light .st-tab.active { background: white; color: #1a1a1a; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .st-body { display: flex; flex-direction: column; gap: 16px; }
  .st-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
  .admin-page.light .st-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .st-card-head { padding: 16px 20px 14px; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 10px; }
  .admin-page.light .st-card-head { border-color: #f3f4f6; }
  .st-card-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .st-card-title { font-size: 14px; font-weight: 700; color: #e2e8f0; }
  .admin-page.light .st-card-title { color: #1a1a1a; }
  .st-card-desc { font-size: 12px; color: #64748b; margin-top: 1px; }
  .st-rows { padding: 4px 0; }
  .st-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); gap: 24px; }
  .admin-page.light .st-row { border-color: #f9fafb; }
  .st-row:last-child { border-bottom: none; }
  .st-row-left { flex: 1; min-width: 0; }
  .st-row-label { font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .admin-page.light .st-row-label { color: #1a1a1a; }
  .st-row-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  /* Toggle */
  .st-toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .st-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .st-toggle-track { position: absolute; inset: 0; border-radius: 11px; background: #334155; cursor: pointer; transition: background 0.2s; }
  .st-toggle input:checked + .st-toggle-track { background: #4f46e5; }
  .st-toggle-track::after { content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%; background: white; top: 3px; left: 3px; transition: transform 0.2s; }
  .st-toggle input:checked + .st-toggle-track::after { transform: translateX(18px); }
  /* Select */
  .st-select { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 7px 12px; color: #e2e8f0; font-family: inherit; font-size: 13px; outline: none; cursor: pointer; min-width: 140px; }
  .admin-page.light .st-select { background: #f8fafc; border-color: #e5e7eb; color: #1a1a1a; }
  /* Slider */
  .st-slider-wrap { display: flex; align-items: center; gap: 10px; min-width: 180px; }
  .st-slider { -webkit-appearance: none; appearance: none; width: 120px; height: 4px; border-radius: 2px; background: #334155; outline: none; cursor: pointer; }
  .st-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #4f46e5; cursor: pointer; }
  .st-slider-val { font-size: 13px; font-weight: 700; color: #a5b4fc; min-width: 36px; }
  /* Number input */
  .st-num { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 7px 12px; color: #e2e8f0; font-family: inherit; font-size: 13px; outline: none; width: 80px; text-align: center; }
  .admin-page.light .st-num { background: #f8fafc; border-color: #e5e7eb; color: #1a1a1a; }
  /* Danger zone */
  .st-danger-btn { padding: 8px 16px; border-radius: 8px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.15s; }
  .st-danger-btn.outline { background: none; border: 1px solid rgba(239,68,68,0.4); color: #ef4444; }
  .st-danger-btn.outline:hover { background: rgba(239,68,68,0.1); }
  .st-danger-btn.solid { background: #ef4444; border: none; color: white; }
  .st-danger-btn.solid:hover { background: #dc2626; }
  /* Saved banner */
  .st-saved-banner { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); border-radius: 10px; font-size: 13px; font-weight: 600; color: #10b981; }
  /* Profile card */
  .st-profile-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: #1e293b; border: 1px solid #334155; border-radius: 14px; }
  .admin-page.light .st-profile-card { background: white; border-color: #e5e7eb; }
  .st-profile-avatar { width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg,#6366f1,#8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: white; flex-shrink: 0; }
  .st-profile-name { font-size: 16px; font-weight: 800; color: #f1f5f9; }
  .admin-page.light .st-profile-name { color: #0f172a; }
  .st-profile-email { font-size: 13px; color: #64748b; margin-top: 2px; }
  .st-profile-role { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: rgba(168,85,247,0.15); color: #c084fc; margin-top: 6px; }
  .st-stat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; padding: 0 20px 16px; }
  .st-stat-box { background: #0f172a; border-radius: 9px; padding: 12px; text-align: center; }
  .admin-page.light .st-stat-box { background: #f8fafc; }
  .st-stat-num { font-size: 20px; font-weight: 800; color: #f1f5f9; }
  .admin-page.light .st-stat-num { color: #0f172a; }
  .st-stat-lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; margin-top: 2px; }
  .st-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }


  /* ═══ REPORTS PAGE ═══════════════════════════════════════════════════════ */
  .rp-page { display: flex; flex-direction: column; gap: 24px; }
  .rp-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .rp-header-btns { display: flex; gap: 8px; }
  .rp-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 9px; font-size: 12px; font-weight: 700; font-family: inherit; cursor: pointer; transition: all 0.15s; border: none; }
  .rp-btn.primary { background: #4f46e5; color: white; }
  .rp-btn.primary:hover { background: #4338ca; }
  .rp-btn.ghost { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
  .admin-page.light .rp-btn.ghost { background: white; color: #475569; border-color: #e5e7eb; }
  .rp-btn.ghost:hover { color: #e2e8f0; border-color: #475569; }
  .rp-tabs { display: flex; gap: 4px; background: #0f172a; border-radius: 12px; padding: 4px; width: fit-content; }
  .admin-page.light .rp-tabs { background: #e5e7eb; }
  .rp-tab { padding: 7px 16px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: none; color: #64748b; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
  .rp-tab.active { background: #1e293b; color: #e2e8f0; }
  .admin-page.light .rp-tab.active { background: white; color: #1a1a1a; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .rp-period-tabs { display: flex; gap: 4px; }
  .rp-period-btn { padding: 5px 12px; border-radius: 7px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid #334155; background: none; color: #64748b; font-family: inherit; transition: all 0.15s; }
  .rp-period-btn.active { background: #334155; color: #e2e8f0; border-color: #475569; }
  .admin-page.light .rp-period-btn.active { background: #1e293b; color: #f1f5f9; }
  /* Summary cards */
  .rp-summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
  .rp-sum-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px; }
  .admin-page.light .rp-sum-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .rp-sum-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .rp-sum-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
  .rp-sum-change { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 20px; }
  .rp-sum-change.up { background: rgba(16,185,129,0.15); color: #10b981; }
  .rp-sum-change.down { background: rgba(239,68,68,0.15); color: #ef4444; }
  .rp-sum-change.neutral { background: rgba(100,116,139,0.15); color: #64748b; }
  .rp-sum-num { font-size: 28px; font-weight: 800; color: #f1f5f9; letter-spacing: -1px; line-height: 1; }
  .admin-page.light .rp-sum-num { color: #0f172a; }
  .rp-sum-label { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
  /* Two col */
  .rp-two-col { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
  .rp-two-col-eq { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .rp-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; overflow: hidden; }
  .admin-page.light .rp-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .rp-card-head { padding: 16px 20px 14px; border-bottom: 1px solid #334155; display: flex; align-items: center; justify-content: space-between; }
  .admin-page.light .rp-card-head { border-color: #f3f4f6; }
  .rp-card-title { font-size: 14px; font-weight: 700; color: #e2e8f0; }
  .admin-page.light .rp-card-title { color: #1a1a1a; }
  .rp-card-sub { font-size: 11px; color: #64748b; }
  .rp-card-body { padding: 16px 20px; }
  /* Ministry breakdown table */
  .rp-ministry-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .rp-ministry-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .rp-ministry-name { font-size: 12px; color: #94a3b8; width: 150px; flex-shrink: 0; }
  .admin-page.light .rp-ministry-name { color: #475569; }
  .rp-ministry-bar-bg { flex: 1; height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden; }
  .admin-page.light .rp-ministry-bar-bg { background: #f1f5f9; }
  .rp-ministry-bar-fill { height: 100%; border-radius: 4px; }
  .rp-ministry-count { font-size: 12px; font-weight: 700; color: #e2e8f0; width: 28px; text-align: right; flex-shrink: 0; }
  .admin-page.light .rp-ministry-count { color: #1a1a1a; }
  .rp-ministry-pct { font-size: 11px; color: #475569; width: 32px; text-align: right; flex-shrink: 0; }
  /* Status funnel */
  .rp-funnel-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .rp-funnel-label { font-size: 12px; color: #94a3b8; width: 110px; flex-shrink: 0; }
  .admin-page.light .rp-funnel-label { color: #475569; }
  .rp-funnel-bar-bg { flex: 1; height: 22px; background: #0f172a; border-radius: 6px; overflow: hidden; }
  .admin-page.light .rp-funnel-bar-bg { background: #f1f5f9; }
  .rp-funnel-bar-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 10px; font-size: 11px; font-weight: 700; color: white; }
  .rp-funnel-count { font-size: 12px; font-weight: 700; color: #e2e8f0; width: 28px; text-align: right; flex-shrink: 0; }
  .admin-page.light .rp-funnel-count { color: #1a1a1a; }
  /* Priority donut */
  .rp-donut-wrap { display: flex; align-items: center; gap: 20px; }
  .rp-donut-legend { display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .rp-donut-row { display: flex; align-items: center; gap: 8px; }
  .rp-donut-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .rp-donut-lbl { font-size: 12px; color: #94a3b8; flex: 1; }
  .admin-page.light .rp-donut-lbl { color: #475569; }
  .rp-donut-val { font-size: 13px; font-weight: 700; color: #e2e8f0; }
  .admin-page.light .rp-donut-val { color: #1a1a1a; }
  .rp-donut-pct { font-size: 11px; color: #475569; width: 32px; text-align: right; }
  /* Downloadable reports list */
  .rp-report-row { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; cursor: pointer; }
  .admin-page.light .rp-report-row { border-color: #f3f4f6; }
  .rp-report-row:last-child { border-bottom: none; }
  .rp-report-row:hover { background: rgba(255,255,255,0.03); }
  .admin-page.light .rp-report-row:hover { background: #f9fafb; }
  .rp-report-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rp-report-name { font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .admin-page.light .rp-report-name { color: #1a1a1a; }
  .rp-report-meta { font-size: 11px; color: #64748b; margin-top: 2px; }
  .rp-report-size { font-size: 11px; color: #475569; margin-left: auto; white-space: nowrap; }
  .rp-dl-btn { display: flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 7px; font-size: 11px; font-weight: 700; font-family: inherit; cursor: pointer; background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.2); transition: all 0.15s; white-space: nowrap; }
  .rp-dl-btn:hover { background: rgba(99,102,241,0.2); }
  /* Audit log */
  .rp-audit-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .admin-page.light .rp-audit-row { border-color: #f3f4f6; }
  .rp-audit-row:last-child { border-bottom: none; }
  .rp-audit-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
  .rp-audit-action { font-size: 13px; font-weight: 600; color: #e2e8f0; }
  .admin-page.light .rp-audit-action { color: #1a1a1a; }
  .rp-audit-detail { font-size: 12px; color: #64748b; margin-top: 2px; }
  .rp-audit-time { font-size: 11px; color: #475569; margin-left: auto; white-space: nowrap; flex-shrink: 0; }
  /* Performance metrics */
  .rp-metric-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .admin-page.light .rp-metric-row { border-color: #f3f4f6; }
  .rp-metric-row:last-child { border-bottom: none; }
  .rp-metric-label { font-size: 13px; color: #94a3b8; }
  .admin-page.light .rp-metric-label { color: #475569; }
  .rp-metric-val { font-size: 14px; font-weight: 800; color: #e2e8f0; }
  .admin-page.light .rp-metric-val { color: #1a1a1a; }
  .rp-metric-bar { display: flex; align-items: center; gap: 8px; }
  .rp-metric-bg { width: 80px; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden; }
  .admin-page.light .rp-metric-bg { background: #f1f5f9; }
  .rp-metric-fill { height: 100%; border-radius: 3px; }

  .placeholder-page { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; text-align: center; }
  .placeholder-icon { width: 72px; height: 72px; border-radius: 20px; background: #1e293b; border: 1px solid #334155; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; color: #475569; }
  .admin-page.light .placeholder-icon { background: white; border-color: #e5e7eb; }
  .placeholder-title { font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; }
  .admin-page.light .placeholder-title { color: #1a1a1a; }
  .placeholder-desc { font-size: 14px; color: #64748b; }

  /* ═══ ANALYTICS PAGE ═══════════════════════════════════════════════════════ */
  .an-page { display: flex; flex-direction: column; gap: 24px; }
  .an-header { display: flex; align-items: flex-end; justify-content: space-between; }
  .an-title { font-size: 24px; font-weight: 800; color: #f1f5f9; letter-spacing: -0.5px; }
  .admin-page.light .an-title { color: #0f172a; }
  .an-subtitle { font-size: 13px; color: #64748b; margin-top: 3px; }
  .an-period-tabs { display: flex; gap: 4px; background: #0f172a; border-radius: 10px; padding: 4px; }
  .admin-page.light .an-period-tabs { background: #e5e7eb; }
  .an-period-tab { padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: none; color: #64748b; font-family: inherit; transition: all 0.15s; }
  .an-period-tab.active { background: #1e293b; color: #a5b4fc; }
  .admin-page.light .an-period-tab.active { background: white; color: #4f46e5; }
  .an-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .an-kpi { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 8px; }
  .admin-page.light .an-kpi { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .an-kpi-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; color: #475569; }
  .an-kpi-value { font-size: 28px; font-weight: 800; color: #f1f5f9; letter-spacing: -1px; line-height: 1; }
  .admin-page.light .an-kpi-value { color: #0f172a; }
  .an-kpi-sub { font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 5px; }
  .an-kpi-pill { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
  .an-kpi-pill.green { background: rgba(16,185,129,0.15); color: #10b981; }
  .an-kpi-pill.red { background: rgba(239,68,68,0.15); color: #ef4444; }
  .an-kpi-pill.blue { background: rgba(99,102,241,0.15); color: #818cf8; }
  .an-kpi-pill.amber { background: rgba(245,158,11,0.15); color: #f59e0b; }
  .an-row2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; }
  .an-row2b { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .an-card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 20px; }
  .admin-page.light .an-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .an-card-title { font-size: 14px; font-weight: 700; color: #e2e8f0; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
  .admin-page.light .an-card-title { color: #1e293b; }
  .an-card-badge { font-size: 11px; font-weight: 600; color: #64748b; background: #0f172a; padding: 3px 9px; border-radius: 6px; }
  .admin-page.light .an-card-badge { background: #f1f5f9; }
  .an-chart-svg { width: 100%; overflow: visible; }
  .an-chart-wrap { position: relative; padding-left: 32px; }
  .an-chart-labels { display: flex; justify-content: space-between; margin-top: 6px; padding-left: 32px; }
  .an-chart-label { font-size: 10px; color: #475569; text-align: center; }
  .an-chart-yaxis { position: absolute; left: 0; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; }
  .an-chart-ytick { font-size: 10px; color: #475569; line-height: 1; }
  .an-donut-wrap { display: flex; align-items: center; gap: 20px; }
  .an-donut-legend { display: flex; flex-direction: column; gap: 10px; flex: 1; }
  .an-donut-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .an-donut-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
  .an-donut-legend-label { color: #94a3b8; flex: 1; }
  .admin-page.light .an-donut-legend-label { color: #475569; }
  .an-donut-legend-val { color: #e2e8f0; font-weight: 700; font-size: 13px; }
  .admin-page.light .an-donut-legend-val { color: #1e293b; }
  .an-donut-legend-pct { color: #475569; font-size: 11px; width: 32px; text-align: right; }
  .an-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .an-bar-label { font-size: 11px; color: #94a3b8; width: 130px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .admin-page.light .an-bar-label { color: #475569; }
  .an-bar-bg { flex: 1; height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden; }
  .admin-page.light .an-bar-bg { background: #f1f5f9; }
  .an-bar-fill { height: 100%; border-radius: 4px; }
  .an-bar-count { font-size: 12px; font-weight: 700; color: #e2e8f0; width: 24px; text-align: right; }
  .admin-page.light .an-bar-count { color: #1e293b; }
  .an-priority-row { display: flex; gap: 12px; margin-bottom: 14px; }
  .an-priority-block { flex: 1; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 4px; }
  .an-priority-block.high { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); }
  .an-priority-block.medium { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); }
  .an-priority-block.low { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); }
  .an-priority-num { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
  .an-priority-block.high .an-priority-num { color: #ef4444; }
  .an-priority-block.medium .an-priority-num { color: #f59e0b; }
  .an-priority-block.low .an-priority-num { color: #10b981; }
  .an-priority-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .an-priority-block.high .an-priority-lbl { color: #fca5a5; }
  .an-priority-block.medium .an-priority-lbl { color: #fde68a; }
  .an-priority-block.low .an-priority-lbl { color: #6ee7b7; }
  .an-priority-pct { font-size: 11px; color: #64748b; }
  .an-funnel-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .an-funnel-label { font-size: 12px; color: #94a3b8; width: 110px; flex-shrink: 0; }
  .admin-page.light .an-funnel-label { color: #475569; }
  .an-funnel-bg { flex: 1; height: 22px; background: #0f172a; border-radius: 6px; overflow: hidden; }
  .admin-page.light .an-funnel-bg { background: #f1f5f9; }
  .an-funnel-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; padding-left: 8px; font-size: 11px; font-weight: 700; color: white; white-space: nowrap; }
  .an-funnel-count { font-size: 12px; font-weight: 700; color: #e2e8f0; width: 28px; text-align: right; }
  .admin-page.light .an-funnel-count { color: #1e293b; }
  .an-divider { height: 1px; background: #334155; margin: 4px 0 12px; }
  .admin-page.light .an-divider { background: #e5e7eb; }


  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); }
  .modal-panel { background: #1e293b; border: 1px solid #334155; border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 60px rgba(0,0,0,0.5); }
  .admin-page.light .modal-panel { background: white; border-color: #e5e7eb; }
  .modal-top { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #334155; }
  .admin-page.light .modal-top { border-color: #e5e7eb; }
  .modal-top h3 { font-size: 18px; font-weight: 700; color: #f1f5f9; }
  .admin-page.light .modal-top h3 { color: #1a1a1a; }
  .modal-close { width: 32px; height: 32px; background: #334155; border: none; border-radius: 8px; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .modal-close:hover { background: #475569; color: #e2e8f0; }
  .modal-body { padding: 24px; }
  .modal-field { margin-bottom: 18px; }
  .modal-field label { display: block; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .modal-field-value { font-size: 14px; color: #e2e8f0; line-height: 1.6; }
  .admin-page.light .modal-field-value { color: #1a1a1a; }
  .modal-field-value.desc { background: #0f172a; border-radius: 8px; padding: 12px; border: 1px solid #334155; }
  .admin-page.light .modal-field-value.desc { background: #f9fafb; border-color: #e5e7eb; }
  .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .modal-status-select { width: 100%; padding: 11px 14px; background: #0f172a; border: 1.5px solid #334155; border-radius: 10px; color: #e2e8f0; font-size: 14px; font-family: inherit; outline: none; transition: all 0.2s; cursor: pointer; }
  .modal-status-select:focus { border-color: #4f46e5; }
  .admin-page.light .modal-status-select { background: #f9fafb; border-color: #e5e7eb; color: #1a1a1a; }
  .modal-notes { width: 100%; padding: 11px 14px; background: #0f172a; border: 1.5px solid #334155; border-radius: 10px; color: #e2e8f0; font-size: 14px; font-family: inherit; outline: none; resize: vertical; min-height: 80px; transition: all 0.2s; }
  .modal-notes:focus { border-color: #4f46e5; }
  .admin-page.light .modal-notes { background: #f9fafb; border-color: #e5e7eb; color: #1a1a1a; }
  .modal-footer { display: flex; gap: 12px; padding: 16px 24px; border-top: 1px solid #334155; }
  .admin-page.light .modal-footer { border-color: #e5e7eb; }
  .btn-update { flex: 1; padding: 12px; background: linear-gradient(135deg, #4f46e5, #090088); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
  .btn-update:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79,70,229,0.4); }
  .btn-cancel { padding: 12px 20px; background: #334155; border: none; border-radius: 10px; color: #94a3b8; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
  .btn-cancel:hover { background: #475569; color: #e2e8f0; }
  .toast { position: fixed; bottom: 28px; right: 28px; color: white; padding: 14px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); z-index: 2000; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
`;

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMinistry, setFilterMinistry] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem('govcare-admin-settings') || 'null'); return s?.defaultMinistry || 'All'; } catch { return 'All'; }
  });
  const [filterStatus, setFilterStatus] = useState('All');
  const [pqFilter, setPqFilter] = useState('All');
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeNav, setActiveNav] = useState('overview');
  const [notifOpen, setNotifOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('7d');
  const [citSearch, setCitSearch] = useState('');
  const [selectedCitizen, setSelectedCitizen] = useState(null);
  const [umSearch, setUmSearch] = useState('');
  const [umUsers, setUmUsers] = useState([]);
  const [umLoading, setUmLoading] = useState(false);
  const [umSelected, setUmSelected] = useState(null);
  const [umConfirm, setUmConfirm] = useState(null);
  const [settingsData, setSettingsData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('govcare-admin-settings') || 'null') || {
        // Notifications
        notifNewComplaint:  true,
        notifHighPriority:  true,
        notifResolved:      false,
        notifDailyDigest:   false,
        // System
        autoRoutingEnabled: true,
        duplicateDetection: true,
        nlpConfidenceMin:   75,
        defaultMinistry:    'All',
        // Display
        rowsPerPage:        20,
        dateFormat:         'DD/MM/YYYY',
        language:           'English',
        // Security
        sessionTimeout:     60,
        requireMFA:         false,
        activityLog:        true,
      };
    } catch { return {}; }
  });
  const [settingsTab, setSettingsTab] = useState('general');
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [reportsPeriod, setReportsPeriod] = useState('30d');
  const [reportsTab, setReportsTab] = useState('overview');
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('govcare-notif-read') || '[]'); } catch { return []; }
  });
  const notifRef = useRef(null);

  const user = auth.currentUser;
  const displayName = user?.displayName || 'Admin';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'light') setDarkMode(false);

    const loadComplaints = async () => {
      try {
        const snap = await getDocs(collection(db, 'complaints'));
        const data = await Promise.all(snap.docs.map(async d => {
          const raw = d.data();
          const dec = await decryptFields(raw, ['title', 'description', 'citizenName', 'citizenEmail']);
          const pTitle = dec.title || '';
          const pDesc  = dec.description || '';
          const pName  = dec.citizenName || '';
          const pEmail = dec.citizenEmail || '';

          let integrityOk = null;
          if (raw._integrity) {
            const payload = {
              citizenEmail: pEmail, citizenId: raw.citizenId || '',
              citizenName:  pName,  date:      raw.date       || '',
              description:  pDesc,  id:        raw.id         || '',
              ministry:     raw.ministry || '', priority: raw.priority || '',
              title:        pTitle,
            };
            integrityOk = await verifyIntegrity(payload, raw._integrity);
          }

          return {
            docId:         d.id,
            id:            raw.id || d.id,
            citizenId:     raw.citizenId,
            title:         pTitle,
            description:   pDesc,
            citizenName:   pName,
            citizenEmail:  pEmail,
            ministry:      raw.ministry,
            ministryLabel: raw.ministryLabel,
            status:        raw.status,
            date:          raw.date,
            adminNotes:    raw.adminNotes,
            nlpClassified: raw.nlpClassified,
            nlpConfidence: raw.nlpConfidence,
            nlpAllScores:  raw.nlpAllScores,
            fileCount:     raw.fileCount,
            _integrityOk:  integrityOk,
            citizen:       pName || 'Unknown',
            email:         pEmail || '—',
            priority:      determinePriority(pTitle, pDesc, raw.ministry || ''),
          };
        }));
        setComplaints(data.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
      } catch (e) { console.error('Failed to load complaints:', e); }
      setLoading(false);
    };

    loadComplaints();

    // Re-fetch when Firestore changes
    const q = query(collection(db, 'complaints'));
    let debounce = null;
    const unsub = onSnapshot(q, () => {
      clearTimeout(debounce);
      debounce = setTimeout(loadComplaints, 800);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (complaints.length === 0) return;
    const ns = settingsData; // notification settings
    const notifs = [];
    complaints.forEach(c => {
      const daysAgo = c.date ? Math.floor((new Date() - new Date(c.date)) / 86400000) : 0;
      const timeLabel = daysAgo === 0 ? 'Just now' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
      if (ns.notifNewComplaint !== false && c.status === 'Submitted') {
        notifs.push({ id: `new-${c.id}`, type: 'new', title: c.title, ministry: c.ministry, complaintId: c.id, time: timeLabel, complaint: c });
      }
      if (ns.notifHighPriority !== false && c.priority === 'High' && !['Resolved','Rejected'].includes(c.status)) {
        notifs.push({ id: `urgent-${c.id}`, type: 'urgent', title: c.title, ministry: c.ministry, complaintId: c.id, time: timeLabel, complaint: c });
      }
      if (ns.notifResolved === true && c.status === 'Resolved') {
        notifs.push({ id: `resolved-${c.id}`, type: 'resolved', title: c.title, ministry: c.ministry, complaintId: c.id, time: timeLabel, complaint: c });
      }
      if (ns.notifRejected === true && c.status === 'Rejected') {
        notifs.push({ id: `rejected-${c.id}`, type: 'rejected', title: c.title, ministry: c.ministry, complaintId: c.id, time: timeLabel, complaint: c });
      }
    });
    setNotifications(notifs.slice(0, 15));
  }, [complaints, settingsData]);

  useEffect(() => {
    function onClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Session timeout — real inactivity timer
  useEffect(() => {
    const mins = settingsData.sessionTimeout || 60;
    if (mins <= 0) return;
    const ms = mins * 60 * 1000;
    let timer = setTimeout(handleLogout, ms);
    const reset = () => { clearTimeout(timer); timer = setTimeout(handleLogout, ms); };
    const events = ['mousemove','keydown','click','scroll'];
    events.forEach(e => window.addEventListener(e, reset));
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [settingsData.sessionTimeout]);

  // Real-time listener for users collection (User Management page)
  useEffect(() => {
    setUmLoading(true);
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs
        .map(d => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setUmUsers(data);
      setUmLoading(false);
    }, () => setUmLoading(false));
    return () => unsub();
  }, []);

  async function handleUpdateStatus() {
    if (!newStatus || !selected) return;
    setUpdating(true);
    try {
      // Use docId (Firestore document ID) for the update, not the display ID
      await updateDoc(doc(db, 'complaints', selected.docId), {
        status: newStatus,
        adminNotes,
        updatedAt: new Date().toISOString(),
      });
      // onSnapshot will automatically refresh complaints list
      showToast(`Status updated to "${newStatus}"`);
      setSelected(null);
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Update failed. Please try again.', true);
    }
    setUpdating(false);
  }

  function showToast(msg, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3000);
  }

  function openModal(c) { setSelected(c); setNewStatus(c.status); setAdminNotes(c.adminNotes || ''); }

  function markAllRead() {
    const ids = notifications.map(n => n.id);
    setReadIds(ids);
    localStorage.setItem('govcare-notif-read', JSON.stringify(ids));
  }

  function markRead(id) {
    const updated = [...new Set([...readIds, id])];
    setReadIds(updated);
    localStorage.setItem('govcare-notif-read', JSON.stringify(updated));
  }

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('govcare-theme', next ? 'dark' : 'light');
  }

  async function handleLogout() {
    await signOut(auth);
    navigate('/');
  }

  function goTo(id) {
    setActiveNav(id);
    setSearch('');
    setFilterMinistry(settingsData.defaultMinistry || 'All');
    setFilterStatus('All');
  }

  function handleExportCSV() {
    const lines = ['Complaint ID,Title,Ministry,Status,Priority,Date,Citizen,Email'];
    complaints.forEach(c => lines.push(`${c.id},"${c.title}",${c.ministry},${c.status},${c.priority || 'Medium'},${c.date || ''},${c.citizen},${c.email}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `GovCare_Complaints_${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
    showToast('CSV exported!');
  }

  function handleGenerateReport() {
    const date = new Date().toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' });
    const lines = [
      `GovCare+ Complaint Management Report — ${date}`, '',
      `SUMMARY`, `Total: ${complaints.length}`,
      `Pending/New: ${complaints.filter(c => ['Submitted','Pending Review'].includes(c.status)).length}`,
      `In Progress: ${complaints.filter(c => c.status === 'In Progress').length}`,
      `Resolved: ${complaints.filter(c => c.status === 'Resolved').length}`, '',
      `HIGH PRIORITY (UNRESOLVED)`,
      ...complaints.filter(c => c.priority === 'High' && !['Resolved','Rejected'].includes(c.status)).map(c => `  [${c.id}] ${c.title} | ${c.ministry} | ${c.status}`),
      '', `ALL COMPLAINTS`,
      ...complaints.map(c => `  [${c.id}] ${c.title} | ${c.ministry} | ${c.status} | ${c.priority} | ${c.citizen}`),
    ];
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' })), download: `GovCare_Report_${new Date().toISOString().slice(0,10)}.txt` });
    a.click();
    showToast('Report generated!');
  }

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => ['Pending Review','Submitted'].includes(c.status)).length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  };

  // Date formatter — respects settings
  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    const fmt = settingsData.dateFormat || 'DD/MM/YYYY';
    if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
    if (fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
    return `${dd}/${mm}/${yyyy}`;
  }

  const filtered = complaints.filter(c => {
    const s = search.toLowerCase();
    const showResolved = settingsData.showResolved !== false; // default true
    if (!showResolved && filterStatus === 'All' && c.status === 'Resolved') return false;
    return (!s || c.title?.toLowerCase().includes(s) || c.id?.toLowerCase().includes(s) || c.citizen?.toLowerCase().includes(s))
      && (filterMinistry === 'All' || c.ministry === filterMinistry)
      && (filterStatus === 'All' || c.status === filterStatus);
  });

  const priorityQueue = complaints
    .filter(c => !['Resolved','Rejected'].includes(c.status))
    .sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 1) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 1));

  const filteredPQ = pqFilter === 'All' ? priorityQueue : priorityQueue.filter(c => c.priority === pqFilter);

  // Duplicate detection — manual routing ONLY for duplicates
  const normalize = str => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const similarity = (a, b) => {
    const wa = new Set(normalize(a).split(' ').filter(w => w.length > 3));
    const wb = new Set(normalize(b).split(' ').filter(w => w.length > 3));
    const intersection = [...wa].filter(w => wb.has(w)).length;
    const union = new Set([...wa, ...wb]).size;
    return union === 0 ? 0 : intersection / union;
  };
  // Similarity threshold from settings (default 50%)
  const simThreshold = (settingsData.similarityThreshold || 50) / 100;
  const dupEnabled = settingsData.duplicateDetection !== false;
  // Build groups of duplicate complaint IDs
  const duplicateGroups = []; // each group = array of docIds
  const assignedToDupe = new Set();
  const activeComplaints = complaints.filter(c => !['Resolved', 'Rejected'].includes(c.status));
  if (dupEnabled) activeComplaints.forEach((c, i) => {
    activeComplaints.forEach((other, j) => {
      if (i >= j) return;
      if (c.ministry === other.ministry && similarity(c.title || '', other.title || '') >= simThreshold) {
        const cId = c.docId || c.id;
        const oId = other.docId || other.id;
        // Find if either is already in a group
        const existingGroup = duplicateGroups.find(g => g.includes(cId) || g.includes(oId));
        if (existingGroup) {
          if (!existingGroup.includes(cId)) existingGroup.push(cId);
          if (!existingGroup.includes(oId)) existingGroup.push(oId);
        } else {
          duplicateGroups.push([cId, oId]);
        }
        assignedToDupe.add(cId);
        assignedToDupe.add(oId);
      }
    });
  });
  // If any complaint in a duplicate group is High, escalate ALL in that group to High
  const escalatedIds = new Set();
  duplicateGroups.forEach(group => {
    const groupComplaints = complaints.filter(c => group.includes(c.docId || c.id));
    const hasHigh = groupComplaints.some(c => c.priority === 'High');
    if (hasHigh) group.forEach(id => escalatedIds.add(id));
  });
  const manualReview = complaints
    .filter(c => assignedToDupe.has(c.docId || c.id))
    .map(c => ({
      ...c,
      priority: escalatedIds.has(c.docId || c.id) ? 'High' : c.priority,
    }));

  // ── Reusable complaint table ──
  function ComplaintTable({ data }) {
    const [ctPage, setCtPage] = useState(0);
    const rowsPerPage = settingsData.rowsPerPage || 20;
    const compact = settingsData.compactTable === true;
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const paged = data.slice(ctPage * rowsPerPage, (ctPage + 1) * rowsPerPage);

    if (loading) return <div className="empty-state"><p>Loading...</p></div>;
    if (!data.length) return <div className="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><p>No complaints found</p></div>;
    return (
      <div>
        <div className="complaints-table-wrap">
          <div className="table-header-row">
            <span className="col-id">Complaint ID</span>
            <span className="col-title">Title & Citizen</span>
            <span className="col-ministry">Ministry</span>
            <span className="col-status">Status</span>
            <span className="col-priority">Priority</span>
            <span className="col-date">Date</span>
            <span className="col-action">Action</span>
          </div>
          {paged.map(c => {
            const sc = STATUS_COLORS[c.status] || { bg: '#e5e7eb', color: '#374151' };
            return (
              <div key={c.id} className="complaint-row" style={compact?{padding:'8px 16px'}:{}} onClick={() => openModal(c)}>
                <div className="col-id"><span className="complaint-id">{c.id}</span></div>
                <div className="col-title">
                  <div className="complaint-title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {c.title}
                    {c._integrity != null && (
                      <span title={c._integrityOk ? 'Data integrity verified' : 'WARNING: Data may have been tampered with!'}
                        style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:4, flexShrink:0,
                          background: c._integrityOk ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color: c._integrityOk ? '#10b981' : '#ef4444',
                          border: `1px solid ${c._integrityOk ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                        {c._integrityOk ? '✓ Verified' : '⚠ Tampered'}
                      </span>
                    )}
                  </div>
                  {!compact && <div className="complaint-citizen">{c.citizen} · {c.email}</div>}
                </div>
                <div className="col-ministry">
                  <span className="ministry-tag">
                    <span className="ministry-dot" style={{ background: MINISTRY_COLORS[c.ministry] || '#6b7280' }}></span>
                    <span style={{ fontSize: 13, color: MINISTRY_COLORS[c.ministry] || '#6b7280', fontWeight: 600 }}>{c.ministry}</span>
                  </span>
                </div>
                <div className="col-status"><span className="status-pill" style={{ background: sc.bg, color: sc.color }}>{c.status}</span></div>
                <div className="col-priority"><span className={`priority-badge priority-${(c.priority || 'medium').toLowerCase()}`}>{c.priority || 'Medium'}</span></div>
                <div className="col-date"><span className="complaint-date">{formatDate(c.date)}</span></div>
                <div className="col-action">
                  <button className="action-btn" onClick={e => { e.stopPropagation(); openModal(c); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 4px',marginTop:4}}>
            <span style={{fontSize:12,color:'#64748b'}}>
              Showing {ctPage * rowsPerPage + 1}–{Math.min((ctPage + 1) * rowsPerPage, data.length)} of {data.length} complaints
            </span>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setCtPage(p=>Math.max(0,p-1))} disabled={ctPage===0}
                style={{padding:'5px 12px',borderRadius:7,border:'1px solid #334155',background:'none',color:ctPage===0?'#334155':'#94a3b8',cursor:ctPage===0?'default':'pointer',fontSize:12,fontFamily:'inherit'}}>
                ← Prev
              </button>
              {Array.from({length:totalPages},(_,i)=>i).filter(i=>Math.abs(i-ctPage)<=2).map(i=>(
                <button key={i} onClick={()=>setCtPage(i)}
                  style={{padding:'5px 10px',borderRadius:7,border:'1px solid #334155',background:i===ctPage?'#4f46e5':'none',color:i===ctPage?'white':'#94a3b8',cursor:'pointer',fontSize:12,fontFamily:'inherit',minWidth:30}}>
                  {i+1}
                </button>
              ))}
              <button onClick={()=>setCtPage(p=>Math.min(totalPages-1,p+1))} disabled={ctPage===totalPages-1}
                style={{padding:'5px 12px',borderRadius:7,border:'1px solid #334155',background:'none',color:ctPage===totalPages-1?'#334155':'#94a3b8',cursor:ctPage===totalPages-1?'default':'pointer',fontSize:12,fontFamily:'inherit'}}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Page content switch ──
  function renderMain() {

    if (activeNav === 'overview') {
      const totalComplaints = complaints.length;
      const pendingReview = complaints.filter(c => c.status === 'Pending Review').length;
      const nlpAccuracy = 87.5;
      const maxCount = Math.max(...MINISTRIES.slice(1).map(m => complaints.filter(c => c.ministry === m).length), 1);
      const highPQ = complaints
        .filter(c => !['Resolved','Rejected'].includes(c.status))
        .sort((a, b) => ({ High: 0, Medium: 1, Low: 2 }[a.priority] ?? 1) - ({ High: 0, Medium: 1, Low: 2 }[b.priority] ?? 1))
        .slice(0, 3);
      const daysAgoLabel = (date) => {
        if (!date) return 'Unknown';
        const d = Math.floor((new Date() - new Date(date)) / 86400000);
        if (d === 0) return 'Today';
        if (d === 1) return 'Yesterday';
        return `${d} days ago`;
      };
      const getBadge = (c, i) => {
        if (c.priority === 'High' && i === 0) return { cls: 'urgent', label: 'URGENT' };
        const daysAgo = c.date ? Math.floor((new Date() - new Date(c.date)) / 86400000) : 0;
        if (daysAgo >= 5) return { cls: 'overdue', label: 'OVERDUE' };
        return { cls: 'lowconf', label: 'LOW CONFIDENCE' };
      };

      // ── Chart data from real Firestore complaints ──
      const periodDays = chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : 90;
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const buckets = Array.from({ length: periodDays }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (periodDays - 1 - i));
        return { date: d.toISOString().slice(0, 10), count: 0 };
      });
      complaints.forEach(c => {
        const dateStr = c.date || (c.createdAt?.toDate ? c.createdAt.toDate().toISOString().slice(0, 10) : null);
        if (!dateStr) return;
        const bucket = buckets.find(b => b.date === dateStr);
        if (bucket) bucket.count++;
      });
      const points = buckets.map(b => b.count);
      const chartH = 160, chartW = 600;
      const min = Math.min(...points), max = Math.max(...points, 1);
      const toY = v => chartH - ((v - min) / (max - min || 1)) * (chartH - 20) - 10;
      const toX = i => (i / (points.length - 1)) * chartW;
      const pathD = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');
      const fillD = `${pathD} L ${chartW} ${chartH} L 0 ${chartH} Z`;

      return (
        <>
          {/* Header */}
          <div className="ov-top-bar">
            <div>
              <div className="page-title">Admin Dashboard</div>
              <div className="page-subtitle">Real-time system overview and operational metrics</div>
            </div>
            <div className="ov-top-btns">
              <button className="ov-btn-ghost" onClick={handleGenerateReport}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Generate Report
              </button>
              <button className="ov-btn-primary" onClick={() => goTo('priority-queue')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Review Queue
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="ov-kpis">
            {[
              { num: totalComplaints, lbl: 'Complaints Today', badge: '+12%', cls: 'pos', iconBg: 'rgba(59,130,246,0.15)', iconColor: '#3b82f6', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" strokeWidth="2"/></svg> },
              { num: pendingReview, lbl: 'Pending Review', badge: '+8', cls: 'pos', iconBg: 'rgba(249,115,22,0.15)', iconColor: '#f97316', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14" fill="none" stroke="white" strokeWidth="2"/></svg> },
              { num: manualReview.length, lbl: 'Duplicate Complaints', badge: manualReview.length > 0 ? `${manualReview.length} found` : 'None', cls: manualReview.length > 0 ? 'neg' : 'neutral', iconBg: 'rgba(239,68,68,0.15)', iconColor: '#ef4444', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" fill="none"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="white" strokeWidth="2" fill="none"/></svg> },
              { num: `${nlpAccuracy}%`, lbl: 'NLP Accuracy', badge: '+5%', cls: 'pos', iconBg: 'rgba(16,185,129,0.15)', iconColor: '#10b981', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            ].map((k, i) => (
              <div key={i} className="ov-kpi">
                <div className="ov-kpi-top">
                  <div className="ov-kpi-icon" style={{ background: k.iconBg, color: k.iconColor }}>{k.icon}</div>
                  <span className={`ov-kpi-badge ${k.cls}`}>{k.badge}</span>
                </div>
                <div className="ov-kpi-num">{k.num}</div>
                <div className="ov-kpi-lbl">{k.lbl}</div>
              </div>
            ))}
          </div>

          {/* Chart + Category Distribution */}
          <div className="ov-mid-row">
            <div className="ov-chart-card">
              <div className="ov-chart-top">
                <div className="ov-chart-title">Complaint Volume Trends</div>
                <select className="ov-chart-sel" value={chartPeriod} onChange={e => setChartPeriod(e.target.value)}>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
              <div className="ov-chart-body">
                <svg className="ov-chart-line-svg" viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#CBA7D5" stopOpacity="0.35"/>
                      <stop offset="100%" stopColor="#CBA7D5" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={fillD} fill="url(#chartGrad)"/>
                  <path d={pathD} fill="none" stroke="#CBA7D5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                </svg>
                <span className="ov-chart-ghost"></span>
              </div>
            </div>

            <div className="ov-dist-card">
              <div className="ov-dist-title">Category Distribution</div>
              {MINISTRIES.slice(1).map(m => {
                const count = complaints.filter(c => c.ministry === m).length;
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={m} className="ov-dist-row">
                    <div className="ov-dist-icon" style={{ background: MINISTRY_COLORS[m] + '22' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: MINISTRY_COLORS[m], display: 'block' }}></span>
                    </div>
                    <div className="ov-dist-name">{m}</div>
                    <div className="ov-dist-bar-bg">
                      <div className="ov-dist-bar-fill" style={{ width: `${pct}%`, background: MINISTRY_COLORS[m] }}></div>
                    </div>
                    <div className="ov-dist-val">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-Priority Queue */}
          <div className="ov-pq-wrap">
            <div className="ov-pq-top">
              <div className="ov-pq-heading">High-Priority Queue</div>
              <button className="ov-pq-viewall" onClick={() => goTo('priority-queue')}>View All →</button>
            </div>
            {highPQ.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#475569', fontSize: 13 }}>No urgent complaints at this time.</div>
            ) : highPQ.map((c, i) => {
              const badge = getBadge(c, i);
              const borderCls = c.priority === 'High' ? 'red' : 'amber';
              return (
                <div key={c.id} className={`ov-pq-row ${borderCls}`} onClick={() => openModal(c)}>
                  <div>
                    <div className="ov-pq-row-title">{c.title}</div>
                    <div className="ov-pq-row-meta">
                      <span className="ov-pq-row-id">{c.id}</span>
                      <span>•</span>
                      <span>Submitted {daysAgoLabel(c.date)}</span>
                      <span>•</span>
                      <span style={{ color: MINISTRY_COLORS[c.ministry] || '#94a3b8', fontWeight: 600 }}>{c.ministry}</span>
                    </div>
                  </div>
                  <span className={`ov-badge ${badge.cls}`}>{badge.label}</span>
                </div>
              );
            })}
          </div>

          {/* Bottom metrics */}
          <div className="ov-bottom-row">
            <div className="ov-metric">
              <div className="ov-metric-lbl">Average Resolution Time</div>
              <div className="ov-metric-val">4.2 days</div>
              <div className="ov-metric-sub green">↓ 12% faster</div>
            </div>
            <div className="ov-metric">
              <div className="ov-metric-lbl">Auto-Routing Success Rate</div>
              <div className="ov-metric-val">89%</div>
              <div className="ov-metric-sub blue">↑ +3%</div>
            </div>
            <div className="ov-metric">
              <div className="ov-metric-lbl">Citizen Satisfaction</div>
              <div className="ov-metric-val">4.6/5</div>
              <div className="ov-metric-sub purple">↑ +0.2</div>
            </div>
          </div>
        </>
      );
    }

    if (activeNav === 'all-complaints') return (
      <>
        <div className="page-title">All Complaints</div>
        <div className="page-subtitle">View and manage every complaint submitted by citizens</div>
        <div className="toolbar">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search complaints, ID, citizen..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterMinistry} onChange={e => setFilterMinistry(e.target.value)}>
            {MINISTRIES.map(m => <option key={m}>{m}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <button className="report-btn" onClick={handleGenerateReport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Generate Report
          </button>
          <button className="export-btn" onClick={handleExportCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
        {settingsData.autoRoutingEnabled === false && (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,fontSize:12,color:'#ef4444',fontWeight:600,marginBottom:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Auto-routing is disabled — complaints are not being automatically assigned to ministries
          </div>
        )}
        {settingsData.showResolved === false && filterStatus === 'All' && (
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:10,fontSize:12,color:'#a5b4fc',fontWeight:600,marginBottom:8}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            Resolved complaints are hidden — change in Settings → General → Show Resolved
          </div>
        )}
        <ComplaintTable data={filtered} />
      </>
    );

    if (activeNav === 'manual-review') return (
      <>
        <div className="page-title">Manual Routing — Duplicate Complaints</div>
        <div className="page-subtitle">Complaints flagged as duplicates by BERT NLP. All other complaints are auto-routed. Review duplicates and reject or keep.</div>
        <div className="mrq-info-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {!dupEnabled
            ? 'Duplicate detection is disabled — enable it in Settings → System → Duplicate Detection.'
            : manualReview.length === 0
              ? 'No duplicate complaints detected. BERT NLP has successfully auto-routed all complaints.'
              : `${manualReview.length} duplicate complaint${manualReview.length !== 1 ? 's' : ''} require manual review (similarity threshold: ${settingsData.similarityThreshold || 50}%). If any complaint in a group is High priority, all duplicates are escalated to High.`
          }
        </div>
        <ComplaintTable data={manualReview} />
      </>
    );

    if (activeNav === 'priority-queue') return (
      <>
        <div className="pq-page-header">
          <div>
            <div className="page-title">Priority Queue</div>
            <div className="page-subtitle">Unresolved complaints sorted by urgency — address High priority first</div>
          </div>
          <span className="pq-high-badge">🔴 {priorityQueue.filter(c => c.priority === 'High').length} High Priority</span>
        </div>
        <div className="pq-filter-row">
          {[['All','active-all'],['High','active-high'],['Medium','active-medium'],['Low','active-low']].map(([f, cls]) => (
            <button key={f} className={`pq-filter-btn${pqFilter === f ? ' ' + cls : ''}`} onClick={() => setPqFilter(f)}>
              {f === 'All' ? 'All Priorities' : `${f} Priority`}
            </button>
          ))}
        </div>
        <div className="pq-list">
          {filteredPQ.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <p>No complaints in this priority level</p>
            </div>
          ) : filteredPQ.map((c, i) => {
            const prio = (c.priority || 'medium').toLowerCase();
            const sc = STATUS_COLORS[c.status] || { bg: '#e5e7eb', color: '#374151' };
            const daysAgo = c.date ? Math.floor((new Date() - new Date(c.date)) / 86400000) : null;
            const urgency = prio === 'high' && daysAgo > 3 ? 'critical' : prio === 'high' ? 'urgent' : prio === 'medium' ? 'moderate' : 'normal';
            const urgencyLabel = { critical: 'CRITICAL', urgent: 'URGENT', moderate: 'MODERATE', normal: 'NORMAL' }[urgency];
            return (
              <div key={c.id} className={`pq-card ${prio}`} onClick={() => openModal(c)}>
                <div className={`pq-rank ${prio}`}>#{i + 1}</div>
                <div className="pq-info">
                  <div className="pq-title">{c.title}</div>
                  <div className="pq-meta">
                    <span className="pq-id">{c.id}</span>
                    <span>·</span>
                    <span style={{ color: MINISTRY_COLORS[c.ministry], fontWeight: 600 }}>{c.ministry}</span>
                    <span>·</span>
                    <span>{c.citizen}</span>
                  </div>
                </div>
                <div className="pq-right">
                  <span className={`pq-urgency ${urgency}`}>{urgencyLabel}</span>
                  <span className="status-pill" style={{ background: sc.bg, color: sc.color, fontSize: 11, padding: '3px 8px' }}>{c.status}</span>
                  {daysAgo !== null && <span className="pq-days">{daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );

    // ═══ ANALYTICS PAGE ════════════════════════════════════════════════════════
    if (activeNav === 'analytics') {
      const total = complaints.length;
      const resolved = complaints.filter(c => c.status === 'Resolved').length;
      const rejected = complaints.filter(c => c.status === 'Rejected').length;
      const inProgress = complaints.filter(c => c.status === 'In Progress').length;
      const pending = complaints.filter(c => ['Submitted','Pending Review'].includes(c.status)).length;
      const highCount = complaints.filter(c => c.priority === 'High').length;
      const medCount = complaints.filter(c => c.priority === 'Medium').length;
      const lowCount = complaints.filter(c => c.priority === 'Low').length;
      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
      const avgDays = (() => {
        const diffs = complaints
          .filter(c => c.status === 'Resolved' && c.date && c.updatedAt)
          .map(c => (new Date(c.updatedAt) - new Date(c.date)) / 86400000);
        return diffs.length ? (diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(1) : '—';
      })();

      // Line chart — last 30 days
      const anDays = 30;
      const today = new Date(); today.setHours(23,59,59,999);
      const buckets = Array.from({length: anDays}, (_,i) => {
        const d = new Date(today); d.setDate(today.getDate()-(anDays-1-i));
        return { label: d.toLocaleDateString('en-MY',{day:'numeric',month:'short'}), date: d.toISOString().slice(0,10), count: 0 };
      });
      complaints.forEach(c => {
        const ds = c.date || (c.createdAt?.toDate ? c.createdAt.toDate().toISOString().slice(0,10) : null);
        if (!ds) return;
        const b = buckets.find(b => b.date === ds);
        if (b) b.count++;
      });
      const pts = buckets.map(b => b.count);
      const cW = 560, cH = 120;
      const maxV = Math.max(...pts, 1);
      const toY = v => cH - (v / maxV) * (cH - 16) - 4;
      const toX = i => (i / (pts.length-1)) * cW;
      const linePath = pts.map((v,i) => `${i===0?'M':'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`).join(' ');
      const fillPath = `${linePath} L ${cW} ${cH} L 0 ${cH} Z`;
      // Show every 5th label
      const labelIdxs = buckets.map((_,i) => i).filter(i => i % 5 === 0 || i === anDays-1);

      // Donut chart for status
      const donutData = [
        { label: 'Resolved',       val: resolved,   color: '#8b5cf6' },
        { label: 'In Progress',    val: inProgress, color: '#3b82f6' },
        { label: 'Pending Review', val: pending,    color: '#f59e0b' },
        { label: 'Rejected',       val: rejected,   color: '#ef4444' },
      ].filter(d => d.val > 0);
      const donutTotal = donutData.reduce((a,d)=>a+d.val, 0) || 1;
      const r = 52, cx2 = 64, cy2 = 64, strokeW = 18;
      const circumference = 2 * Math.PI * r;
      let donutOffset = 0;
      const donutSegs = donutData.map(d => {
        const dashLen = (d.val / donutTotal) * circumference;
        const seg = { ...d, dashLen, dashOffset: -donutOffset, pct: Math.round((d.val/donutTotal)*100) };
        donutOffset += dashLen;
        return seg;
      });

      // Ministry bar chart
      const ministryBars = MINISTRIES.slice(1).map(m => ({
        name: m, count: complaints.filter(c=>c.ministry===m).length, color: MINISTRY_COLORS[m]
      })).sort((a,b) => b.count - a.count);
      const maxBar = Math.max(...ministryBars.map(m=>m.count), 1);

      // Status funnel
      const funnelData = [
        { label: 'Submitted',     val: complaints.filter(c=>c.status==='Submitted').length,     color: '#3b82f6' },
        { label: 'Pending Review',val: complaints.filter(c=>c.status==='Pending Review').length, color: '#f59e0b' },
        { label: 'In Progress',   val: inProgress, color: '#06b6d4' },
        { label: 'Resolved',      val: resolved,   color: '#10b981' },
        { label: 'Rejected',      val: rejected,   color: '#ef4444' },
      ];
      const maxFunnel = Math.max(...funnelData.map(f=>f.val), 1);

      return (
        <div className="an-page">
          {/* Header */}
          <div className="an-header">
            <div>
              <div className="an-title">Analytics</div>
              <div className="an-subtitle">Real-time insights from {total} complaint{total!==1?'s':''} across all ministries</div>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="an-kpis">
            <div className="an-kpi">
              <div className="an-kpi-label">Total Complaints</div>
              <div className="an-kpi-value">{total}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill blue">All time</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Resolution Rate</div>
              <div className="an-kpi-value">{resolutionRate}%</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill green">{resolved} resolved</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Avg. Resolution</div>
              <div className="an-kpi-value">{avgDays}<span style={{fontSize:14,fontWeight:500,color:'#64748b'}}>{avgDays!=='—'?' days':''}</span></div>
              <div className="an-kpi-sub"><span className="an-kpi-pill amber">from submission</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">High Priority</div>
              <div className="an-kpi-value">{highCount}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill red">{total>0?Math.round(highCount/total*100):0}% of total</span></div>
            </div>
          </div>

          {/* Line Chart + Donut */}
          <div className="an-row2">
            <div className="an-card">
              <div className="an-card-title">
                Complaint Volume — Last 30 Days
                <span className="an-card-badge">{pts.reduce((a,b)=>a+b,0)} total</span>
              </div>
              <div className="an-chart-wrap">
                <div className="an-chart-yaxis">
                  <span className="an-chart-ytick">{maxV}</span>
                  <span className="an-chart-ytick">{Math.round(maxV/2)}</span>
                  <span className="an-chart-ytick">0</span>
                </div>
                <svg className="an-chart-svg" viewBox={`0 0 ${cW} ${cH}`} preserveAspectRatio="none" style={{height:120}}>
                  <defs>
                    <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={darkMode ? 0.3 : 0.2}/>
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d={fillPath} fill="url(#anGrad)"/>
                  <path d={linePath} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                  {/* Dots on peaks */}
                  {pts.map((v,i) => v === maxV ? (
                    <circle key={i} cx={toX(i)} cy={toY(v)} r="4" fill="#a78bfa" stroke={darkMode ? '#1e293b' : '#ffffff'} strokeWidth="2"/>
                  ) : null)}
                </svg>
              </div>
              <div className="an-chart-labels">
                {labelIdxs.map(i => (
                  <span key={i} className="an-chart-label">{buckets[i].label}</span>
                ))}
              </div>
            </div>

            <div className="an-card">
              <div className="an-card-title">Status Breakdown</div>
              {donutData.length === 0 ? (
                <div style={{textAlign:'center',color:'#475569',padding:'40px 0',fontSize:13}}>No data yet</div>
              ) : (
                <div className="an-donut-wrap">
                  <svg width="128" height="128" viewBox="0 0 128 128" style={{flexShrink:0}}>
                    <circle cx={cx2} cy={cy2} r={r} fill="none" stroke={darkMode ? '#0f172a' : '#f1f5f9'} strokeWidth={strokeW}/>
                    {donutSegs.map((seg,i) => (
                      <circle key={i} cx={cx2} cy={cy2} r={r} fill="none"
                        stroke={seg.color} strokeWidth={strokeW}
                        strokeDasharray={`${seg.dashLen} ${circumference - seg.dashLen}`}
                        strokeDashoffset={seg.dashOffset}
                        style={{transform:'rotate(-90deg)',transformOrigin:'64px 64px'}}/>
                    ))}
                    <text x={cx2} y={cy2-6} textAnchor="middle" fill={darkMode ? '#f1f5f9' : '#0f172a'} fontSize="16" fontWeight="800">{total}</text>
                    <text x={cx2} y={cy2+10} textAnchor="middle" fill="#64748b" fontSize="10">total</text>
                  </svg>
                  <div className="an-donut-legend">
                    {donutSegs.map((seg,i) => (
                      <div key={i} className="an-donut-legend-item">
                        <span className="an-donut-dot" style={{background:seg.color}}/>
                        <span className="an-donut-legend-label">{seg.label}</span>
                        <span className="an-donut-legend-val">{seg.val}</span>
                        <span className="an-donut-legend-pct">{seg.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ministry Bars + Priority Blocks + Funnel */}
          <div className="an-row2b">
            <div className="an-card">
              <div className="an-card-title">
                Complaints by Ministry
                <span className="an-card-badge">{MINISTRIES.length-1} ministries</span>
              </div>
              {ministryBars.map(m => (
                <div key={m.name} className="an-bar-row">
                  <span className="an-bar-label" title={m.name}>{m.name}</span>
                  <div className="an-bar-bg">
                    <div className="an-bar-fill" style={{width: maxBar>0?`${Math.round(m.count/maxBar*100)}%`:'0%', background: m.color}}/>
                  </div>
                  <span className="an-bar-count">{m.count}</span>
                </div>
              ))}
            </div>

            <div className="an-card">
              <div className="an-card-title">Priority Breakdown</div>
              <div className="an-priority-row">
                {[
                  {cls:'high',  num:highCount, lbl:'High',   pct: total>0?Math.round(highCount/total*100):0},
                  {cls:'medium',num:medCount,  lbl:'Medium', pct: total>0?Math.round(medCount/total*100):0},
                  {cls:'low',   num:lowCount,  lbl:'Low',    pct: total>0?Math.round(lowCount/total*100):0},
                ].map(p => (
                  <div key={p.cls} className={`an-priority-block ${p.cls}`}>
                    <div className="an-priority-num">{p.num}</div>
                    <div className="an-priority-lbl">{p.lbl}</div>
                    <div className="an-priority-pct">{p.pct}%</div>
                  </div>
                ))}
              </div>
              <div className="an-divider"/>
              <div className="an-card-title" style={{marginBottom:12}}>Status Pipeline</div>
              {funnelData.map(f => (
                <div key={f.label} className="an-funnel-row">
                  <span className="an-funnel-label">{f.label}</span>
                  <div className="an-funnel-bg">
                    <div className="an-funnel-fill" style={{width: maxFunnel>0?`${Math.max(Math.round(f.val/maxFunnel*100),f.val>0?8:0)}%`:'0%', background: f.color}}>
                      {f.val > 0 ? f.val : ''}
                    </div>
                  </div>
                  <span className="an-funnel-count">{f.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // ═══ CITIZENS PAGE ══════════════════════════════════════════════════════
    if (activeNav === 'citizens') {
      // Derive unique citizens from complaints data
      const avatarColors = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#3b82f6','#06b6d4','#f59e0b'];
      const citizenMap = {};
      complaints.forEach(c => {
        const key = c.email && c.email !== '—' ? c.email : c.citizen;
        if (!key || key === 'Unknown') return;
        if (!citizenMap[key]) {
          citizenMap[key] = {
            name: c.citizen || 'Unknown',
            email: c.email || '—',
            complaints: [],
            firstSeen: c.date || '',
            color: avatarColors[Object.keys(citizenMap).length % avatarColors.length],
          };
        }
        citizenMap[key].complaints.push(c);
        // Track earliest date
        if (c.date && (!citizenMap[key].firstSeen || c.date < citizenMap[key].firstSeen))
          citizenMap[key].firstSeen = c.date;
      });
      let citizens = Object.values(citizenMap).sort((a,b) => b.complaints.length - a.complaints.length);
      const citQ = citSearch.toLowerCase();
      if (citQ) citizens = citizens.filter(c =>
        c.name.toLowerCase().includes(citQ) || c.email.toLowerCase().includes(citQ)
      );

      const totalCitizens = Object.keys(citizenMap).length;
      const activeCitizens = Object.values(citizenMap).filter(c => c.complaints.some(x => !['Resolved','Rejected'].includes(x.status))).length;
      const avgComplaints = totalCitizens > 0 ? (complaints.length / totalCitizens).toFixed(1) : '0';

      return (
        <div className="cit-page">
          {/* Header */}
          <div className="cit-header">
            <div>
              <div className="page-title">Citizens</div>
              <div className="page-subtitle">View and manage all registered citizen accounts</div>
            </div>
            <div className="cit-search-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'#475569',flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search name or email…" value={citSearch} onChange={e => setCitSearch(e.target.value)}/>
            </div>
          </div>

          {/* KPIs */}
          <div className="an-kpis">
            <div className="an-kpi">
              <div className="an-kpi-label">Total Citizens</div>
              <div className="an-kpi-value">{totalCitizens}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill blue">registered</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Active Cases</div>
              <div className="an-kpi-value">{activeCitizens}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill amber">open complaints</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Avg. Complaints</div>
              <div className="an-kpi-value">{avgComplaints}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill blue">per citizen</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Total Complaints</div>
              <div className="an-kpi-value">{complaints.length}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill green">across all</span></div>
            </div>
          </div>

          {/* Table */}
          <div className="cit-table-wrap">
            <div className="cit-table-head">
              <span>Citizen</span>
              <span>Email</span>
              <span>Complaints</span>
              <span>Active</span>
              <span>Status</span>
              <span></span>
            </div>
            {citizens.length === 0 ? (
              <div className="cit-empty">
                {citQ ? `No citizens matching "${citSearch}"` : 'No citizen data yet. Citizens will appear here once complaints are submitted.'}
              </div>
            ) : citizens.map((cit, idx) => {
              const initials = cit.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
              const active = cit.complaints.filter(x => !['Resolved','Rejected'].includes(x.status)).length;
              const isActive = active > 0;
              return (
                <div key={idx} className="cit-row" onClick={() => setSelectedCitizen(cit)}>
                  <div className="cit-name-cell">
                    <div className="cit-avatar" style={{background: cit.color}}>{initials}</div>
                    <div>
                      <div className="cit-name">{cit.name}</div>
                      <div className="cit-email">{cit.complaints.length} complaint{cit.complaints.length!==1?'s':''}</div>
                    </div>
                  </div>
                  <div className="cit-email" style={{display:'flex',alignItems:'center'}}>{cit.email}</div>
                  <div className="cit-cell bold">{cit.complaints.length}</div>
                  <div className="cit-cell bold" style={{color: active > 0 ? '#f59e0b' : '#64748b'}}>{active}</div>
                  <div>
                    <span className={`cit-status-badge ${isActive ? 'active' : 'inactive'}`}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>
                      {isActive ? 'Active' : 'Resolved'}
                    </span>
                  </div>
                  <div><button className="cit-view-btn" onClick={e=>{e.stopPropagation();setSelectedCitizen(cit);}}>View →</button></div>
                </div>
              );
            })}
          </div>

          {/* Citizen detail modal */}
          {selectedCitizen && (() => {
            const cit = selectedCitizen;
            const initials = cit.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
            const resolved = cit.complaints.filter(x=>x.status==='Resolved').length;
            const active = cit.complaints.filter(x=>!['Resolved','Rejected'].includes(x.status)).length;
            return (
              <div className="cit-modal-overlay" onClick={()=>setSelectedCitizen(null)}>
                <div className="cit-modal-panel" onClick={e=>e.stopPropagation()}>
                  <button className="cit-modal-close" onClick={()=>setSelectedCitizen(null)}>✕</button>
                  <div className="cit-modal-header">
                    <div className="cit-modal-avatar" style={{background:cit.color}}>{initials}</div>
                    <div>
                      <div className="cit-modal-name">{cit.name}</div>
                      <div className="cit-modal-email">{cit.email}</div>
                      <div className="cit-modal-email" style={{marginTop:2}}>First submission: {cit.firstSeen || '—'}</div>
                    </div>
                  </div>
                  <div className="cit-modal-stats">
                    <div className="cit-modal-stat">
                      <div className="cit-modal-stat-num">{cit.complaints.length}</div>
                      <div className="cit-modal-stat-lbl">Total</div>
                    </div>
                    <div className="cit-modal-stat">
                      <div className="cit-modal-stat-num" style={{color:'#10b981'}}>{resolved}</div>
                      <div className="cit-modal-stat-lbl">Resolved</div>
                    </div>
                    <div className="cit-modal-stat">
                      <div className="cit-modal-stat-num" style={{color:'#f59e0b'}}>{active}</div>
                      <div className="cit-modal-stat-lbl">Active</div>
                    </div>
                  </div>
                  <div className="cit-modal-section-title">Complaint History</div>
                  <div className="cit-modal-complaints">
                    {cit.complaints.map((c,i) => {
                      const sc = STATUS_COLORS[c.status] || {bg:'#e5e7eb',color:'#374151'};
                      return (
                        <div key={i} className="cit-modal-complaint-row">
                          <div style={{flex:1,minWidth:0}}>
                            <div className="cit-modal-complaint-title">{c.title}</div>
                            <div className="cit-modal-complaint-id">{c.id} · {c.ministry} · {c.date || '—'}</div>
                          </div>
                          <span style={{background:sc.bg,color:sc.color,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,flexShrink:0}}>{c.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      );
    }

    // ═══ USER MANAGEMENT PAGE ════════════════════════════════════════════
    if (activeNav === 'user-management') {
      const avatarColors = ['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981','#3b82f6','#06b6d4','#f59e0b'];

      // Derive unique citizens from complaints (guaranteed to have data)
      const citizenMap = {};
      complaints.forEach(c => {
        const key = c.email && c.email !== '—' ? c.email : c.citizen;
        if (!key || key === 'Unknown') return;
        if (!citizenMap[key]) {
          citizenMap[key] = {
            id: key,
            name: c.citizen || 'Unknown',
            email: c.email || '—',
            role: 'citizen',
            suspended: false,
            complaints: [],
            joinedDate: c.date || '',
          };
        }
        citizenMap[key].complaints.push(c);
        if (c.date && (!citizenMap[key].joinedDate || c.date < citizenMap[key].joinedDate))
          citizenMap[key].joinedDate = c.date;
      });

      // Add current admin user at top
      const adminUser = {
        id: user?.email || 'admin',
        name: displayName,
        email: user?.email || '—',
        role: 'admin',
        suspended: false,
        complaints: [],
        joinedDate: '',
        isCurrentUser: true,
      };
      const allUsers = [adminUser, ...Object.values(citizenMap).sort((a,b) => b.complaints.length - a.complaints.length)];

      const umQ = umSearch.toLowerCase();
      const filteredUsers = umQ
        ? allUsers.filter(u => u.name.toLowerCase().includes(umQ) || u.email.toLowerCase().includes(umQ))
        : allUsers;

      const adminCount     = allUsers.filter(u => u.role === 'admin').length;
      const citizenCount   = allUsers.filter(u => u.role !== 'admin').length;
      const suspendedCount = allUsers.filter(u => u.suspended).length;

      return (
        <div className="um-page">
          <div className="um-header">
            <div>
              <div className="page-title">User Management</div>
              <div className="page-subtitle">Manage citizen accounts, admins and roles</div>
            </div>
            <div className="um-search-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'#475569',flexShrink:0}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search name or email…" value={umSearch} onChange={e => setUmSearch(e.target.value)}/>
            </div>
          </div>

          <div className="an-kpis">
            <div className="an-kpi">
              <div className="an-kpi-label">Total Users</div>
              <div className="an-kpi-value">{allUsers.length}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill blue">registered</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Citizens</div>
              <div className="an-kpi-value">{citizenCount}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill blue">accounts</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Admins</div>
              <div className="an-kpi-value">{adminCount}</div>
              <div className="an-kpi-sub"><span className="an-kpi-pill blue" style={{background:'rgba(168,85,247,0.15)',color:'#c084fc'}}>staff</span></div>
            </div>
            <div className="an-kpi">
              <div className="an-kpi-label">Suspended</div>
              <div className="an-kpi-value">{suspendedCount}</div>
              <div className="an-kpi-sub"><span className={`an-kpi-pill ${suspendedCount>0?'red':'green'}`}>{suspendedCount>0?'action needed':'none'}</span></div>
            </div>
          </div>

          <div className="um-table-wrap">
            <div className="um-table-head">
              <span>User</span>
              <span>Email</span>
              <span>Role</span>
              <span>Complaints</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="um-empty">No users found.</div>
            ) : filteredUsers.map((u, idx) => {
              const initials = u.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
              const color = u.role === 'admin' ? '#7c3aed' : avatarColors[idx % avatarColors.length];
              const isAdmin = u.role === 'admin';
              const isSuspended = !!u.suspended;
              return (
                <div key={u.id} className="um-row">
                  <div className="um-name-cell">
                    <div className="um-avatar" style={{background:color}}>{initials}</div>
                    <div style={{minWidth:0}}>
                      <div className="um-name">{u.name} {u.isCurrentUser && <span style={{fontSize:10,background:'rgba(99,102,241,0.15)',color:'#a5b4fc',padding:'1px 6px',borderRadius:4,marginLeft:4}}>You</span>}</div>
                      <div className="um-uid">{u.complaints.length} complaint{u.complaints.length!==1?'s':''} · Joined {u.joinedDate || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="um-cell">{u.email}</div>
                  <div>
                    <span className={`um-role-badge ${isAdmin?'admin':'citizen'}`}>
                      {isAdmin ? '⚙ Admin' : '👤 Citizen'}
                    </span>
                  </div>
                  <div className="um-cell" style={{fontWeight:600,color:u.complaints.length>0?'#e2e8f0':'#475569'}}>
                    {u.complaints.length}
                  </div>
                  <div>
                    <span className={`um-status-badge ${isSuspended?'suspended':'active'}`}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:'currentColor',display:'inline-block'}}/>
                      {isSuspended ? 'Suspended' : 'Active'}
                    </span>
                  </div>
                  <div className="um-actions">
                    <button className="um-btn view" onClick={()=>setUmSelected(u)}>View</button>
                    {!u.isCurrentUser && (
                      isSuspended
                        ? <button className="um-btn restore" onClick={()=>setUmConfirm({u, action:'restore'})}>Restore</button>
                        : <button className="um-btn suspend" onClick={()=>setUmConfirm({u, action:'suspend'})}>Suspend</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Modal */}
          {umSelected && (() => {
            const u = umSelected;
            const initials = u.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || '?';
            const color = u.role==='admin' ? '#7c3aed' : '#6366f1';
            const resolved = u.complaints.filter(c=>c.status==='Resolved').length;
            const active   = u.complaints.filter(c=>!['Resolved','Rejected'].includes(c.status)).length;
            return (
              <div className="um-modal-overlay" onClick={()=>setUmSelected(null)}>
                <div className="um-modal-panel" onClick={e=>e.stopPropagation()}>
                  <button className="um-modal-close" onClick={()=>setUmSelected(null)}>✕</button>
                  <div className="um-modal-header">
                    <div className="um-modal-avatar" style={{background:color}}>{initials}</div>
                    <div>
                      <div className="um-modal-name">{u.name}</div>
                      <div className="um-modal-sub">{u.email}</div>
                      <div className="um-modal-sub" style={{marginTop:3}}>
                        <span className={`um-role-badge ${u.role==='admin'?'admin':'citizen'}`} style={{fontSize:10}}>
                          {u.role==='admin'?'⚙ Admin':'👤 Citizen'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="um-modal-section">
                    <div className="um-modal-section-title">Account Details</div>
                    <div className="um-modal-fields">
                      <div className="um-modal-field">
                        <div className="um-modal-field-label">First Seen</div>
                        <div className="um-modal-field-value">{u.joinedDate || '—'}</div>
                      </div>
                      <div className="um-modal-field">
                        <div className="um-modal-field-label">Status</div>
                        <div className="um-modal-field-value" style={{color:u.suspended?'#ef4444':'#10b981'}}>{u.suspended?'Suspended':'Active'}</div>
                      </div>
                      <div className="um-modal-field">
                        <div className="um-modal-field-label">Total Complaints</div>
                        <div className="um-modal-field-value">{u.complaints.length}</div>
                      </div>
                      <div className="um-modal-field">
                        <div className="um-modal-field-label">Resolved</div>
                        <div className="um-modal-field-value" style={{color:'#10b981'}}>{resolved}</div>
                      </div>
                    </div>
                  </div>

                  {u.complaints.length > 0 && (
                    <div className="um-modal-section">
                      <div className="um-modal-section-title">Complaint History</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:200,overflowY:'auto'}}>
                        {u.complaints.map((c,i) => {
                          const sc = STATUS_COLORS[c.status] || {bg:'#e5e7eb',color:'#374151'};
                          return (
                            <div key={i} style={{background:darkMode?'#0f172a':'#f8fafc',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:13,fontWeight:600,color:darkMode?'#e2e8f0':'#1a1a1a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.title}</div>
                                <div style={{fontSize:11,color:'#64748b',marginTop:2}}>{c.id} · {c.ministry} · {c.date||'—'}</div>
                              </div>
                              <span style={{background:sc.bg,color:sc.color,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:20,flexShrink:0}}>{c.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="um-modal-actions">
                    {!u.isCurrentUser && (
                      u.suspended
                        ? <button className="um-modal-btn primary" onClick={()=>{setUmConfirm({u,action:'restore'});setUmSelected(null);}}>Restore Account</button>
                        : <button className="um-modal-btn danger" onClick={()=>{setUmConfirm({u,action:'suspend'});setUmSelected(null);}}>Suspend Account</button>
                    )}
                    <button className="um-modal-btn ghost" onClick={()=>setUmSelected(null)}>Close</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Confirm Dialog */}
          {umConfirm && (
            <div className="um-confirm-overlay" onClick={()=>setUmConfirm(null)}>
              <div className="um-confirm-panel" onClick={e=>e.stopPropagation()}>
                <div className="um-confirm-icon" style={{background:umConfirm.action==='suspend'?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.15)'}}>
                  {umConfirm.action==='suspend'
                    ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  }
                </div>
                <div className="um-confirm-title">{umConfirm.action==='suspend'?'Suspend Account?':'Restore Account?'}</div>
                <div className="um-confirm-desc">
                  {umConfirm.action==='suspend'
                    ? `This will flag ${umConfirm.u.name}'s account as suspended in the system.`
                    : `This will restore ${umConfirm.u.name}'s account access.`
                  }
                </div>
                <div className="um-confirm-btns">
                  <button className="um-confirm-btn" style={{background:'#334155',color:'#94a3b8'}} onClick={()=>setUmConfirm(null)}>Cancel</button>
                  <button className="um-confirm-btn"
                    style={{background:umConfirm.action==='suspend'?'#ef4444':'#10b981',color:'white'}}
                    onClick={()=>{
                      setUmConfirm(null);
                      showToast(umConfirm.action==='suspend'?`${umConfirm.u.name} suspended`:`${umConfirm.u.name} restored`);
                    }}>
                    {umConfirm.action==='suspend'?'Yes, Suspend':'Yes, Restore'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ═══ SETTINGS PAGE ═══════════════════════════════════════════════════════
    if (activeNav === 'settings') {
      const set = settingsData;
      const upd = (key, val) => setSettingsData(prev => ({ ...prev, [key]: val }));

      async function saveSettings() {
        localStorage.setItem('govcare-admin-settings', JSON.stringify(settingsData));
        // Persist system-level settings to Firestore so other pages (RegisterPage etc.) can read them
        try {
          await setDoc(doc(db, 'system-settings', 'config'), {
            allowRegistration:  settingsData.allowRegistration  ?? true,
            publicTracking:     settingsData.publicTracking     ?? true,
            autoRoutingEnabled: settingsData.autoRoutingEnabled ?? true,
            duplicateDetection: settingsData.duplicateDetection ?? true,
            nlpConfidenceMin:   settingsData.nlpConfidenceMin   ?? 75,
            similarityThreshold:settingsData.similarityThreshold?? 50,
            updatedAt:          serverTimestamp(),
          });
        } catch(e) { /* non-critical — localStorage is primary store */ }
        // Sync filterMinistry if default changed
        setFilterMinistry(settingsData.defaultMinistry || 'All');
        setSettingsSaved(true);
        showToast('Settings saved successfully');
        setTimeout(() => setSettingsSaved(false), 2500);
      }

      const TABS = [
        { id: 'general',       label: 'General',        icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg> },
        { id: 'notifications', label: 'Notifications',  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
        { id: 'system',        label: 'System',         icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
        { id: 'security',      label: 'Security',       icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
      ];

      function Toggle({ skey }) {
        return (
          <label className="st-toggle">
            <input type="checkbox" checked={!!set[skey]} onChange={e => upd(skey, e.target.checked)}/>
            <span className="st-toggle-track"/>
          </label>
        );
      }

      return (
        <div className="st-page">
          {/* Header */}
          <div className="st-header">
            <div>
              <div className="page-title">Settings</div>
              <div className="page-subtitle">Configure system behaviour, notifications and preferences</div>
            </div>
            <button className={`st-save-btn${settingsSaved?' saved':''}`} onClick={saveSettings}>
              {settingsSaved
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Saved!</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13"/><polyline points="7 3 7 8 15 8"/></svg> Save Changes</>
              }
            </button>
          </div>

          {/* Tabs */}
          <div className="st-tabs">
            {TABS.map(t => (
              <button key={t.id} className={`st-tab${settingsTab===t.id?' active':''}`} onClick={()=>setSettingsTab(t.id)}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* ── GENERAL TAB ── */}
          {settingsTab === 'general' && (
            <div className="st-body">
              {/* Admin profile */}
              <div className="st-profile-card">
                <div className="st-profile-avatar">{initials}</div>
                <div>
                  <div className="st-profile-name">{displayName}</div>
                  <div className="st-profile-email">{user?.email || '—'}</div>
                  <div className="st-profile-role">⚙ Administrator</div>
                </div>
                <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                  <div style={{background:darkMode?'#0f172a':'#f8fafc',borderRadius:10,padding:'10px 16px',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:darkMode?'#f1f5f9':'#0f172a'}}>{complaints.length}</div>
                    <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.5px',color:'#64748b',fontWeight:600}}>Complaints</div>
                  </div>
                  <div style={{background:darkMode?'#0f172a':'#f8fafc',borderRadius:10,padding:'10px 16px',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:'#10b981'}}>{complaints.filter(c=>c.status==='Resolved').length}</div>
                    <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.5px',color:'#64748b',fontWeight:600}}>Resolved</div>
                  </div>
                  <div style={{background:darkMode?'#0f172a':'#f8fafc',borderRadius:10,padding:'10px 16px',textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:'#f59e0b'}}>{complaints.filter(c=>['Submitted','Pending Review'].includes(c.status)).length}</div>
                    <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.5px',color:'#64748b',fontWeight:600}}>Pending</div>
                  </div>
                </div>
              </div>

              <div className="st-two-col">
                {/* Appearance */}
                <div className="st-card">
                  <div className="st-card-head">
                    <div className="st-card-icon" style={{background:'rgba(99,102,241,0.15)'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                    </div>
                    <div>
                      <div className="st-card-title">Appearance</div>
                      <div className="st-card-desc">Theme and display preferences</div>
                    </div>
                  </div>
                  <div className="st-rows">
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Dark Mode</div>
                        <div className="st-row-sub">Switch between dark and light interface</div>
                      </div>
                      <label className="st-toggle">
                        <input type="checkbox" checked={darkMode} onChange={toggleDark}/>
                        <span className="st-toggle-track"/>
                      </label>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Date Format</div>
                        <div className="st-row-sub">How dates are displayed across the system</div>
                      </div>
                      <select className="st-select" value={set.dateFormat||'DD/MM/YYYY'} onChange={e=>upd('dateFormat',e.target.value)}>
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Rows Per Page</div>
                        <div className="st-row-sub">Complaints shown per table page</div>
                      </div>
                      <select className="st-select" value={set.rowsPerPage||20} onChange={e=>upd('rowsPerPage',+e.target.value)}>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Default Filters */}
                <div className="st-card">
                  <div className="st-card-head">
                    <div className="st-card-icon" style={{background:'rgba(16,185,129,0.15)'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    </div>
                    <div>
                      <div className="st-card-title">Default Filters</div>
                      <div className="st-card-desc">Starting view for complaint tables</div>
                    </div>
                  </div>
                  <div className="st-rows">
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Default Ministry</div>
                        <div className="st-row-sub">Pre-selected ministry filter on load</div>
                      </div>
                      <select className="st-select" value={set.defaultMinistry||'All'} onChange={e=>upd('defaultMinistry',e.target.value)}>
                        {MINISTRIES.map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Show Resolved</div>
                        <div className="st-row-sub">Include resolved complaints in default view</div>
                      </div>
                      <Toggle skey="showResolved"/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Compact Table</div>
                        <div className="st-row-sub">Reduce row padding for denser view</div>
                      </div>
                      <Toggle skey="compactTable"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {settingsTab === 'notifications' && (
            <div className="st-body">
              <div className="st-card">
                <div className="st-card-head">
                  <div className="st-card-icon" style={{background:'rgba(245,158,11,0.15)'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <div>
                    <div className="st-card-title">Admin Notifications</div>
                    <div className="st-card-desc">Control which events trigger notifications in the bell icon</div>
                  </div>
                </div>
                <div className="st-rows">
                  {[
                    { key: 'notifNewComplaint',  label: 'New Complaint Submitted',    sub: 'Notify when a citizen submits a new complaint' },
                    { key: 'notifHighPriority',  label: 'High Priority Flagged',      sub: 'Notify when a complaint is classified as high priority' },
                    { key: 'notifResolved',      label: 'Complaint Resolved',          sub: 'Notify when a complaint is marked as resolved' },
                    { key: 'notifDailyDigest',   label: 'Daily Summary Digest',       sub: 'Receive a daily summary of complaint activity' },
                    { key: 'notifDuplicate',     label: 'Duplicate Detected',         sub: 'Notify when duplicate complaints are found' },
                    { key: 'notifRejected',      label: 'Complaint Rejected',         sub: 'Notify when a complaint is rejected by the system' },
                  ].map(r => (
                    <div key={r.key} className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">{r.label}</div>
                        <div className="st-row-sub">{r.sub}</div>
                      </div>
                      <Toggle skey={r.key}/>
                    </div>
                  ))}
                </div>
              </div>

              <div className="st-card">
                <div className="st-card-head">
                  <div className="st-card-icon" style={{background:'rgba(59,130,246,0.15)'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div>
                    <div className="st-card-title">Email Alerts</div>
                    <div className="st-card-desc">Manage email notification preferences</div>
                  </div>
                </div>
                <div className="st-rows">
                  {[
                    { key: 'emailHighPriority',  label: 'Email on High Priority',     sub: 'Send email when a high priority complaint is received' },
                    { key: 'emailWeeklyReport',  label: 'Weekly Report Email',        sub: 'Receive weekly analytics digest to your admin email' },
                    { key: 'emailSystemAlerts',  label: 'System Alerts',             sub: 'Critical system errors and security alerts' },
                  ].map(r => (
                    <div key={r.key} className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">{r.label}</div>
                        <div className="st-row-sub">{r.sub}</div>
                      </div>
                      <Toggle skey={r.key}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SYSTEM TAB ── */}
          {settingsTab === 'system' && (
            <div className="st-body">
              <div className="st-two-col">
                <div className="st-card">
                  <div className="st-card-head">
                    <div className="st-card-icon" style={{background:'rgba(139,92,246,0.15)'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                    </div>
                    <div>
                      <div className="st-card-title">NLP & Routing</div>
                      <div className="st-card-desc">AI classification engine settings</div>
                    </div>
                  </div>
                  <div className="st-rows">
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Auto Routing</div>
                        <div className="st-row-sub">Automatically route complaints via BERT NLP</div>
                      </div>
                      <Toggle skey="autoRoutingEnabled"/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Duplicate Detection</div>
                        <div className="st-row-sub">Flag similar complaints for manual review</div>
                      </div>
                      <Toggle skey="duplicateDetection"/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">NLP Min. Confidence</div>
                        <div className="st-row-sub">Route only above this confidence threshold</div>
                      </div>
                      <div className="st-slider-wrap">
                        <input type="range" className="st-slider" min={50} max={99} step={1}
                          value={set.nlpConfidenceMin||75} onChange={e=>upd('nlpConfidenceMin',+e.target.value)}/>
                        <span className="st-slider-val">{set.nlpConfidenceMin||75}%</span>
                      </div>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Similarity Threshold</div>
                        <div className="st-row-sub">Jaccard score for duplicate grouping</div>
                      </div>
                      <div className="st-slider-wrap">
                        <input type="range" className="st-slider" min={30} max={90} step={5}
                          value={set.similarityThreshold||50} onChange={e=>upd('similarityThreshold',+e.target.value)}/>
                        <span className="st-slider-val">{set.similarityThreshold||50}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="st-card">
                  <div className="st-card-head">
                    <div className="st-card-icon" style={{background:'rgba(16,185,129,0.15)'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <div>
                      <div className="st-card-title">System Stats</div>
                      <div className="st-card-desc">Live system health overview</div>
                    </div>
                  </div>
                  <div className="st-rows">
                    {[
                      { label: 'Total Complaints',    val: complaints.length,                                                                                                                              color: '#e2e8f0' },
                      { label: 'NLP Accuracy',         val: complaints.length > 0 ? `87.5%` : '—',                                                                                                        color: '#10b981' },
                      { label: 'NLP Confidence Min',   val: `${set.nlpConfidenceMin || 75}%`,                                                                                                             color: '#a78bfa' },
                      { label: 'Duplicate Threshold',  val: `${set.similarityThreshold || 50}%`,                                                                                                          color: '#06b6d4' },
                      { label: 'Pending Review',       val: complaints.filter(c=>['Submitted','Pending Review'].includes(c.status)).length,                                                                color: '#f59e0b' },
                      { label: 'Resolution Rate',      val: complaints.length > 0 ? `${Math.round(complaints.filter(c=>c.status==='Resolved').length/complaints.length*100)}%` : '—',                    color: '#10b981' },
                      { label: 'High Priority Active', val: complaints.filter(c=>c.priority==='High'&&!['Resolved','Rejected'].includes(c.status)).length,                                                color: '#ef4444' },
                      { label: 'Auto-Routing',         val: set.autoRoutingEnabled !== false ? 'Enabled' : 'Disabled',                                                                                   color: set.autoRoutingEnabled !== false ? '#10b981' : '#ef4444' },
                      { label: 'Duplicate Detection',  val: set.duplicateDetection !== false ? 'Enabled' : 'Disabled',                                                                                   color: set.duplicateDetection !== false ? '#10b981' : '#ef4444' },
                    ].map(r => (
                      <div key={r.label} className="st-row">
                        <div className="st-row-label">{r.label}</div>
                        <span style={{fontWeight:800,fontSize:14,color:r.color}}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data management */}
              <div className="st-card">
                <div className="st-card-head">
                  <div className="st-card-icon" style={{background:'rgba(239,68,68,0.15)'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </div>
                  <div>
                    <div className="st-card-title">Data Management</div>
                    <div className="st-card-desc">Export and maintenance actions — use with caution</div>
                  </div>
                </div>
                <div className="st-rows">
                  <div className="st-row">
                    <div className="st-row-left">
                      <div className="st-row-label">Export All Complaints</div>
                      <div className="st-row-sub">Download full complaint database as CSV</div>
                    </div>
                    <button className="st-danger-btn outline" onClick={handleExportCSV}>Export CSV</button>
                  </div>
                  <div className="st-row">
                    <div className="st-row-left">
                      <div className="st-row-label">Generate Full Report</div>
                      <div className="st-row-sub">Create a comprehensive system performance report</div>
                    </div>
                    <button className="st-danger-btn outline" style={{borderColor:'rgba(99,102,241,0.4)',color:'#818cf8'}} onClick={handleGenerateReport}>Generate</button>
                  </div>
                  <div className="st-row">
                    <div className="st-row-left">
                      <div className="st-row-label">Clear Notification History</div>
                      <div className="st-row-sub">Reset all read/unread notification state</div>
                    </div>
                    <button className="st-danger-btn outline" onClick={() => { localStorage.removeItem('govcare-notif-read'); setReadIds([]); showToast('Notification history cleared'); }}>Clear</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {settingsTab === 'security' && (
            <div className="st-body">
              <div className="st-two-col">
                <div className="st-card">
                  <div className="st-card-head">
                    <div className="st-card-icon" style={{background:'rgba(99,102,241,0.15)'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    </div>
                    <div>
                      <div className="st-card-title">Authentication</div>
                      <div className="st-card-desc">Session and access controls</div>
                    </div>
                  </div>
                  <div className="st-rows">
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Require MFA</div>
                        <div className="st-row-sub">Enforce two-factor authentication on login</div>
                      </div>
                      <Toggle skey="requireMFA"/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Session Timeout</div>
                        <div className="st-row-sub">Auto-logout after inactivity (minutes)</div>
                      </div>
                      <input type="number" className="st-num" min={5} max={480}
                        value={set.sessionTimeout||60} onChange={e=>upd('sessionTimeout',+e.target.value)}/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Activity Logging</div>
                        <div className="st-row-sub">Record all admin actions for audit trail</div>
                      </div>
                      <Toggle skey="activityLog"/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Login Alerts</div>
                        <div className="st-row-sub">Email alert on each admin login</div>
                      </div>
                      <Toggle skey="loginAlerts"/>
                    </div>
                  </div>
                </div>

                <div className="st-card">
                  <div className="st-card-head">
                    <div className="st-card-icon" style={{background:'rgba(239,68,68,0.15)'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div>
                      <div className="st-card-title">Access & Roles</div>
                      <div className="st-card-desc">Permissions and privilege controls</div>
                    </div>
                  </div>
                  <div className="st-rows">
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Allow Citizen Registration</div>
                        <div className="st-row-sub">Let new users sign up on the portal</div>
                      </div>
                      <Toggle skey="allowRegistration"/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Public Complaint Tracking</div>
                        <div className="st-row-sub">Allow status tracking without login</div>
                      </div>
                      <Toggle skey="publicTracking"/>
                    </div>
                    <div className="st-row">
                      <div className="st-row-left">
                        <div className="st-row-label">Admin IP Restriction</div>
                        <div className="st-row-sub">Restrict admin login to whitelisted IPs</div>
                      </div>
                      <Toggle skey="ipRestriction"/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger zone */}
              <div className="st-card" style={{border:'1px solid rgba(239,68,68,0.25)'}}>
                <div className="st-card-head" style={{borderColor:'rgba(239,68,68,0.15)'}}>
                  <div className="st-card-icon" style={{background:'rgba(239,68,68,0.15)'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div>
                    <div className="st-card-title" style={{color:'#ef4444'}}>Danger Zone</div>
                    <div className="st-card-desc">Irreversible actions — proceed with extreme caution</div>
                  </div>
                </div>
                <div className="st-rows">
                  <div className="st-row">
                    <div className="st-row-left">
                      <div className="st-row-label">Reset All Settings</div>
                      <div className="st-row-sub">Restore all settings to factory defaults</div>
                    </div>
                    <button className="st-danger-btn outline" onClick={() => {
                      localStorage.removeItem('govcare-admin-settings');
                      setSettingsData({});
                      showToast('Settings reset to defaults');
                    }}>Reset</button>
                  </div>
                  <div className="st-row">
                    <div className="st-row-left">
                      <div className="st-row-label">Sign Out of All Sessions</div>
                      <div className="st-row-sub">Revoke all active admin sessions immediately</div>
                    </div>
                    <button className="st-danger-btn solid" onClick={handleLogout}>Sign Out</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // ═══ REPORTS PAGE ════════════════════════════════════════════════════════
    if (activeNav === 'reports') {
      const today   = new Date(); today.setHours(23,59,59,999);
      const dayMs   = 86400000;
      const days    = reportsPeriod === '7d' ? 7 : reportsPeriod === '30d' ? 30 : 90;
      const cutoff  = new Date(today.getTime() - days * dayMs);
      const inRange = c => { const d = new Date(c.date || 0); return d >= cutoff && d <= today; };

      const periodComplaints = complaints.filter(inRange);
      const total      = periodComplaints.length;
      const resolved   = periodComplaints.filter(c => c.status === 'Resolved').length;
      const pending    = periodComplaints.filter(c => ['Submitted','Pending Review'].includes(c.status)).length;
      const inProgress = periodComplaints.filter(c => c.status === 'In Progress').length;
      const rejected   = periodComplaints.filter(c => c.status === 'Rejected').length;
      const highCount  = periodComplaints.filter(c => c.priority === 'High').length;
      const medCount   = periodComplaints.filter(c => c.priority === 'Medium').length;
      const lowCount   = periodComplaints.filter(c => c.priority === 'Low').length;
      const resRate    = total > 0 ? Math.round(resolved/total*100) : 0;

      // Average resolution days
      const resDiffs = complaints.filter(c => c.status === 'Resolved' && c.date)
        .map(c => Math.max(0, Math.floor((new Date() - new Date(c.date)) / dayMs)));
      const avgResDays = resDiffs.length ? (resDiffs.reduce((a,b)=>a+b,0)/resDiffs.length).toFixed(1) : '—';

      // Ministry stats
      const ministryStats = MINISTRIES.slice(1).map(m => ({
        name: m, color: MINISTRY_COLORS[m],
        total: periodComplaints.filter(c => c.ministry === m).length,
        resolved: periodComplaints.filter(c => c.ministry === m && c.status === 'Resolved').length,
      })).sort((a,b) => b.total - a.total);
      const maxMinistry = Math.max(...ministryStats.map(m => m.total), 1);

      // Funnel
      const funnelData = [
        { label: 'Submitted',      val: periodComplaints.filter(c=>c.status==='Submitted').length,      color: '#3b82f6' },
        { label: 'Pending Review', val: periodComplaints.filter(c=>c.status==='Pending Review').length,  color: '#f59e0b' },
        { label: 'In Progress',    val: inProgress, color: '#06b6d4' },
        { label: 'Resolved',       val: resolved,   color: '#10b981' },
        { label: 'Rejected',       val: rejected,   color: '#ef4444' },
      ];
      const maxFunnel = Math.max(...funnelData.map(f=>f.val), 1);

      // Priority donut
      const priData = [
        { label: 'High',   val: highCount, color: '#ef4444' },
        { label: 'Medium', val: medCount,  color: '#f59e0b' },
        { label: 'Low',    val: lowCount,  color: '#10b981' },
      ].filter(d => d.val > 0);
      const priTotal = priData.reduce((a,d)=>a+d.val,0) || 1;
      const priR = 46, priCx = 58, priCy = 58, priSW = 16;
      const priCirc = 2 * Math.PI * priR;
      let priOff = 0;
      const priSegs = priData.map(d => {
        const dl = (d.val/priTotal)*priCirc;
        const seg = { ...d, dl, off: -priOff, pct: Math.round(d.val/priTotal*100) };
        priOff += dl;
        return seg;
      });

      // Generate audit log from complaints activity
      const auditLog = [...complaints]
        .sort((a,b) => {
          const aT = a.createdAt?.toMillis?.() || new Date(a.date||0).getTime();
          const bT = b.createdAt?.toMillis?.() || new Date(b.date||0).getTime();
          return bT - aT;
        })
        .slice(0, 12)
        .map(c => {
          const daysAgo = c.date ? Math.floor((new Date()-new Date(c.date))/dayMs) : 0;
          const time = daysAgo===0?'Today':daysAgo===1?'Yesterday':`${daysAgo}d ago`;
          const isResolved = c.status === 'Resolved';
          const isHigh = c.priority === 'High';
          return {
            action: isResolved ? 'Complaint Resolved' : isHigh ? 'High Priority Flagged' : 'Complaint Received',
            detail: `${c.id} — ${c.title} (${c.ministry})`,
            time,
            color: isResolved ? '#10b981' : isHigh ? '#ef4444' : '#3b82f6',
          };
        });

      // Top citizens by complaint count
      const citizenMap2 = {};
      complaints.forEach(c => {
        const k = c.email && c.email!=='—' ? c.email : c.citizen;
        if (!k || k==='Unknown') return;
        if (!citizenMap2[k]) citizenMap2[k] = { name: c.citizen, count: 0, resolved: 0 };
        citizenMap2[k].count++;
        if (c.status==='Resolved') citizenMap2[k].resolved++;
      });
      const topCitizens = Object.values(citizenMap2).sort((a,b)=>b.count-a.count).slice(0,5);

      const TABS2 = [
        { id:'overview',   label:'Overview'  },
        { id:'ministry',   label:'By Ministry' },
        { id:'downloads',  label:'Downloads' },
        { id:'audit',      label:'Audit Log' },
      ];

      function exportMinistryCSV() {
        const lines = ['Ministry,Total,Resolved,Pending,Resolution Rate'];
        ministryStats.forEach(m => {
          const pend = complaints.filter(c=>c.ministry===m.name&&['Submitted','Pending Review'].includes(c.status)).length;
          const rate = m.total>0?Math.round(m.resolved/m.total*100):0;
          lines.push(`${m.name},${m.total},${m.resolved},${pend},${rate}%`);
        });
        const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})),download:`GovCare_Ministry_Report_${new Date().toISOString().slice(0,10)}.csv`});
        a.click(); showToast('Ministry report exported!');
      }

      function exportAuditLog() {
        const lines = ['Action,Detail,Time'];
        auditLog.forEach(r => lines.push(`"${r.action}","${r.detail}",${r.time}`));
        const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv'})),download:`GovCare_AuditLog_${new Date().toISOString().slice(0,10)}.csv`});
        a.click(); showToast('Audit log exported!');
      }

      return (
        <div className="rp-page">
          {/* Header */}
          <div className="rp-header">
            <div>
              <div className="page-title">Reports</div>
              <div className="page-subtitle">Performance summaries, ministry breakdowns and audit logs</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:10}}>
              <div className="rp-header-btns">
                <button className="rp-btn ghost" onClick={handleExportCSV}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export CSV
                </button>
                <button className="rp-btn primary" onClick={handleGenerateReport}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Full Report
                </button>
              </div>
              <div className="rp-period-tabs">
                {[['7d','7 Days'],['30d','30 Days'],['90d','90 Days']].map(([v,l])=>(
                  <button key={v} className={`rp-period-btn${reportsPeriod===v?' active':''}`} onClick={()=>setReportsPeriod(v)}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="rp-tabs">
            {TABS2.map(t=>(
              <button key={t.id} className={`rp-tab${reportsTab===t.id?' active':''}`} onClick={()=>setReportsTab(t.id)}>{t.label}</button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {reportsTab==='overview' && (<>
            {/* Summary KPIs */}
            <div className="rp-summary">
              {[
                { num: total,       label: 'Total Received',    icon: '#3b82f6', iconBg: 'rgba(59,130,246,0.15)',  change: `${days}d period`, cls:'neutral',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                { num: resolved,    label: 'Resolved',          icon: '#10b981', iconBg: 'rgba(16,185,129,0.15)',  change: `${resRate}% rate`, cls:'up',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
                { num: pending,     label: 'Pending Review',    icon: '#f59e0b', iconBg: 'rgba(245,158,11,0.15)',  change: `${inProgress} in progress`, cls: pending>0?'down':'neutral',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
                { num: `${resRate}%`, label: 'Resolution Rate', icon: '#8b5cf6', iconBg: 'rgba(139,92,246,0.15)',  change: `Avg ${avgResDays}d`, cls: resRate>=70?'up':resRate>=40?'neutral':'down',
                  svg: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
              ].map((k,i)=>(
                <div key={i} className="rp-sum-card">
                  <div className="rp-sum-top">
                    <div className="rp-sum-icon" style={{background:k.iconBg}}>{k.svg}</div>
                    <span className={`rp-sum-change ${k.cls}`}>{k.change}</span>
                  </div>
                  <div className="rp-sum-num">{k.num}</div>
                  <div className="rp-sum-label">{k.label}</div>
                </div>
              ))}
            </div>

            <div className="rp-two-col">
              {/* Status funnel */}
              <div className="rp-card">
                <div className="rp-card-head">
                  <div>
                    <div className="rp-card-title">Status Pipeline</div>
                    <div className="rp-card-sub">Complaint flow across all stages</div>
                  </div>
                </div>
                <div className="rp-card-body">
                  {funnelData.map(f=>(
                    <div key={f.label} className="rp-funnel-row">
                      <span className="rp-funnel-label">{f.label}</span>
                      <div className="rp-funnel-bar-bg">
                        <div className="rp-funnel-bar-fill" style={{width:maxFunnel>0?`${Math.max(f.val>0?6:0,Math.round(f.val/maxFunnel*100))}%`:'0%',background:f.color}}>
                          {f.val>0?f.val:''}
                        </div>
                      </div>
                      <span className="rp-funnel-count">{f.val}</span>
                    </div>
                  ))}
                  <div style={{marginTop:16,paddingTop:14,borderTop:`1px solid ${darkMode?'#334155':'#f3f4f6'}`}}>
                    {[
                      {label:'NLP Auto-Routing Accuracy', val:87.5, color:'#8b5cf6'},
                      {label:'On-Time Resolution Rate',    val:resRate, color:'#10b981'},
                      {label:'High Priority Cleared',      val:total>0?Math.round(complaints.filter(c=>c.priority==='High'&&c.status==='Resolved').length/Math.max(complaints.filter(c=>c.priority==='High').length,1)*100):0, color:'#ef4444'},
                    ].map(m=>(
                      <div key={m.label} className="rp-metric-row" style={{padding:'10px 0',borderBottom:'none'}}>
                        <span className="rp-metric-label">{m.label}</span>
                        <div className="rp-metric-bar">
                          <div className="rp-metric-bg"><div className="rp-metric-fill" style={{width:`${m.val}%`,background:m.color}}/></div>
                          <span className="rp-metric-val" style={{color:m.color}}>{m.val}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Priority donut + top citizens */}
              <div style={{display:'flex',flexDirection:'column',gap:20}}>
                <div className="rp-card">
                  <div className="rp-card-head">
                    <div className="rp-card-title">Priority Split</div>
                  </div>
                  <div className="rp-card-body">
                    {priData.length===0 ? (
                      <div style={{textAlign:'center',color:'#475569',padding:'20px 0',fontSize:13}}>No data</div>
                    ) : (
                      <div className="rp-donut-wrap">
                        <svg width="116" height="116" viewBox="0 0 116 116" style={{flexShrink:0}}>
                          <circle cx={priCx} cy={priCy} r={priR} fill="none" stroke={darkMode?'#0f172a':'#f1f5f9'} strokeWidth={priSW}/>
                          {priSegs.map((s,i)=>(
                            <circle key={i} cx={priCx} cy={priCy} r={priR} fill="none"
                              stroke={s.color} strokeWidth={priSW}
                              strokeDasharray={`${s.dl} ${priCirc-s.dl}`}
                              strokeDashoffset={s.off}
                              style={{transform:`rotate(-90deg)`,transformOrigin:`${priCx}px ${priCy}px`}}/>
                          ))}
                          <text x={priCx} y={priCy-5} textAnchor="middle" fill={darkMode?'#f1f5f9':'#0f172a'} fontSize="15" fontWeight="800">{total}</text>
                          <text x={priCx} y={priCy+10} textAnchor="middle" fill="#64748b" fontSize="10">total</text>
                        </svg>
                        <div className="rp-donut-legend">
                          {priSegs.map((s,i)=>(
                            <div key={i} className="rp-donut-row">
                              <span className="rp-donut-dot" style={{background:s.color}}/>
                              <span className="rp-donut-lbl">{s.label}</span>
                              <span className="rp-donut-val">{s.val}</span>
                              <span className="rp-donut-pct">{s.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rp-card">
                  <div className="rp-card-head"><div className="rp-card-title">Most Active Citizens</div></div>
                  {topCitizens.length===0 ? (
                    <div style={{padding:'20px',textAlign:'center',color:'#475569',fontSize:13}}>No data</div>
                  ) : topCitizens.map((c2,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 20px',borderBottom:i<topCitizens.length-1?`1px solid ${darkMode?'rgba(255,255,255,0.04)':'#f3f4f6'}`:'none'}}>
                      <div style={{width:28,height:28,borderRadius:8,background:['#6366f1','#8b5cf6','#ec4899','#f97316','#10b981'][i],display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'white',flexShrink:0}}>
                        {c2.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:darkMode?'#e2e8f0':'#1a1a1a',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c2.name}</div>
                        <div style={{fontSize:11,color:'#64748b'}}>{c2.resolved} resolved</div>
                      </div>
                      <span style={{fontWeight:800,fontSize:14,color:darkMode?'#e2e8f0':'#1a1a1a'}}>{c2.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>)}

          {/* ── MINISTRY TAB ── */}
          {reportsTab==='ministry' && (
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              <div className="rp-card">
                <div className="rp-card-head">
                  <div>
                    <div className="rp-card-title">Complaint Volume by Ministry</div>
                    <div className="rp-card-sub">All {total} complaints in the {days}-day period</div>
                  </div>
                  <button className="rp-dl-btn" onClick={exportMinistryCSV}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export
                  </button>
                </div>
                <div className="rp-card-body">
                  {ministryStats.map(m=>(
                    <div key={m.name} className="rp-ministry-row">
                      <span className="rp-ministry-dot" style={{background:m.color}}/>
                      <span className="rp-ministry-name">{m.name}</span>
                      <div className="rp-ministry-bar-bg">
                        <div className="rp-ministry-bar-fill" style={{width:maxMinistry>0?`${Math.round(m.total/maxMinistry*100)}%`:'0%',background:m.color,height:'100%',borderRadius:4}}/>
                      </div>
                      <span className="rp-ministry-count">{m.total}</span>
                      <span className="rp-ministry-pct">{total>0?Math.round(m.total/total*100):0}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rp-two-col-eq">
                {ministryStats.filter(m=>m.total>0).slice(0,4).map(m=>(
                  <div key={m.name} className="rp-card">
                    <div className="rp-card-head">
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <span style={{width:10,height:10,borderRadius:3,background:m.color,display:'inline-block'}}/>
                        <div className="rp-card-title">{m.name}</div>
                      </div>
                    </div>
                    {[
                      {label:'Total',     val:m.total,   color:'#e2e8f0'},
                      {label:'Resolved',  val:m.resolved, color:'#10b981'},
                      {label:'Pending',   val:complaints.filter(c=>c.ministry===m.name&&['Submitted','Pending Review'].includes(c.status)).length, color:'#f59e0b'},
                      {label:'Rejected',  val:complaints.filter(c=>c.ministry===m.name&&c.status==='Rejected').length, color:'#ef4444'},
                      {label:'Res. Rate', val:`${m.total>0?Math.round(m.resolved/m.total*100):0}%`, color:'#8b5cf6'},
                    ].map(r=>(
                      <div key={r.label} className="rp-metric-row">
                        <span className="rp-metric-label">{r.label}</span>
                        <span className="rp-metric-val" style={{color:r.color}}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DOWNLOADS TAB ── */}
          {reportsTab==='downloads' && (
            <div className="rp-card">
              <div className="rp-card-head">
                <div className="rp-card-title">Available Reports</div>
                <div className="rp-card-sub">{new Date().toLocaleDateString('en-MY',{year:'numeric',month:'long',day:'numeric'})}</div>
              </div>
              {[
                { name:'Full Complaint Export',         meta:'All complaints with status, priority, ministry, citizen info',          fmt:'CSV',  color:'#10b981', bg:'rgba(16,185,129,0.15)',  fn: handleExportCSV },
                { name:'System Performance Report',     meta:'Summary statistics, resolution rates and NLP accuracy breakdown',       fmt:'TXT',  color:'#8b5cf6', bg:'rgba(139,92,246,0.15)', fn: handleGenerateReport },
                { name:'Ministry Breakdown Report',     meta:'Complaint volume and resolution rates per ministry',                    fmt:'CSV',  color:'#3b82f6', bg:'rgba(59,130,246,0.15)',  fn: exportMinistryCSV },
                { name:'Audit Log Export',              meta:'Recent system activity — complaint submissions and status changes',      fmt:'CSV',  color:'#f59e0b', bg:'rgba(245,158,11,0.15)',  fn: exportAuditLog },
                { name:'High Priority Report',          meta:'All unresolved high-priority complaints requiring immediate attention',  fmt:'TXT',  color:'#ef4444', bg:'rgba(239,68,68,0.15)',
                  fn: () => {
                    const hp = complaints.filter(c=>c.priority==='High'&&!['Resolved','Rejected'].includes(c.status));
                    const lines = [`GovCare+ High Priority Report — ${new Date().toLocaleDateString('en-MY')}`, `Generated: ${new Date().toISOString()}`, `Total High Priority Active: ${hp.length}`, '',
                      ...hp.map(c=>`[${c.id}] ${c.title}
  Ministry: ${c.ministry} | Status: ${c.status} | Date: ${c.date||'—'}
  Citizen: ${c.citizen} | ${c.email}`)];
                    const a = Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/plain'})),download:`GovCare_HighPriority_${new Date().toISOString().slice(0,10)}.txt`});
                    a.click(); showToast('High priority report exported!');
                  }
                },
              ].map((r,i)=>(
                <div key={i} className="rp-report-row" onClick={r.fn}>
                  <div className="rp-report-icon" style={{background:r.bg}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={r.color} strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="rp-report-name">{r.name}</div>
                    <div className="rp-report-meta">{r.meta}</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:4,background:r.bg,color:r.color,marginRight:12,flexShrink:0}}>{r.fmt}</span>
                  <button className="rp-dl-btn" onClick={e=>{e.stopPropagation();r.fn();}}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── AUDIT LOG TAB ── */}
          {reportsTab==='audit' && (
            <div className="rp-card">
              <div className="rp-card-head">
                <div>
                  <div className="rp-card-title">System Audit Log</div>
                  <div className="rp-card-sub">Recent complaint activity across all ministries</div>
                </div>
                <button className="rp-dl-btn" onClick={exportAuditLog}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export Log
                </button>
              </div>
              {auditLog.length===0 ? (
                <div style={{padding:'40px',textAlign:'center',color:'#475569',fontSize:13}}>No activity recorded yet.</div>
              ) : auditLog.map((r,i)=>(
                <div key={i} className="rp-audit-row">
                  <span className="rp-audit-dot" style={{background:r.color}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="rp-audit-action">{r.action}</div>
                    <div className="rp-audit-detail" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.detail}</div>
                  </div>
                  <span className="rp-audit-time">{r.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ═══ FAQ MANAGEMENT PAGE ════════════════════════════════════════════════
    if (activeNav === 'faq-management')
      return <AdminFAQSection darkMode={darkMode} showToast={showToast} />;

    // Placeholder pages
    const pages = {
      analytics:        { title: 'Analytics',        desc: 'Charts and trends for complaint data will appear here.',             icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    };
    const pg = pages[activeNav];
    if (pg) return (
      <div className="placeholder-page">
        <div className="placeholder-icon">{pg.icon}</div>
        <div className="placeholder-title">{pg.title}</div>
        <div className="placeholder-desc">{pg.desc}</div>
      </div>
    );
  }

  function SidebarLink({ id, label, icon, count }) {
    return (
      <li>
        <a href="#" className={activeNav === id ? 'active' : ''} onClick={e => { e.preventDefault(); goTo(id); }}>
          <span className="sidebar-icon">{icon}</span>
          {label}
          {count > 0 && <span className="sidebar-count">{count}</span>}
        </a>
      </li>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className={`admin-page${darkMode ? '' : ' light'}`}>

        {/* Top Nav */}
        <div className="admin-nav">
          <div className="admin-nav-left">
            <a href="/admin/dashboard" className="admin-logo">
              <img src="/pictures/Malaysia.svg" alt="Logo" />
              <span className="admin-logo-name">GovCare+</span>
            </a>
            <span className="admin-badge">Admin</span>
            <div className="admin-divider" />
            <span className="admin-nav-title">Complaint Management Portal</span>
          </div>
          <div className="admin-nav-right">
            {/* Dark mode toggle */}
            <button className="nav-icon-btn" onClick={toggleDark}>
              {darkMode
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>

            {/* Notification Bell */}
            <div className="notif-wrapper" ref={notifRef}>
              <button className="notif-bell" onClick={() => setNotifOpen(o => !o)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {notifications.filter(n => !readIds.includes(n.id)).length > 0 && (
                  <span className="notif-dot" />
                )}
              </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-head">
                    <div className="notif-head-left">
                      <span className="notif-heading">Notifications</span>
                      {notifications.filter(n => !readIds.includes(n.id)).length > 0 && (
                        <span className="notif-count-badge">{notifications.filter(n => !readIds.includes(n.id)).length}</span>
                      )}
                    </div>
                    <button className="notif-markall" onClick={markAllRead}>Mark all read</button>
                  </div>

                  <div className="notif-list">
                    {notifications.length === 0 ? (
                      <div className="notif-empty">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        <p>No new notifications</p>
                      </div>
                    ) : notifications.map(n => {
                      const isUnread = !readIds.includes(n.id);
                      return (
                        <div key={n.id} className={`notif-item${isUnread ? ' unread' : ''}`}
                          onClick={() => { markRead(n.id); openModal(n.complaint); setNotifOpen(false); }}>
                          <div className={`notif-icon ${n.type}`}>
                            {n.type === 'urgent'
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            }
                          </div>
                          <div className="notif-body">
                            <div className="notif-text">
                              {n.type === 'urgent'
                                ? <><strong>🔴 High Priority:</strong> {n.title}</>
                                : <><strong>📋 New Complaint:</strong> {n.title}</>
                              }
                            </div>
                            <div className="notif-meta">
                              <span className="notif-time">{n.time}</span>
                              <span className={`notif-mini-badge ${n.type}`}>{n.ministry}</span>
                              <span className="notif-time">{n.complaintId}</span>
                            </div>
                          </div>
                          {isUnread && <div className="notif-unread-dot" />}
                        </div>
                      );
                    })}
                  </div>

                  {notifications.length > 0 && (
                    <div className="notif-foot">
                      <button className="notif-viewall" onClick={() => { goTo('all-complaints'); setNotifOpen(false); }}>
                        View all complaints →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin user — no logout button */}
            <div className="admin-user-btn">
              <div className="admin-avatar">{initials}</div>
              <div>
                <div className="admin-user-name">{displayName}</div>
                <div className="admin-user-role">Administrator</div>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-layout">

          {/* Sidebar */}
          <div className="admin-sidebar">

            <div className="sidebar-section-label">Main</div>
            <ul className="sidebar-nav">
              <SidebarLink id="overview" label="Overview" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>} />
              <SidebarLink id="analytics" label="Analytics" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>} />
              <SidebarLink id="citizens" label="Citizens" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
            </ul>

            <div className="sidebar-section-label">Complaint Management</div>
            <ul className="sidebar-nav">
              <SidebarLink id="all-complaints" label="All Complaints" count={stats.pending} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>} />
              <SidebarLink id="priority-queue" label="Priority Queue" count={priorityQueue.filter(c => c.priority === 'High').length} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
              <SidebarLink id="manual-review" label="Manual Routing" count={manualReview.length > 0 ? manualReview.length : null} icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="3"/><path d="M11 2a9 9 0 1 0 0 18A9 9 0 0 0 11 2z" strokeDasharray="3 2"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>} />
            </ul>

            <div className="sidebar-section-label">Ministries</div>
            <ul className="sidebar-nav">
              {MINISTRIES.slice(1).map(m => {
                const count = complaints.filter(c => c.ministry === m).length;
                const isActive = activeNav === 'all-complaints' && filterMinistry === m;
                return (
                  <li key={m}>
                    <a href="#" className={isActive ? 'active' : ''} onClick={e => { e.preventDefault(); setFilterMinistry(m); goTo('all-complaints'); }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: MINISTRY_COLORS[m], flexShrink: 0, display: 'inline-block' }}></span>
                      {m}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569', fontWeight: 600 }}>{count}</span>
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="sidebar-section-label">Settings</div>
            <ul className="sidebar-nav">
              <SidebarLink id="user-management" label="User Management" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>} />
              <SidebarLink id="faq-management" label="FAQ Management" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>} />
              <SidebarLink id="settings" label="Settings" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>} />
              <SidebarLink id="reports" label="Reports" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} />
              <li>
                <button onClick={handleLogout} style={{ color: '#f87171' }}>
                  <span className="sidebar-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
                  Logout
                </button>
              </li>
            </ul>
          </div>

          {/* Main Content */}
          <div className="admin-main">
            {renderMain()}
          </div>
        </div>

        {/* Update Modal */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal-panel" onClick={e => e.stopPropagation()}>
              <div className="modal-top">
                <h3>Complaint Details — {selected.id}</h3>
                <button className="modal-close" onClick={() => setSelected(null)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="modal-grid">
                  <div className="modal-field"><label>Complaint ID</label><div className="modal-field-value" style={{ color: '#6366f1', fontWeight: 700 }}>{selected.id}</div></div>
                  <div className="modal-field"><label>Date Submitted</label><div className="modal-field-value">{selected.date || '—'}</div></div>
                  <div className="modal-field"><label>Citizen Name</label><div className="modal-field-value">{selected.citizen}</div></div>
                  <div className="modal-field"><label>Email</label><div className="modal-field-value">{selected.email}</div></div>
                  <div className="modal-field"><label>Ministry</label>
                    <span className="ministry-tag" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span className="ministry-dot" style={{ background: MINISTRY_COLORS[selected.ministry] || '#6b7280' }}></span>
                      <span style={{ color: MINISTRY_COLORS[selected.ministry] || '#6b7280', fontWeight: 600 }}>{selected.ministry}</span>
                    </span>
                  </div>
                  <div className="modal-field"><label>Priority</label>
                    <div className={`modal-field-value priority-badge priority-${(selected.priority || 'medium').toLowerCase()}`} style={{ marginTop: 4 }}>{selected.priority || 'Medium'}</div>
                  </div>
                </div>
                <div className="modal-field"><label>Title</label><div className="modal-field-value" style={{ fontWeight: 600 }}>{selected.title}</div></div>
                <div className="modal-field"><label>Description</label><div className="modal-field-value desc">{selected.description || 'No description provided.'}</div></div>
                <div className="modal-field">
                  <label>Update Status</label>
                  <select className="modal-status-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    {STATUSES.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="modal-field">
                  <label>Admin Notes (optional)</label>
                  <textarea className="modal-notes" placeholder="Add internal notes..." value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn-update" onClick={handleUpdateStatus} disabled={updating}>{updating ? 'Updating...' : 'Update Status'}</button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="toast" style={{ background: toast.error ? '#ef4444' : '#10b981' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}
