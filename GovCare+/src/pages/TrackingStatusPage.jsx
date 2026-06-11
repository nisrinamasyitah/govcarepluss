import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { decryptFields } from '../crypto';

const langMeta = { en:{flag:'🇬🇧',label:'EN'}, ms:{flag:'🇲🇾',label:'BM'}, zh:{flag:'🇨🇳',label:'中文'}, ta:{flag:'🇮🇳',label:'தமிழ்'} };

// Map Firestore status → UI class
const STATUS_MAP = {
  'Submitted':     'submitted',
  'Pending Review':'under-review',
  'In Progress':   'in-progress',
  'Resolved':      'resolved',
  'Rejected':      'closed',
};

// Build a timeline from a real complaint document
function buildTimeline(c) {
  const timeline = [];
  const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : c.date || '';

  // Always show: Submitted
  timeline.push({
    title: 'Complaint Submitted',
    date: fmt(c.date),
    desc: `Your complaint has been successfully submitted and received reference number ${c.id}.`,
    actor: 'Submitted by you',
    status: 'completed',
  });

  // If classified by NLP / assigned to ministry
  if (c.ministry && c.ministry !== 'Pending') {
    timeline.push({
      title: 'Routed to Ministry',
      date: fmt(c.date),
      desc: `Your complaint was routed to ${c.ministryLabel || c.ministry} via BERT NLP${c.nlpConfidence ? ` with ${c.nlpConfidence}% confidence` : ''}.`,
      actor: 'Automated by GovCare+ AI System',
      status: 'completed',
    });
  }

  // Pending Review
  if (['Pending Review','In Progress','Resolved'].includes(c.status)) {
    timeline.push({
      title: 'Under Review',
      date: fmt(c.date),
      desc: 'Your complaint is being reviewed by the assigned ministry.',
      actor: `Reviewed by ${c.ministryLabel || c.ministry || 'Ministry'}`,
      status: c.status === 'Pending Review' ? 'active' : 'completed',
    });
  }

  // In Progress — with admin notes as ministry response
  if (['In Progress','Resolved'].includes(c.status)) {
    timeline.push({
      title: 'Complaint In Progress',
      date: fmt(c.date),
      desc: 'The ministry is actively working on resolving your complaint.',
      actor: `Updated by ${c.ministryLabel || c.ministry || 'Ministry'}`,
      status: c.status === 'In Progress' ? 'active' : 'completed',
      response: c.adminNotes ? {
        from: `Official Response from ${c.ministryLabel || c.ministry}`,
        date: fmt(c.date),
        text: c.adminNotes,
      } : null,
    });
  }

  // Resolved
  if (c.status === 'Resolved') {
    timeline.push({
      title: 'Complaint Resolved',
      date: fmt(c.date),
      desc: 'Your complaint has been successfully resolved. Thank you for helping improve public services.',
      actor: `Resolved by ${c.ministryLabel || c.ministry || 'Ministry'}`,
      status: 'completed',
    });
  }

  // Rejected
  if (c.status === 'Rejected') {
    timeline.push({
      title: 'Complaint Rejected',
      date: fmt(c.date),
      desc: c.adminNotes || 'Your complaint could not be processed at this time.',
      actor: `Updated by ${c.ministryLabel || c.ministry || 'Ministry'}`,
      status: 'active',
    });
  }

  return timeline.reverse(); // newest first
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html, body { margin:0; padding:0; }
.track-page { font-family:'Inter',sans-serif; background:#f9fafb; min-height:100vh; width:100%; color:#1a1a1a; }
.track-page.dark { background:#0f172a; color:#e2e8f0; }
.top-nav { background:#fff; height:70px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; justify-content:space-between; padding:0 40px; position:sticky; top:0; z-index:100; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.track-page.dark .top-nav { background:#1e293b; border-color:#334155; }
.logo-link { display:flex; align-items:center; gap:12px; text-decoration:none; }
.jata { width:36px; height:36px; } .jata img { width:100%; height:100%; object-fit:contain; }
.brand { color:#090088; font-size:20px; font-weight:700; }
.track-page.dark .brand { color:#ffffff; }
.nav-right { display:flex; align-items:center; gap:16px; }
.theme-btn { display:flex; align-items:center; justify-content:center; width:40px; height:40px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; color:#374151; }
.track-page.dark .theme-btn { background:#334155; border-color:#475569; color:#fbbf24; }
.lang-wrap { position:relative; }
.lang-btn { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#374151; }
.track-page.dark .lang-btn { background:#334155; border-color:#475569; color:#e2e8f0; }
.lang-drop { position:absolute; top:calc(100% + 8px); right:0; width:180px; background:white; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.15); border:1px solid #e5e7eb; z-index:1000; overflow:hidden; opacity:0; visibility:hidden; transform:translateY(-6px); transition:all 0.2s; }
.lang-drop.open { opacity:1; visibility:visible; transform:translateY(0); }
.track-page.dark .lang-drop { background:#1e293b; border-color:#334155; }
.lang-opt { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; font-size:14px; color:#374151; transition:background 0.2s; }
.lang-opt:hover { background:#f3f4f6; } .lang-opt.active { background:#ede9fe; color:#090088; font-weight:600; }
.track-page.dark .lang-opt { color:#e2e8f0; } .track-page.dark .lang-opt:hover { background:#334155; } .track-page.dark .lang-opt.active { background:#312e81; color:#a5b4fc; }
.back-link { display:flex; align-items:center; gap:8px; color:#6b7280; text-decoration:none; font-size:14px; font-weight:500; padding:8px 12px; border-radius:8px; transition:all 0.2s; }
.back-link:hover { color:#090088; background:#f3f4f6; }
.track-page.dark .back-link { color:#94a3b8; }
.container { max-width:1200px; margin:0 auto; padding:40px 24px; }
.page-header { margin-bottom:32px; }
.page-header h1 { font-size:28px; font-weight:700; color:#1a1a1a; margin-bottom:8px; }
.track-page.dark .page-header h1 { color:#f1f5f9; }
.page-header p { font-size:14px; color:#6b7280; }
.filters-bar { background:white; border-radius:12px; padding:24px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
.track-page.dark .filters-bar { background:#1e293b; }
.filters-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:16px; align-items:end; }
@media(max-width:900px) { .filters-grid { grid-template-columns:1fr 1fr; } }
.filter-group { display:flex; flex-direction:column; gap:8px; }
.filter-label { font-size:13px; font-weight:600; color:#374151; }
.track-page.dark .filter-label { color:#94a3b8; }
.filter-input { padding:10px 14px; border:1.5px solid #d1d5db; border-radius:8px; font-size:14px; font-family:inherit; transition:all 0.2s; background:white; color:#1a1a1a; }
.filter-input:focus { outline:none; border-color:#090088; box-shadow:0 0 0 3px rgba(9,0,136,0.1); }
.track-page.dark .filter-input { background:#334155; border-color:#475569; color:#f1f5f9; }
.btn-filter { padding:10px 20px; background:#4779c4; color:white; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
.btn-filter:hover { background:#3a6ab0; }
.results-summary { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
.results-count { font-size:14px; color:#6b7280; }
.track-page.dark .results-count { color:#94a3b8; }
.complaints-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(380px,1fr)); gap:20px; }
.complaint-card { background:white; border:1px solid #e5e7eb; border-radius:12px; padding:20px; cursor:pointer; transition:all 0.2s; }
.complaint-card:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(0,0,0,0.1); border-color:#090088; }
.track-page.dark .complaint-card { background:#1e293b; border-color:#334155; }
.track-page.dark .complaint-card:hover { border-color:#818cf8; background:#243044; }
.card-header { display:flex; justify-content:space-between; align-items:start; margin-bottom:12px; }
.complaint-id-badge { font-size:12px; font-weight:700; color:#090088; background:#ede9fe; padding:4px 10px; border-radius:6px; }
.track-page.dark .complaint-id-badge { color:#818cf8; }
.complaint-date-text { font-size:12px; color:#6b7280; }
.complaint-title-text { font-size:15px; font-weight:600; color:#1a1a1a; margin-bottom:12px; line-height:1.4; }
.track-page.dark .complaint-title-text { color:#f1f5f9; }
.card-meta { display:flex; flex-wrap:wrap; gap:12px; margin-bottom:12px; }
.meta-item { display:flex; align-items:center; gap:4px; font-size:13px; color:#6b7280; }
.category-badge { background:#f3f4f6; color:#374151; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:600; }
.card-footer { display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid #f3f4f6; }
.track-page.dark .card-footer { border-color:#334155; }
.status-badge { padding:5px 10px; border-radius:6px; font-size:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px; }
.status-badge.submitted { background:#dbeafe; color:#1d4ed8; }
.status-badge.under-review { background:#fef3c7; color:#92400e; }
.status-badge.in-progress { background:#fed7aa; color:#c2410c; }
.status-badge.resolved { background:#d1fae5; color:#065f46; }
.status-badge.closed { background:#f3f4f6; color:#374151; }
.updated-text { font-size:12px; color:#6b7280; }
.empty-state { text-align:center; padding:80px 20px; }
@keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
.empty-icon { width:80px; height:80px; margin:0 auto 20px; background:#f3f4f6; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.empty-state h3 { font-size:20px; color:#1a1a1a; margin-bottom:8px; }
.track-page.dark .empty-state h3 { color:#f1f5f9; }
.empty-state p { font-size:14px; color:#6b7280; margin-bottom:24px; }
.btn-primary { padding:12px 24px; background:#090088; color:white; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; }
.btn-primary:hover { background:#070066; }
/* Modal */
.modal-overlay { display:none; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.5); align-items:center; justify-content:center; padding:20px; }
.modal-overlay.show { display:flex; }
.modal-content { background:white; border-radius:16px; width:100%; max-width:700px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,0.3); }
.track-page.dark .modal-content { background:#1e293b; }
.modal-header { padding:24px 28px; border-bottom:1px solid #e5e7eb; position:relative; }
.track-page.dark .modal-header { border-color:#334155; }
.modal-close { position:absolute; top:20px; right:20px; background:none; border:none; cursor:pointer; color:#6b7280; padding:4px; border-radius:6px; }
.modal-close:hover { background:#f3f4f6; }
.modal-title { font-size:20px; font-weight:700; color:#1a1a1a; margin-top:8px; }
.track-page.dark .modal-title { color:#f1f5f9; }
.modal-meta { display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; align-items:center; }
.modal-body { padding:28px; overflow-y:auto; }
.detail-section { margin-bottom:28px; }
.section-title-row { display:flex; align-items:center; gap:8px; font-size:15px; font-weight:700; color:#1a1a1a; margin-bottom:16px; }
.track-page.dark .section-title-row { color:#f1f5f9; }
.complaint-desc-text { font-size:14px; color:#374151; line-height:1.7; background:#f9fafb; padding:16px; border-radius:8px; border:1px solid #e5e7eb; }
.track-page.dark .complaint-desc-text { background:#0f172a; border-color:#334155; color:#cbd5e1; }
.timeline { position:relative; padding-left:36px; }
.timeline::before { content:''; position:absolute; left:12px; top:4px; bottom:4px; width:2px; background:#e5e7eb; }
.track-page.dark .timeline::before { background:#334155; }
.tl-item { position:relative; margin-bottom:24px; }
.tl-dot { position:absolute; left:-28px; top:4px; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 0 2px #e5e7eb; }
.tl-dot.active { background:#f97316; box-shadow:0 0 0 2px #fed7aa; }
.tl-dot.completed { background:#10b981; box-shadow:0 0 0 2px #d1fae5; }
.tl-content { background:#f9fafb; padding:16px; border-radius:10px; border:1px solid #e5e7eb; }
.track-page.dark .tl-content { background:#0f172a; border-color:#334155; }
.tl-header { display:flex; justify-content:space-between; align-items:start; margin-bottom:8px; }
.tl-title { font-size:14px; font-weight:600; color:#1a1a1a; }
.track-page.dark .tl-title { color:#f1f5f9; }
.tl-date { font-size:12px; color:#6b7280; }
.tl-desc { font-size:13px; color:#374151; margin-bottom:8px; line-height:1.6; }
.track-page.dark .tl-desc { color:#94a3b8; }
.tl-actor { font-size:12px; color:#6b7280; display:flex; align-items:center; gap:4px; }
.response-box { background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:16px; margin-top:12px; }
.response-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.response-from { font-size:13px; font-weight:600; color:#0369a1; }
.response-date { font-size:12px; color:#0c4a6e; }
.response-text { font-size:13px; color:#0c4a6e; line-height:1.7; }
.track-page.dark .filter-input::placeholder { color:#64748b; }
.track-page.dark .results-count { color:#94a3b8; }
.track-page.dark .complaint-card:hover { border-color:#4779c4; }
.track-page.dark .complaint-id-badge { color:#a5b4fc; }
.track-page.dark .complaint-date-text { color:#64748b; }
.track-page.dark .updated-text { color:#64748b; }
.track-page.dark .meta-item { color:#94a3b8; }
.track-page.dark .empty-icon { background:#1e293b; }
.track-page.dark .empty-state h3 { color:#f1f5f9; }
.track-page.dark .empty-state p { color:#94a3b8; }
.track-page.dark .btn-primary { background:#4779c4; }
.track-page.dark .btn-primary:hover { background:#3a6ab0; }
.track-page.dark .back-link:hover { color:#cbd5e1; background:#334155; }
.track-page.dark .modal-header { border-color:#334155; }
.track-page.dark .modal-title { color:#f1f5f9; }
.track-page.dark .tl-title { color:#f1f5f9; }
.track-page.dark .tl-date { color:#64748b; }
.track-page.dark .tl-desc { color:#94a3b8; }
.track-page.dark .tl-actor { color:#64748b; }
.track-page.dark .complaint-desc-text { background:#0f172a; border-color:#334155; color:#cbd5e1; }
.track-page.dark .section-title-row { color:#f1f5f9; }
`;

export default function TrackingStatusPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const langRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    setLanguage(localStorage.getItem('govcare-language') || 'en');
  }, []);

  // Firebase: real-time listener for this user's complaints
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) { setLoading(false); return; }

      // Real-time complaints — decrypt each document client-side
      const q = query(collection(db, 'complaints'), where('citizenId', '==', user.uid));
      const unsubSnap = onSnapshot(q, async snap => {
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
        if (selectedComplaint) {
          const updated = sorted.find(c => c.docId === selectedComplaint.docId);
          if (updated) setSelectedComplaint(updated);
        }
        setLoading(false);
      });

      return () => unsubSnap();
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
    const h = (e) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  function toggleDark() { const n = !darkMode; setDarkMode(n); localStorage.setItem('govcare-theme', n ? 'dark' : 'light'); }
  function changeLang(l) { setLanguage(l); setLangOpen(false); localStorage.setItem('govcare-language', l); }

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const days = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  }

  const filtered = complaints.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.title?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q);
    const matchStatus = !statusFilter || STATUS_MAP[c.status] === statusFilter;
    const matchCat = !categoryFilter || c.ministry?.toLowerCase().includes(categoryFilter) || c.category?.toLowerCase().includes(categoryFilter);
    return matchSearch && matchStatus && matchCat;
  });

  const meta = langMeta[language];

  function StatusBadge({ status }) {
    const labels = { submitted:'Submitted', 'under-review':'Under Review', 'in-progress':'In Progress', resolved:'Resolved', closed:'Closed' };
    return <span className={`status-badge ${status}`}><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>{labels[status]}</span>;
  }

  return (
    <>
      <style>{css}</style>
      <div className={`track-page${darkMode ? ' dark' : ''}`}>

        {/* Nav */}
        <div className="top-nav">
          <Link to="/dashboard" className="logo-link">
            <div className="jata"><img src="/pictures/Malaysia.svg" alt="Jata Negara" /></div>
            <div className="brand">GovCare+</div>
          </Link>
          <div className="nav-right">
            <button className="theme-btn" onClick={toggleDark}>
              {darkMode
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>
                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>
            <div className="lang-wrap" ref={langRef}>
              <div className="lang-btn" onClick={() => setLangOpen(o => !o)}>
                <span>{meta.flag}</span><span>{meta.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div className={`lang-drop${langOpen ? ' open' : ''}`}>
                {Object.entries(langMeta).map(([code, {flag, label}]) => (
                  <div key={code} className={`lang-opt${language===code?' active':''}`} onClick={() => changeLang(code)}>
                    <span>{flag}</span><span>{label==='EN'?'English':label==='BM'?'Bahasa Melayu':label}</span>
                    {language===code && <svg style={{marginLeft:'auto'}} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>}
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
          <div className="page-header">
            <h1>Track My Complaints</h1>
            <p>View and monitor the status of all your submitted complaints</p>
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">Search</label>
                <input className="filter-input" placeholder="Search by ID, title, or keyword..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select className="filter-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="submitted">Submitted</option>
                  <option value="under-review">Under Review</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Category</label>
                <select className="filter-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="health">Health</option>
                  <option value="transport">Transport</option>
                  <option value="education">Education</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="home affairs">Home Affairs</option>
                  <option value="environment">Environment</option>
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Date Range</label>
                <input type="date" className="filter-input" />
              </div>
              <div className="filter-group">
                <label className="filter-label">&nbsp;</label>
                <button className="btn-filter">Apply Filters</button>
              </div>
            </div>
          </div>

          <div className="results-summary">
            <div className="results-count">Showing <strong>{loading ? '…' : `${filtered.length} complaints`}</strong></div>
          </div>

          {loading ? (
            <div className="complaints-grid">
              {[1,2,3].map(i => (
                <div key={i} style={{ height:140, borderRadius:14, background: darkMode ? '#1e293b' : '#e5e7eb', animation:'shimmer 1.4s infinite', backgroundSize:'400px 100%', backgroundImage: darkMode ? 'linear-gradient(90deg,#1e293b 25%,#334155 50%,#1e293b 75%)' : 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </div>
              <h3>{complaints.length === 0 ? 'No complaints yet' : 'No complaints found'}</h3>
              <p>{complaints.length === 0 ? 'Submit your first complaint below' : 'Try adjusting your search or filter criteria'}</p>
              <button className="btn-primary" onClick={() => navigate('/submit-complaint')}>Submit New Complaint</button>
            </div>
          ) : (
            <div className="complaints-grid">
              {filtered.map(c => (
                <div key={c.docId} className="complaint-card" onClick={() => setSelectedComplaint(c)}>
                  <div className="card-header">
                    <span className="complaint-id-badge">{c.id}</span>
                    <span className="complaint-date-text">{c.date}</span>
                  </div>
                  <div className="complaint-title-text">{c.title}</div>
                  <div className="card-meta">
                    <div className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                      {c.ministryLabel || c.ministry}
                    </div>
                    <span className="category-badge">{c.category}</span>
                  </div>
                  <div className="card-footer">
                    <StatusBadge status={STATUS_MAP[c.status] || 'submitted'} />
                    <span className="updated-text">Updated {timeAgo(c.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <div className={`modal-overlay${selectedComplaint ? ' show' : ''}`} onClick={e => { if (e.target.classList.contains('modal-overlay')) setSelectedComplaint(null); }}>
          <div className="modal-content">
            {selectedComplaint && (() => {
              const c = selectedComplaint;
              const uiStatus = STATUS_MAP[c.status] || 'submitted';
              const timeline = buildTimeline(c);
              return (
                <>
                  <div className="modal-header">
                    <button className="modal-close" onClick={() => setSelectedComplaint(null)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <div><span className="complaint-id-badge">{c.id}</span></div>
                    <div className="modal-title">{c.title}</div>
                    <div className="modal-meta">
                      <StatusBadge status={uiStatus} />
                      <span className="category-badge">{c.category}</span>
                      <span className="meta-item" style={{fontSize:'13px', color:'#6b7280'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        {c.ministryLabel || c.ministry}
                      </span>
                    </div>
                  </div>
                  <div className="modal-body">
                    <div className="detail-section">
                      <div className="section-title-row">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Complaint Description
                      </div>
                      <div className="complaint-desc-text">{c.description}</div>
                    </div>
                    <div className="detail-section">
                      <div className="section-title-row">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Status Timeline
                      </div>
                      <div className="timeline">
                        {timeline.map((item, i) => (
                          <div key={i} className="tl-item">
                            <div className={`tl-dot ${item.status}`}></div>
                            <div className="tl-content">
                              <div className="tl-header">
                                <div className="tl-title">{item.title}</div>
                                <div className="tl-date">{item.date}</div>
                              </div>
                              <div className="tl-desc">{item.desc}</div>
                              <div className="tl-actor">{item.actor}</div>
                              {item.response && (
                                <div className="response-box">
                                  <div className="response-header">
                                    <span className="response-from">{item.response.from}</span>
                                    <span className="response-date">{item.response.date}</span>
                                  </div>
                                  <div className="response-text">{item.response.text}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </>
  );
}
