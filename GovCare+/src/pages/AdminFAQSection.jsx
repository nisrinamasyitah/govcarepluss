/**
 * AdminFAQSection.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin FAQ Management module for GovCare+.
 *
 * INTEGRATION STEPS (AdminDashboardPage.jsx):
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Import this component at the top of AdminDashboardPage.jsx:
 *      import AdminFAQSection from './AdminFAQSection';
 *
 * 2. Add a sidebar link inside the "Settings" section group:
 *      <SidebarLink id="faq-management" label="FAQ Management"
 *        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
 *          stroke="currentColor" strokeWidth="2">
 *          <circle cx="12" cy="12" r="10"/>
 *          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
 *          <line x1="12" y1="17" x2="12.01" y2="17"/>
 *        </svg>}
 *      />
 *
 * 3. Add a render case inside renderMain():
 *      if (activeNav === 'faq-management')
 *        return <AdminFAQSection darkMode={darkMode} showToast={showToast} />;
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── Default FAQs seeded on first load ───────────────────────────────────────
const DEFAULT_FAQS = [
  { category: 'Getting Started',       question: 'What is GovCare+?',                     answer: 'GovCare+ is a secure, AI-powered e-government complaint routing system that lets citizens submit and track complaints with automatic NLP-based ministry routing.',        published: true,  order: 1 },
  { category: 'Getting Started',       question: 'Who can use GovCare+?',                  answer: 'Any Malaysian citizen or resident can register for a free account and submit complaints about government services.',                                                     published: true,  order: 2 },
  { category: 'Submitting Complaints', question: 'How do I submit a complaint?',           answer: 'Log in, click "Submit Complaint", fill in the title and description, then submit. Our NLP engine will route it automatically to the correct ministry.',                  published: true,  order: 1 },
  { category: 'Submitting Complaints', question: 'Can I write in Bahasa Melayu?',          answer: 'Yes. GovCare+ supports both English and Bahasa Melayu. Our NLP model is trained to classify complaints in both languages accurately.',                                 published: true,  order: 2 },
  { category: 'Tracking & Status',     question: 'How do I track my complaint?',           answer: 'Go to "My Complaints" on your dashboard. Each complaint shows its status: Submitted, Pending Review, In Progress, Resolved, or Rejected.',                              published: true,  order: 1 },
  { category: 'Account & Security',    question: 'Is my personal data safe?',              answer: 'Yes. All data is stored using Firebase with encrypted storage and HTTPS. Your information is only accessible to authorised government administrators.',                  published: true,  order: 1 },
  { category: 'NLP & AI Routing',      question: 'How does automatic routing work?',       answer: 'We use a BERT-based NLP model trained on Malaysian government service categories. It classifies complaint text and routes it to the most relevant ministry in seconds.', published: true,  order: 1 },
  { category: 'NLP & AI Routing',      question: 'What is a duplicate complaint?',         answer: 'If your complaint is very similar to another recent one (same topic and ministry), the system flags it for manual admin review using Jaccard similarity scoring.',       published: false, order: 2 },
];

const CATEGORIES = ['Getting Started', 'Submitting Complaints', 'Tracking & Status', 'Account & Security', 'NLP & AI Routing'];

const CATEGORY_COLORS = {
  'Getting Started':       '#3b82f6',
  'Submitting Complaints': '#10b981',
  'Tracking & Status':     '#f59e0b',
  'Account & Security':    '#8b5cf6',
  'NLP & AI Routing':      '#B889C5',
};

// ─── Inline styles (injected once) ───────────────────────────────────────────
const faqAdminCss = `
  .faq-admin-page { display: flex; flex-direction: column; gap: 24px; }

  /* Header */
  .faq-admin-header { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .faq-admin-add-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 9px 18px; background: linear-gradient(135deg, #B889C5, #9b6aae);
    border: none; border-radius: 9px; color: #fff; font-size: 13px; font-weight: 700;
    font-family: inherit; cursor: pointer; transition: all 0.2s; white-space: nowrap;
  }
  .faq-admin-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(184,137,197,0.4); }

  /* KPI strip */
  .faq-admin-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
  .faq-admin-kpi {
    background: #1e293b; border: 1px solid #334155; border-radius: 13px;
    padding: 18px 20px; display: flex; flex-direction: column; gap: 6px;
  }
  .admin-page.light .faq-admin-kpi { background: white; border-color: #e5e7eb; }
  .faq-admin-kpi-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #475569; }
  .faq-admin-kpi-val { font-size: 30px; font-weight: 800; color: #f1f5f9; letter-spacing: -1px; line-height: 1; }
  .admin-page.light .faq-admin-kpi-val { color: #0f172a; }
  .faq-admin-kpi-sub { font-size: 11px; font-weight: 600; }

  /* Toolbar */
  .faq-admin-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .faq-admin-search {
    display: flex; align-items: center; gap: 8px;
    background: #1e293b; border: 1px solid #334155; border-radius: 9px; padding: 9px 14px; flex: 1; min-width: 200px;
  }
  .admin-page.light .faq-admin-search { background: white; border-color: #e5e7eb; }
  .faq-admin-search input { background: none; border: none; outline: none; color: #e2e8f0; font-size: 13px; width: 100%; font-family: inherit; }
  .admin-page.light .faq-admin-search input { color: #1a1a1a; }
  .faq-admin-search input::placeholder { color: #475569; }
  .faq-admin-filter {
    padding: 9px 14px; background: #1e293b; border: 1px solid #334155;
    border-radius: 9px; color: #94a3b8; font-size: 13px; font-family: inherit; cursor: pointer; outline: none;
  }
  .admin-page.light .faq-admin-filter { background: white; border-color: #e5e7eb; color: #4b5563; }

  /* FAQ list */
  .faq-admin-list { display: flex; flex-direction: column; gap: 10px; }
  .faq-admin-card {
    background: #1e293b; border: 1px solid #334155; border-left: 4px solid transparent;
    border-radius: 12px; padding: 18px 20px; transition: all 0.15s; display: flex; align-items: flex-start; gap: 16px;
  }
  .admin-page.light .faq-admin-card { background: white; border-color: #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .faq-admin-card.published { border-left-color: #10b981; }
  .faq-admin-card.draft     { border-left-color: #334155; }
  .faq-admin-card:hover { transform: translateX(3px); }
  .faq-admin-card-body { flex: 1; min-width: 0; }
  .faq-admin-card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .faq-admin-cat-pill {
    font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px;
    border: 1px solid; display: inline-flex; align-items: center;
  }
  .faq-admin-pub-pill {
    font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;
  }
  .faq-admin-pub-pill.pub { background: rgba(16,185,129,0.12); color: #10b981; }
  .faq-admin-pub-pill.draft { background: rgba(100,116,139,0.12); color: #64748b; }
  .faq-admin-order { font-size: 11px; color: #334155; }
  .faq-admin-q { font-size: 14px; font-weight: 700; color: #f1f5f9; margin-bottom: 6px; }
  .admin-page.light .faq-admin-q { color: #0f172a; }
  .faq-admin-a { font-size: 13px; color: #64748b; line-height: 1.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .faq-admin-card-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .faq-admin-btn {
    font-size: 11px; font-weight: 700; padding: 5px 12px; border-radius: 7px;
    cursor: pointer; font-family: inherit; border: 1px solid; transition: all 0.15s; white-space: nowrap;
  }
  .faq-admin-btn.edit   { color: #a5b4fc; background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.2); }
  .faq-admin-btn.edit:hover   { background: rgba(99,102,241,0.2); }
  .faq-admin-btn.toggle { color: #6ee7b7; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); }
  .faq-admin-btn.toggle:hover { background: rgba(16,185,129,0.2); }
  .faq-admin-btn.unpub  { color: #fca5a5; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); }
  .faq-admin-btn.unpub:hover  { background: rgba(239,68,68,0.2); }
  .faq-admin-btn.delete { color: #f87171; background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.15); }
  .faq-admin-btn.delete:hover { background: rgba(239,68,68,0.18); }

  /* Empty */
  .faq-admin-empty { padding: 60px 20px; text-align: center; color: #475569; font-size: 13px; }

  /* Modal */
  .faq-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000;
    display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);
  }
  .faq-modal {
    background: #1e293b; border: 1px solid #334155; border-radius: 18px;
    width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 25px 60px rgba(0,0,0,0.5); animation: faqModalIn 0.2s ease;
  }
  @keyframes faqModalIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
  .admin-page.light .faq-modal { background: white; border-color: #e5e7eb; }
  .faq-modal-top {
    display: flex; justify-content: space-between; align-items: center;
    padding: 20px 24px; border-bottom: 1px solid #334155;
  }
  .admin-page.light .faq-modal-top { border-color: #e5e7eb; }
  .faq-modal-title { font-size: 17px; font-weight: 800; color: #f1f5f9; }
  .admin-page.light .faq-modal-title { color: #0f172a; }
  .faq-modal-close {
    width: 32px; height: 32px; background: #334155; border: none; border-radius: 8px;
    color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  }
  .faq-modal-close:hover { background: #475569; color: #e2e8f0; }
  .faq-modal-body { padding: 24px; }
  .faq-modal-field { margin-bottom: 18px; }
  .faq-modal-label {
    display: block; font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; color: #64748b; margin-bottom: 7px;
  }
  .faq-modal-input, .faq-modal-textarea, .faq-modal-select {
    width: 100%; padding: 11px 14px; background: #0f172a; border: 1.5px solid #334155;
    border-radius: 9px; color: #e2e8f0; font-size: 14px; font-family: inherit; outline: none;
    transition: border-color 0.2s;
  }
  .admin-page.light .faq-modal-input,
  .admin-page.light .faq-modal-textarea,
  .admin-page.light .faq-modal-select { background: #f8fafc; border-color: #e5e7eb; color: #0f172a; }
  .faq-modal-input:focus, .faq-modal-textarea:focus, .faq-modal-select:focus { border-color: #B889C5; }
  .faq-modal-textarea { resize: vertical; min-height: 120px; line-height: 1.65; }
  .faq-modal-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .faq-modal-toggle-row { display: flex; align-items: center; justify-content: space-between; }
  .faq-modal-toggle-row .st-toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
  .faq-modal-toggle-row .st-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
  .faq-modal-toggle-row .st-toggle-track {
    position: absolute; inset: 0; border-radius: 11px; background: #334155; cursor: pointer; transition: background 0.2s;
  }
  .faq-modal-toggle-row .st-toggle input:checked + .st-toggle-track { background: #10b981; }
  .faq-modal-toggle-row .st-toggle-track::after {
    content: ''; position: absolute; width: 16px; height: 16px; border-radius: 50%;
    background: white; top: 3px; left: 3px; transition: transform 0.2s;
  }
  .faq-modal-toggle-row .st-toggle input:checked + .st-toggle-track::after { transform: translateX(18px); }
  .faq-modal-footer {
    display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #334155;
  }
  .admin-page.light .faq-modal-footer { border-color: #e5e7eb; }
  .faq-modal-save {
    flex: 1; padding: 11px; background: linear-gradient(135deg, #B889C5, #9b6aae);
    color: white; border: none; border-radius: 9px; font-size: 14px; font-weight: 700;
    font-family: inherit; cursor: pointer; transition: all 0.15s;
  }
  .faq-modal-save:hover { opacity: 0.92; transform: translateY(-1px); }
  .faq-modal-cancel {
    padding: 11px 20px; background: #334155; border: none; border-radius: 9px;
    color: #94a3b8; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s;
  }
  .faq-modal-cancel:hover { background: #475569; color: #e2e8f0; }
  .faq-admin-loading { padding: 60px 20px; text-align: center; color: #475569; font-size: 13px; }
`;

const STYLE_ID = 'govcare-faq-admin-css';

// ─── AdminFAQSection ──────────────────────────────────────────────────────────
export default function AdminFAQSection({ darkMode, showToast }) {
  const [faqs, setFaqs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [seeded, setSeeded]       = useState(false);
  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [filterPub, setFilterPub] = useState('All');
  const [modal, setModal]         = useState(null); // null | 'create' | {faq object}
  const [saving, setSaving]       = useState(false);

  // Form state
  const BLANK = { question: '', answer: '', category: CATEGORIES[0], order: 1, published: true };
  const [form, setForm] = useState(BLANK);

  // Inject styles once
  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement('style');
      s.id = STYLE_ID;
      s.textContent = faqAdminCss;
      document.head.appendChild(s);
    }
  }, []);

  // Real-time listener from Firestore
  useEffect(() => {
    const q = query(collection(db, 'faqs'), orderBy('category'), orderBy('order'));
    const unsub = onSnapshot(q, async snap => {
      if (snap.empty && !seeded) {
        // Seed default FAQs on first load
        setSeeded(true);
        try {
          await Promise.all(DEFAULT_FAQS.map(faq =>
            addDoc(collection(db, 'faqs'), { ...faq, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
          ));
        } catch (_) {
          // Firestore may not be set up — use local state
          setFaqs(DEFAULT_FAQS.map((f, i) => ({ ...f, id: `default-${i}` })));
          setLoading(false);
        }
        return;
      }
      setFaqs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => {
      // Fallback to defaults if no Firestore access
      setFaqs(DEFAULT_FAQS.map((f, i) => ({ ...f, id: `default-${i}` })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter
  const filtered = faqs.filter(f => {
    const q = search.toLowerCase();
    const matchSearch = !q || f.question?.toLowerCase().includes(q) || f.answer?.toLowerCase().includes(q);
    const matchCat = filterCat === 'All' || f.category === filterCat;
    const matchPub = filterPub === 'All' || (filterPub === 'Published' ? f.published : !f.published);
    return matchSearch && matchCat && matchPub;
  });

  // Stats
  const published = faqs.filter(f => f.published).length;
  const drafts    = faqs.filter(f => !f.published).length;

  // Open modal
  function openCreate() { setForm({ ...BLANK, order: faqs.length + 1 }); setModal('create'); }
  function openEdit(faq) { setForm({ question: faq.question, answer: faq.answer, category: faq.category, order: faq.order || 1, published: faq.published }); setModal(faq); }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) {
      showToast?.('Question and answer are required.', true);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, updatedAt: serverTimestamp() };
      if (modal === 'create') {
        await addDoc(collection(db, 'faqs'), { ...payload, createdAt: serverTimestamp() });
        showToast?.('FAQ added successfully!');
      } else {
        if (!modal.id.startsWith('default-')) {
          await updateDoc(doc(db, 'faqs', modal.id), payload);
        }
        showToast?.('FAQ updated!');
      }
      setModal(null);
    } catch (e) {
      showToast?.('Save failed — check Firestore permissions.', true);
    }
    setSaving(false);
  }

  async function handleTogglePublish(faq) {
    try {
      if (!faq.id.startsWith('default-')) {
        await updateDoc(doc(db, 'faqs', faq.id), { published: !faq.published, updatedAt: serverTimestamp() });
      }
      showToast?.(faq.published ? 'FAQ set to draft.' : 'FAQ published!');
    } catch { showToast?.('Update failed.', true); }
  }

  async function handleDelete(faq) {
    if (!window.confirm(`Delete this FAQ?\n"${faq.question}"`)) return;
    try {
      if (!faq.id.startsWith('default-')) {
        await deleteDoc(doc(db, 'faqs', faq.id));
      }
      showToast?.('FAQ deleted.');
    } catch { showToast?.('Delete failed.', true); }
  }

  return (
    <div className="faq-admin-page">

      {/* Header */}
      <div className="faq-admin-header">
        <div>
          <div className="page-title">FAQ Management</div>
          <div className="page-subtitle">Create and manage frequently asked questions displayed to citizens</div>
        </div>
        <button className="faq-admin-add-btn" onClick={openCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New FAQ
        </button>
      </div>

      {/* KPI Cards */}
      <div className="faq-admin-kpis">
        {[
          { lbl: 'Total FAQs',   val: faqs.length, sub: 'all entries',       subColor: '#64748b' },
          { lbl: 'Published',    val: published,   sub: 'visible to citizens', subColor: '#10b981' },
          { lbl: 'Drafts',       val: drafts,      sub: 'hidden from public',  subColor: '#f59e0b' },
          { lbl: 'Categories',   val: CATEGORIES.length, sub: 'topic groups', subColor: '#B889C5' },
        ].map((k, i) => (
          <div key={i} className="faq-admin-kpi">
            <div className="faq-admin-kpi-lbl">{k.lbl}</div>
            <div className="faq-admin-kpi-val">{k.val}</div>
            <div className="faq-admin-kpi-sub" style={{ color: k.subColor }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="faq-admin-toolbar">
        <div className="faq-admin-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            placeholder="Search questions or answers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="faq-admin-filter" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="faq-admin-filter" value={filterPub} onChange={e => setFilterPub(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* FAQ List */}
      {loading ? (
        <div className="faq-admin-loading">Loading FAQs…</div>
      ) : filtered.length === 0 ? (
        <div className="faq-admin-empty">
          {search ? `No FAQs matching "${search}"` : 'No FAQs yet — click "New FAQ" to add one.'}
        </div>
      ) : (
        <div className="faq-admin-list">
          {filtered.map(faq => {
            const catColor = CATEGORY_COLORS[faq.category] || '#64748b';
            return (
              <div key={faq.id} className={`faq-admin-card ${faq.published ? 'published' : 'draft'}`}>
                <div className="faq-admin-card-body">
                  <div className="faq-admin-card-meta">
                    <span
                      className="faq-admin-cat-pill"
                      style={{ color: catColor, background: `${catColor}15`, borderColor: `${catColor}30` }}
                    >
                      {faq.category}
                    </span>
                    <span className={`faq-admin-pub-pill ${faq.published ? 'pub' : 'draft'}`}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}/>
                      {faq.published ? 'Published' : 'Draft'}
                    </span>
                    <span className="faq-admin-order">#{faq.order || '—'}</span>
                  </div>
                  <div className="faq-admin-q">{faq.question}</div>
                  <div className="faq-admin-a">{faq.answer}</div>
                </div>

                <div className="faq-admin-card-actions">
                  <button className="faq-admin-btn edit" onClick={() => openEdit(faq)}>Edit</button>
                  <button
                    className={`faq-admin-btn ${faq.published ? 'unpub' : 'toggle'}`}
                    onClick={() => handleTogglePublish(faq)}
                  >
                    {faq.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="faq-admin-btn delete" onClick={() => handleDelete(faq)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {modal && (
        <div className="faq-modal-overlay" onClick={() => setModal(null)}>
          <div className="faq-modal" onClick={e => e.stopPropagation()}>
            <div className="faq-modal-top">
              <div className="faq-modal-title">{modal === 'create' ? 'New FAQ' : 'Edit FAQ'}</div>
              <button className="faq-modal-close" onClick={() => setModal(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="faq-modal-body">
              {/* Category & Order */}
              <div className="faq-modal-row">
                <div className="faq-modal-field">
                  <label className="faq-modal-label">Category</label>
                  <select
                    className="faq-modal-select"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="faq-modal-field">
                  <label className="faq-modal-label">Display Order</label>
                  <input
                    type="number" min={1} className="faq-modal-input"
                    value={form.order}
                    onChange={e => setForm(f => ({ ...f, order: +e.target.value }))}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="faq-modal-field">
                <label className="faq-modal-label">Question *</label>
                <input
                  className="faq-modal-input"
                  placeholder="e.g. How do I submit a complaint?"
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                />
              </div>

              {/* Answer */}
              <div className="faq-modal-field">
                <label className="faq-modal-label">Answer *</label>
                <textarea
                  className="faq-modal-textarea"
                  placeholder="Provide a clear, helpful answer…"
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  rows={5}
                />
              </div>

              {/* Published toggle */}
              <div className="faq-modal-field">
                <div className="faq-modal-toggle-row">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                      {form.published ? '✅ Published — visible to citizens' : '📝 Draft — hidden from public'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                      Toggle to publish or save as draft
                    </div>
                  </div>
                  <label className="st-toggle">
                    <input type="checkbox" checked={form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} />
                    <span className="st-toggle-track" />
                  </label>
                </div>
              </div>
            </div>

            <div className="faq-modal-footer">
              <button className="faq-modal-cancel" onClick={() => setModal(null)}>Cancel</button>
              <button className="faq-modal-save" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'create' ? 'Add FAQ' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
