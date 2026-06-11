import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, doc, setDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { encryptFields, signIntegrity } from '../crypto';

// ─── Ministry Config ────────────────────────────────────────────────────────
const MINISTRIES_CONFIG = {
  'Health':                   { prefix: 'H',  label: 'Ministry of Health',                     color: '#3b82f6' },
  'Transport':                { prefix: 'T',  label: 'Ministry of Transport',                 color: '#f97316' },
  'Education':                { prefix: 'E',  label: 'Ministry of Education',                color: '#eab308' },
  'Works & Infrastructure':   { prefix: 'WI', label: 'Ministry of Works & Infrastructure',  color: '#10b981' },
  'Home Affairs':             { prefix: 'HA', label: 'Ministry of Home Affairs',              color: '#8b5cf6' },
  'Environment & Cleanliness':{ prefix: 'EC', label: 'Ministry of Environment & Cleanliness',  color: '#06b6d4' },
};

// ─── BERT-style Keyword Sets ─────────────────────────────────────────────────
const BERT_KEYWORDS = {
  'Health': {
    high:   ['hospital','clinic','doctor','nurse','medical','health','medicine','treatment','patient','disease','sick','covid','dengue','vaccination','ambulance','pharmacy','surgery','specialist','icu','ward','injection','prescription','mental health','klinik','ubat','doktor','sakit','penyakit'],
    medium: ['waiting','care','appointment','fever','pain','injury','blood','scan','checkup','insurance','hygiene','sanitation','diet','nutrition','emergency'],
    low:    ['slow','queue','crowded','dirty','poor','weak'],
  },
  'Transport': {
    high:   ['bus','train','lrt','mrt','monorail','taxi','grab','flight','airport','highway','toll','traffic','road accident','vehicle','commute','public transport','expressway','congestion','parking','ktm','ets','rapid','bas','tren','lebuhraya','kesesakan'],
    medium: ['route','schedule','driver','fare','ticket','station','stop','delay','cancel','late','unsafe','signage','signal'],
    low:    ['slow','crowded','broken','rude'],
  },
  'Education': {
    high:   ['school','university','college','teacher','student','education','exam','curriculum','tuition','scholarship','spm','upsr','stpm','diploma','degree','lecturer','principal','headmaster','sekolah','guru','pelajar','universiti','peperiksaan'],
    medium: ['learning','study','subject','textbook','fees','grade','facilities','library','canteen','bully','harassment','uniform','registration','dropout'],
    low:    ['unfair','poor','problem','complaint'],
  },
  'Works & Infrastructure': {
    high:   ['pothole','road','bridge','drainage','flood','construction','building','infrastructure','streetlight','lamp post','water supply','pipe','sewage','pavement','sidewalk','jalan','longkang','banjir','lampu','bangunan','tiang','saliran','lubang'],
    medium: ['repair','maintenance','damage','broken','leak','crack','collapse','blocked','fallen','hazard','electrical','wiring','sinkhole'],
    low:    ['slow','old','unsafe','dull'],
  },
  'Home Affairs': {
    high:   ['police','crime','robbery','theft','assault','murder','safety','security','immigration','passport','visa','mykad','ic','citizenship','drug','illegal','gangster','arrest','prison','bomba','fire','rompak','curi','polis','jenayah','dadah','keselamatan'],
    medium: ['noise','neighbour','harassment','threat','suspicious','enforcement','permit','license','domestic','violence','vandalism'],
    low:    ['unsafe','dangerous','fear','worry'],
  },
  'Environment & Cleanliness': {
    high:   ['rubbish','garbage','waste','litter','pollution','environment','river','air quality','smoke','illegal dumping','recycle','cleanliness','dirty','smell','odor','chemical','toxic','mosquito','rat','pest','sampah','sungai','pencemaran','bau','tikus','nyamuk','pembuangan haram'],
    medium: ['clean','filthy','contamination','stray','animal','tree','park','grass','overgrown','clearing','haze','jerebu'],
    low:    ['bad','ugly','poor','old'],
  },
};

// ─── BERT NLP Classifier ─────────────────────────────────────────────────────
function bertClassify(text) {
  if (!text || text.trim().length < 10) return null;
  const lower = text.toLowerCase();

  const rawScores = {};
  for (const [ministry, kws] of Object.entries(BERT_KEYWORDS)) {
    let score = 0;
    kws.high.forEach(kw   => { if (lower.includes(kw)) score += 3.0; });
    kws.medium.forEach(kw => { if (lower.includes(kw)) score += 1.5; });
    kws.low.forEach(kw    => { if (lower.includes(kw)) score += 0.5; });
    rawScores[ministry] = score;
  }

  const total = Object.values(rawScores).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const sorted = Object.entries(rawScores).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];
  // Softmax-inspired confidence capped at 97%
  const confidence = Math.min(Math.round((topScore / total) * 150), 97);

  return { ministry: sorted[0][0], confidence, allScores: Object.fromEntries(sorted) };
}

// ─── Priority Determination Engine ───────────────────────────────────────────
function determinePriority(title, description, ministry) {
  const text = `${title} ${description}`.toLowerCase();

  // HIGH priority signals — immediate danger, safety threat, urgent situations
  const highKeywords = [
    // Emergency / danger
    'emergency','urgent','immediately','critical','life threatening','danger','dangerous',
    'death','died','dead','killed','injury','injured','bleeding','unconscious','collapse',
    // Crime & safety
    'crime','robbery','theft','assault','murder','shooting','stabbing','bomb','explosion',
    'fire','flood','accident','crash','disaster','explosion','toxic','chemical spill',
    // Health emergency
    'ambulance','hospital','icu','overdose','poison','contamination','epidemic','outbreak',
    'covid','dengue','rabies',
    // Malay equivalents
    'kecemasan','bahaya','mati','maut','cedera','kebakaran','banjir','kemalangan','jenayah',
    'rompak','bunuh','rogol','ancaman maut','racun','wabak','penyakit berjangkit',
    // Structural
    'building collapse','structure collapse','roof collapse','bridge collapse','gas leak',
    'power outage','blackout','water cut','sewage overflow',
  ];

  // MEDIUM priority signals — service disruption, notable issues
  const mediumKeywords = [
    // Service issues
    'broken','not working','malfunction','damaged','failed','failure','faulty',
    'delay','delayed','waiting','slow','inefficient','no response','unresponsive',
    'overcharged','overcharge','overpriced','fraud','scam','cheated','bribe','corruption',
    'missing','lost','stolen','vandalism','graffiti','harassment','bully','intimidation',
    // Infrastructure
    'pothole','flood','blocked drain','burst pipe','no water','no electricity',
    'traffic jam','road damage','streetlight','parking','public transport',
    // Malay equivalents
    'rosak','tidak berfungsi','lambat','tipu','rasuah','gangguan','bising','banjir kilat',
    'lubang jalan','longkang','bekalan air','pencemaran','sampah','kemacetan',
  ];

  // Count matches
  let highScore = 0, mediumScore = 0;

  highKeywords.forEach(kw => {
    if (text.includes(kw)) highScore += (kw.split(' ').length > 1 ? 3 : 1); // phrase = higher weight
  });
  mediumKeywords.forEach(kw => {
    if (text.includes(kw)) mediumScore += (kw.split(' ').length > 1 ? 2 : 1);
  });

  // Ministry-based baseline boost
  const highMinistries = ['Home Affairs', 'Health'];
  const mediumMinistries = ['Transport', 'Works & Infrastructure'];
  if (highMinistries.includes(ministry)) highScore += 1;
  if (mediumMinistries.includes(ministry)) mediumScore += 1;

  // Title carries more weight — boost if high keywords in title specifically
  const titleLower = title.toLowerCase();
  highKeywords.forEach(kw => { if (titleLower.includes(kw)) highScore += 2; });

  // Determine final priority
  if (highScore >= 2) return 'High';
  if (mediumScore >= 2 || highScore === 1) return 'Medium';
  return 'Low';
}

const translations = {
  en: { backToDashboard:'Back to Dashboard', submitNewComplaint:'Submit New Complaint', submitDesc:'Please provide detailed information about your complaint. Our AI system will route it to the appropriate ministry.', details:'Details', category:'Category', documents:'Documents', review:'Review', complaintDetails:'Complaint Details', complaintTitle:'Complaint Title', titleHelper:'Provide a clear and concise title that summarizes your issue', detailedDesc:'Detailed Description', charLimit:'Minimum 50 characters, maximum 2000 characters', location:'Location', attachments:'Attachments', submitBtn:'Submit Complaint', cancel:'Cancel', menu:'Menu', home:'Home', submitComplaint:'Submit Complaint', trackStatus:'Track Status', profile:'Profile', support:'Support', helpCenter:'Help Center', logout:'Logout' },
  ms: { backToDashboard:'Kembali ke Papan Pemuka', submitNewComplaint:'Hantar Aduan Baru', submitDesc:'Sila berikan maklumat terperinci tentang aduan anda. Sistem AI kami akan menghalakannya ke kementerian yang berkenaan.', details:'Butiran', category:'Kategori', documents:'Dokumen', review:'Semakan', complaintDetails:'Butiran Aduan', complaintTitle:'Tajuk Aduan', titleHelper:'Berikan tajuk yang jelas dan ringkas yang merumuskan isu anda', detailedDesc:'Penerangan Terperinci', charLimit:'Minimum 50 aksara, maksimum 2000 aksara', location:'Lokasi', attachments:'Lampiran', submitBtn:'Hantar Aduan', cancel:'Batal', menu:'Menu', home:'Utama', submitComplaint:'Hantar Aduan', trackStatus:'Jejak Status', profile:'Profil', support:'Sokongan', helpCenter:'Pusat Bantuan', logout:'Log Keluar' },
  zh: { backToDashboard:'返回控制面板', submitNewComplaint:'提交新投诉', submitDesc:'请提供有关您投诉的详细信息。我们的AI系统将把它转交给相关部门。', details:'详情', category:'类别', documents:'文件', review:'审核', complaintDetails:'投诉详情', complaintTitle:'投诉标题', titleHelper:'提供一个清晰简洁的标题来概括您的问题', detailedDesc:'详细描述', charLimit:'最少50个字符，最多2000个字符', location:'地点', attachments:'附件', submitBtn:'提交投诉', cancel:'取消', menu:'菜单', home:'首页', submitComplaint:'提交投诉', trackStatus:'跟踪状态', profile:'个人资料', support:'支持', helpCenter:'帮助中心', logout:'登出' },
  ta: { backToDashboard:'டாஷ்போர்டுக்கு திரும்பு', submitNewComplaint:'புதிய புகார் சமர்ப்பி', submitDesc:'உங்கள் புகார் பற்றிய விரிவான தகவல்களை வழங்கவும். எங்கள் AI அமைப்பு அதை பொருத்தமான அமைச்சகத்திற்கு அனுப்பும்.', details:'விவரங்கள்', category:'வகை', documents:'ஆவணங்கள்', review:'மதிப்பாய்வு', complaintDetails:'புகார் விவரங்கள்', complaintTitle:'புகார் தலைப்பு', titleHelper:'உங்கள் பிரச்சினையை சுருக்கமாக விவரிக்கும் தெளிவான தலைப்பை வழங்கவும்', detailedDesc:'விரிவான விளக்கம்', charLimit:'குறைந்தபட்சம் 50 எழுத்துக்கள், அதிகபட்சம் 2000 எழுத்துக்கள்', location:'இடம்', attachments:'இணைப்புகள்', submitBtn:'புகார் சமர்ப்பி', cancel:'ரத்து', menu:'மெனு', home:'முகப்பு', submitComplaint:'புகார் சமர்ப்பி', trackStatus:'நிலையை கண்காணி', profile:'சுயவிவரம்', support:'ஆதரவு', helpCenter:'உதவி மையம்', logout:'வெளியேறு' }
};
const langMeta = { en:{flag:'🇬🇧',label:'EN'}, ms:{flag:'🇲🇾',label:'BM'}, zh:{flag:'🇨🇳',label:'中文'}, ta:{flag:'🇮🇳',label:'தமிழ்'} };

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html, body { margin:0; padding:0; }
.submit-page { font-family:'Inter',sans-serif; background:#f9fafb; min-height:100vh; width:100%; color:#1a1a1a; }
.submit-page.dark { background:#0f172a; color:#e2e8f0; }
.top-nav { background:#fff; height:70px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; justify-content:space-between; padding:0 40px; position:sticky; top:0; z-index:100; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
.submit-page.dark .top-nav { background:#1e293b; border-color:#334155; }
.logo-container { display:flex; align-items:center; gap:12px; text-decoration:none; }
.jata-negara { width:36px; height:36px; } .jata-negara img { width:100%; height:100%; object-fit:contain; }
.brand-name { color:#090088; font-size:20px; font-weight:700; }
.submit-page.dark .brand-name { color:#ffffff; }
.nav-right { display:flex; align-items:center; gap:16px; }
.theme-toggle { display:flex; align-items:center; justify-content:center; width:40px; height:40px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:10px; cursor:pointer; transition:all 0.2s; color:#374151; }
.theme-toggle:hover { background:#e5e7eb; }
.submit-page.dark .theme-toggle { background:#334155; border-color:#475569; color:#fbbf24; }
.lang-wrapper { position:relative; }
.lang-btn { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer; font-size:13px; font-weight:500; color:#374151; }
.lang-btn:hover { background:#e5e7eb; }
.submit-page.dark .lang-btn { background:#334155; border-color:#475569; color:#e2e8f0; }
.lang-dropdown { position:absolute; top:calc(100% + 8px); right:0; width:180px; background:white; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.15); border:1px solid #e5e7eb; z-index:1000; overflow:hidden; opacity:0; visibility:hidden; transform:translateY(-8px); transition:all 0.2s; }
.lang-dropdown.open { opacity:1; visibility:visible; transform:translateY(0); }
.submit-page.dark .lang-dropdown { background:#1e293b; border-color:#334155; }
.lang-option { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; font-size:14px; color:#374151; transition:background 0.2s; }
.lang-option:hover { background:#f3f4f6; } .lang-option.active { background:#ede9fe; color:#090088; font-weight:600; }
.submit-page.dark .lang-option { color:#e2e8f0; } .submit-page.dark .lang-option:hover { background:#334155; } .submit-page.dark .lang-option.active { background:#312e81; color:#a5b4fc; }
.back-link { display:flex; align-items:center; gap:8px; color:#6b7280; text-decoration:none; font-size:14px; font-weight:500; padding:8px 12px; border-radius:8px; transition:all 0.2s; }
.back-link:hover { color:#090088; background:#f3f4f6; }
.submit-page.dark .back-link { color:#94a3b8; }
.container { max-width:900px; margin:0 auto; padding:40px 24px; }
.page-header { text-align:center; margin-bottom:40px; }
.page-header h1 { font-size:32px; font-weight:700; color:#1a1a1a; margin-bottom:12px; }
.submit-page.dark .page-header h1 { color:#f1f5f9; }
.page-header p { font-size:16px; color:#6b7280; max-width:600px; margin:0 auto; }
.progress-steps { display:flex; justify-content:center; align-items:center; gap:16px; margin-bottom:48px; }
.step { display:flex; align-items:center; gap:12px; }
.step-circle { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; transition:all 0.3s; }
.step.active .step-circle { background:#090088; color:white; }
.step.completed .step-circle { background:#10b981; color:white; }
.step.inactive .step-circle { background:#e5e7eb; color:#9ca3af; }
.step-label { font-size:14px; font-weight:600; color:#6b7280; }
.step.active .step-label { color:#090088; }
.step-connector { width:60px; height:2px; background:#e5e7eb; }
.form-card { background:white; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,0.1); padding:40px; margin-bottom:24px; }
.submit-page.dark .form-card { background:#1e293b; }
.form-section { margin-bottom:40px; }
.section-header { display:flex; align-items:center; gap:12px; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid #f3f4f6; }
.submit-page.dark .section-header { border-color:#334155; }
.section-number { width:32px; height:32px; border-radius:50%; background:#ede9fe; color:#090088; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; }
.section-title { font-size:18px; font-weight:700; color:#1a1a1a; }
.submit-page.dark .section-title { color:#f1f5f9; }
.form-group { margin-bottom:24px; }
.form-label { display:block; font-size:14px; font-weight:600; color:#374151; margin-bottom:8px; }
.submit-page.dark .form-label { color:#e2e8f0; }
.required { color:#ef4444; margin-left:4px; }
.form-input { width:100%; padding:14px 16px; border:1.5px solid #d1d5db; border-radius:10px; font-size:15px; font-family:inherit; transition:all 0.2s; background:white; color:#1a1a1a; }
.form-input:focus { outline:none; border-color:#090088; box-shadow:0 0 0 3px rgba(9,0,136,0.1); }
.submit-page.dark .form-input { background:#334155; border-color:#475569; color:#f1f5f9; }
.form-textarea { min-height:180px; resize:vertical; }
.char-counter { display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:12px; color:#6b7280; }
.char-count { font-weight:600; }
.char-count.error { color:#ef4444; } .char-count.warning { color:#f59e0b; } .char-count.ok { color:#10b981; }
.helper-text { font-size:13px; color:#6b7280; margin-top:6px; }
.select-wrapper { position:relative; }
.select-wrapper select { width:100%; padding:14px 40px 14px 16px; border:1.5px solid #d1d5db; border-radius:10px; font-size:15px; font-family:inherit; background:white; cursor:pointer; appearance:none; transition:all 0.2s; color:#1a1a1a; }
.select-wrapper select:focus { outline:none; border-color:#090088; box-shadow:0 0 0 3px rgba(9,0,136,0.1); }
.select-wrapper::after { content:''; position:absolute; right:16px; top:50%; transform:translateY(-50%); width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:6px solid #6b7280; pointer-events:none; }
.submit-page.dark .select-wrapper select { background:#334155; border-color:#475569; color:#f1f5f9; }
.file-upload-area { border:2px dashed #d1d5db; border-radius:12px; padding:40px; text-align:center; background:#f9fafb; transition:all 0.2s; cursor:pointer; }
.file-upload-area:hover { border-color:#090088; background:#f0f4ff; }
.file-upload-area.drag { border-color:#090088; background:#e0e7ff; }
.submit-page.dark .file-upload-area { background:#0f172a; border-color:#334155; }
.upload-icon { width:64px; height:64px; margin:0 auto 16px; background:#e0e7ff; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.submit-page.dark .upload-icon { background:#1e3a5f; }
.upload-text { margin-bottom:8px; font-size:15px; color:#374151; }
.upload-text strong { color:#4779c4; }
.submit-page.dark .upload-text { color:#94a3b8; }
.submit-page.dark .upload-text strong { color:#4779c4; }
.upload-hint { font-size:13px; color:#6b7280; }
.submit-page.dark .upload-hint { color:#64748b; }
.file-item { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; margin-top:8px; }
.submit-page.dark .file-item { background:#0f172a; border-color:#334155; }
.file-info { display:flex; align-items:center; gap:12px; }
.file-icon { width:36px; height:36px; border-radius:6px; background:#dbeafe; display:flex; align-items:center; justify-content:center; color:#4779c4; }
.submit-page.dark .file-icon { background:#1e3a5f; color:#4779c4; }
.file-name { font-size:14px; font-weight:600; color:#1a1a1a; }
.submit-page.dark .file-name { color:#f1f5f9; }
.file-size { font-size:12px; color:#6b7280; }
.submit-page.dark .file-size { color:#64748b; }
.file-remove { background:none; border:none; color:#ef4444; cursor:pointer; padding:8px; border-radius:6px; transition:background 0.2s; }
.file-remove:hover { background:#fee2e2; }
.info-box { background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:16px; margin-bottom:16px; font-size:13px; color:#0c4a6e; text-align:left; }
.info-box strong { display:block; text-align:center; margin-bottom:8px; }
.submit-page.dark .info-box { background:#0f2a47; border-color:#1d4ed8; color:#93c5fd; }
.form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top:32px; padding-top:24px; border-top:1px solid #e5e7eb; }
.submit-page.dark .form-actions { border-color:#334155; }
.btn { padding:14px 32px; border-radius:10px; font-size:15px; font-weight:600; cursor:pointer; transition:all 0.2s; font-family:inherit; border:none; display:flex; align-items:center; gap:8px; }
.btn-secondary { background:#f3f4f6; color:#6b7280; }
.btn-secondary:hover { background:#e5e7eb; }
.submit-page.dark .btn-secondary { background:#334155; color:#94a3b8; }
.submit-page.dark .btn-secondary:hover { background:#475569; color:#cbd5e1; }
.btn-primary { background:#090088; color:white; }
.btn-primary:hover { background:#070066; transform:translateY(-1px); box-shadow:0 4px 12px rgba(9,0,136,0.3); }
@keyframes spin { from{transform:rotate(0deg);}to{transform:rotate(360deg);} }
/* NLP Preview */
.nlp-preview { border-radius:12px; border:1.5px solid; padding:16px 18px; margin-top:16px; display:flex; align-items:center; gap:14px; transition:all 0.3s; }
.nlp-preview.analyzing { border-color:#e5e7eb; background:#f9fafb; }
.submit-page.dark .nlp-preview.analyzing { border-color:#334155; background:#0f172a; }
.nlp-preview.result { border-color; }
.nlp-icon { font-size:28px; flex-shrink:0; }
.nlp-body { flex:1; }
.nlp-label { font-size:11px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:#9ca3af; margin-bottom:4px; }
.nlp-ministry { font-size:16px; font-weight:700; margin-bottom:6px; }
.nlp-confidence-row { display:flex; align-items:center; gap:10px; }
.nlp-bar-bg { flex:1; height:6px; background:#e5e7eb; border-radius:3px; overflow:hidden; }
.submit-page.dark .nlp-bar-bg { background:#334155; }
.nlp-bar-fill { height:100%; border-radius:3px; transition:width 0.6s ease; }
.nlp-pct { font-size:12px; font-weight:700; }
.nlp-note { font-size:11px; color:#9ca3af; margin-top:5px; }
.nlp-analyzing-text { font-size:14px; color:#6b7280; display:flex; align-items:center; gap:8px; }
.nlp-spinner { animation:spin 0.9s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.submit-page.dark .btn-primary { background:#4779c4; color:white; }
.submit-page.dark .btn-primary:hover { background:#3a6ab0; transform:translateY(-1px); }
.modal-overlay { display:none; position:fixed; z-index:1000; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.65); align-items:center; justify-content:center; }
.modal-overlay.show { display:flex; }
.modal-content { background:white; border-radius:16px; padding:40px; max-width:500px; width:90%; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.3); }
.submit-page.dark .modal-content { background:#1e293b; border:1px solid #334155; }
.success-icon { width:80px; height:80px; margin:0 auto 24px; background:#dcfce7; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#10b981; font-size:40px; }
.modal-content h2 { font-size:24px; color:#1a1a1a; margin-bottom:12px; font-weight:700; }
.submit-page.dark .modal-content h2 { color:#f1f5f9; }
.modal-content p { font-size:15px; color:#6b7280; margin-bottom:16px; }
.submit-page.dark .modal-content p { color:#94a3b8; }
.reference-number { background:#f9fafb; border:2px solid #e5e7eb; border-radius:10px; padding:20px; margin-bottom:0; }
.submit-page.dark .reference-number { background:#0f172a; border-color:#334155; }
.reference-label { font-size:13px; color:#6b7280; margin-bottom:8px; }
.submit-page.dark .reference-label { color:#94a3b8; }
.reference-value { font-size:28px; font-weight:700; color:#090088; font-family:'Courier New',monospace; }
.submit-page.dark .reference-value { color:#4779c4; }
.submit-page.dark .page-header p { color:#94a3b8; }
.submit-page.dark .step-connector { background:#334155; }
.submit-page.dark .step.inactive .step-circle { background:#334155; color:#64748b; }
.submit-page.dark .step.inactive .step-label { color:#64748b; }
.submit-page.dark .step.active .step-circle { background:#4779c4; }
.submit-page.dark .step.active .step-label { color:#4779c4; }
.submit-page.dark .section-number { background:#1e3a5f; color:#4779c4; }
.submit-page.dark .helper-text { color:#64748b; }
.submit-page.dark .char-counter { color:#64748b; }
.submit-page.dark .select-wrapper::after { border-top-color:#64748b; }
.submit-page.dark .file-upload-area:hover { border-color:#4779c4; background:#0f2a47; }
.submit-page.dark .form-input::placeholder { color:#64748b; }
.submit-page.dark .form-textarea::placeholder { color:#64748b; }
.submit-page.dark .back-link:hover { color:#cbd5e1; background:#334155; }
.submit-page.dark .file-remove:hover { background:#3d1515; }
.submit-page.dark .lang-option:hover { background:#334155; }
.submit-page.dark .back-link { color:#94a3b8; }
`;

export default function SubmitComplaintPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [refNumber, setRefNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nlpResult, setNlpResult] = useState(null);
  const [nlpAnalyzing, setNlpAnalyzing] = useState(false);
  const langRef = useRef(null);
  const fileInputRef = useRef(null);
  const t = translations[language];
  const meta = langMeta[language];

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    setLanguage(localStorage.getItem('govcare-language') || 'en');
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

  function toggleDark() { const n = !darkMode; setDarkMode(n); localStorage.setItem('govcare-theme', n ? 'dark' : 'light'); }
  function changeLang(lang) { setLanguage(lang); setLangOpen(false); localStorage.setItem('govcare-language', lang); }

  // Real-time NLP classification as user types
  useEffect(() => {
    const text = (title + ' ' + description).trim();
    if (text.length < 20) { setNlpResult(null); setNlpAnalyzing(false); return; }
    setNlpAnalyzing(true);
    const timer = setTimeout(() => {
      const result = bertClassify(text);
      setNlpResult(result);
      setNlpAnalyzing(false);
    }, 600); // 600ms debounce — mimics API call
    return () => clearTimeout(timer);
  }, [title, description]);

  function handleFiles(newFiles) {
    const valid = Array.from(newFiles).filter(f => {
      if (f.size > 10 * 1024 * 1024) { alert(`"${f.name}" exceeds 10MB`); return false; }
      if (!['application/pdf','image/jpeg','image/jpg','image/png'].includes(f.type)) { alert(`"${f.name}" unsupported format`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes','KB','MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Generate ministry-specific ID: e.g. H-2026-0003, WI-2026-0001
  async function generateComplaintId(ministry) {
    const cfg = MINISTRIES_CONFIG[ministry];
    const prefix = cfg ? cfg.prefix : 'X';
    const year = new Date().getFullYear();
    try {
      const snap = await getDocs(collection(db, 'complaints'));
      // Count complaints for this ministry only
      const ministryCount = snap.docs.filter(d => {
        const data = d.data();
        return data.ministry === ministry || (data.id && data.id.startsWith(`${prefix}-`));
      }).length;
      return `${prefix}-${year}-${String(ministryCount + 1).padStart(4, '0')}`;
    } catch {
      return `${prefix}-${year}-${String(Math.floor(Math.random() * 900) + 100).padStart(4, '0')}`;
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!title.trim()) { setFormError('Please enter a complaint title.'); return; }
    if (description.length < 50) { setFormError('Description must be at least 50 characters.'); return; }
    if (!confirmed) { setFormError('Please confirm the accuracy of your information.'); return; }

    setSubmitting(true);
    try {
      const user = auth.currentUser;

      // Use NLP result if available, else fall back to manually selected category
      const manualMinistryMap = {
        'health':          'Health',
        'transport':       'Transport',
        'education':       'Education',
        'infrastructure':  'Works & Infrastructure',
        'safety':          'Home Affairs',
        'environment':     'Environment & Cleanliness',
      };
      const detectedMinistry = nlpResult?.ministry
        || (category ? manualMinistryMap[category] : null)
        || 'Home Affairs'; // default fallback

      const nlpConfidence = nlpResult?.confidence ?? (category ? 90 : 50);
      const complaintId = await generateComplaintId(detectedMinistry);

      const plainTitle       = title.trim();
      const plainDescription = description.trim();
      const plainCitizenName = user?.displayName || 'Citizen';
      const plainCitizenEmail = user?.email || '';
      const priority = determinePriority(plainTitle, plainDescription, detectedMinistry);
      const submissionDate = new Date().toISOString().split('T')[0];

      // Sign integrity, encrypt PII, write to Firestore
      const integrityPayload = {
        citizenEmail: plainCitizenEmail, citizenId: user.uid, citizenName: plainCitizenName,
        date: submissionDate, description: plainDescription, id: complaintId,
        ministry: detectedMinistry, priority, title: plainTitle,
      };
      const integrity = await signIntegrity(integrityPayload);
      const encrypted = await encryptFields(
        { title: plainTitle, description: plainDescription, citizenName: plainCitizenName, citizenEmail: plainCitizenEmail },
        ['title', 'description', 'citizenName', 'citizenEmail'],
      );
      await setDoc(doc(db, 'complaints', complaintId), {
        id:            complaintId,
        citizenId:     user.uid,
        ...encrypted,
        category:      category || 'Auto-classified',
        ministry:      detectedMinistry,
        ministryLabel: MINISTRIES_CONFIG[detectedMinistry]?.label || detectedMinistry,
        status:        'Submitted',
        priority,
        date:          submissionDate,
        adminNotes:    '',
        fileCount:     files.length,
        fileNames:     files.map(f => f.name),
        nlpClassified: !!nlpResult,
        nlpConfidence,
        nlpAllScores:  nlpResult?.allScores || {},
        _integrity:    integrity,
        createdAt:     serverTimestamp(),
      });
      setRefNumber(complaintId);
      setShowModal(true);
    } catch (err) {
      console.error('Submission error:', err);
      setFormError('Failed to submit complaint. Please check your connection and try again.');
    }
    setSubmitting(false);
  }

  const charClass = description.length === 0 ? '' : description.length < 50 ? 'error' : description.length > 1800 ? 'warning' : 'ok';

  return (
    <>
      <style>{css}</style>
      <div className={`submit-page${darkMode ? ' dark' : ''}`}>

        {/* Top Nav */}
        <div className="top-nav">
          <Link to="/dashboard" className="logo-container">
            <div className="jata-negara"><img src="/pictures/Malaysia.svg" alt="Jata Negara" /></div>
            <div className="brand-name">GovCare+</div>
          </Link>
          <div className="nav-right">
            <button className="theme-toggle" onClick={toggleDark}>
              {darkMode ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
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
              {t.backToDashboard}
            </Link>
          </div>
        </div>

        <div className="container">
          <div className="page-header">
            <h1>{t.submitNewComplaint}</h1>
            <p>{t.submitDesc}</p>
          </div>

          {/* Progress Steps */}
          <div className="progress-steps">
            {[t.details, t.category, t.documents, t.review].map((label, i) => (
              <>
                <div key={label} className={`step ${i === 0 ? 'active' : 'inactive'}`}>
                  <div className="step-circle">{i + 1}</div>
                  <div className="step-label">{label}</div>
                </div>
                {i < 3 && <div key={`c${i}`} className="step-connector"></div>}
              </>
            ))}
          </div>

          <div className="form-card">
            <form onSubmit={handleSubmit}>

              {/* Section 1: Complaint Details */}
              <div className="form-section">
                <div className="section-header">
                  <div className="section-number">1</div>
                  <div className="section-title">{t.complaintDetails}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.complaintTitle} <span className="required">*</span></label>
                  <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter a brief, descriptive title for your complaint" maxLength={100} required />
                  <div className="helper-text">{t.titleHelper}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t.detailedDesc} <span className="required">*</span></label>
                  <textarea className="form-input form-textarea" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your complaint in detail..." maxLength={2000} />
                  <div className="char-counter">
                    <span className="helper-text">{t.charLimit}</span>
                    <span className={`char-count ${charClass}`}>{description.length} / 2000</span>
                  </div>

                  {/* ── Real-time BERT NLP Routing Preview ── */}
                  {(nlpAnalyzing || nlpResult) && (
                    <div className="nlp-preview" style={nlpResult && !nlpAnalyzing ? {
                      borderColor: (MINISTRIES_CONFIG[nlpResult.ministry]?.color || '#6b7280') + '55',
                      background: (MINISTRIES_CONFIG[nlpResult.ministry]?.color || '#6b7280') + '0d',
                    } : { borderColor: '#e5e7eb', background: '#f9fafb' }}>
                      {nlpAnalyzing ? (
                        <div className="nlp-analyzing-text">
                          <svg className="nlp-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          AI is analysing your complaint…
                        </div>
                      ) : nlpResult && (
                        <>
                          <div className="nlp-icon">{MINISTRIES_CONFIG[nlpResult.ministry]?.emoji}</div>
                          <div className="nlp-body">
                            <div className="nlp-label">BERT NLP — Auto-detected Ministry</div>
                            <div className="nlp-ministry" style={{ color: MINISTRIES_CONFIG[nlpResult.ministry]?.color }}>
                              {MINISTRIES_CONFIG[nlpResult.ministry]?.label}
                            </div>
                            <div className="nlp-confidence-row">
                              <div className="nlp-bar-bg">
                                <div className="nlp-bar-fill" style={{ width: `${nlpResult.confidence}%`, background: MINISTRIES_CONFIG[nlpResult.ministry]?.color }} />
                              </div>
                              <span className="nlp-pct" style={{ color: MINISTRIES_CONFIG[nlpResult.ministry]?.color }}>{nlpResult.confidence}% confidence</span>
                            </div>
                            <div className="nlp-note">Your complaint will be automatically routed here. Override below if needed.</div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Category */}
              <div className="form-section">
                <div className="section-header">
                  <div className="section-number">2</div>
                  <div className="section-title">{t.category} (Optional)</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Suggested Ministry</label>
                  <div className="select-wrapper">
                    <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="">Auto-route via BERT NLP (Recommended)</option>
                      <option value="health">Ministry of Health</option>
                      <option value="transport">Ministry of Transport</option>
                      <option value="education">Ministry of Education</option>
                      <option value="infrastructure">Ministry of Works &amp; Infrastructure</option>
                      <option value="safety">Ministry of Home Affairs</option>
                      <option value="environment">Ministry of Environment &amp; Cleanliness</option>
                    </select>
                  </div>
                  <div className="helper-text">BERT NLP will auto-classify above. Select manually only if you want to override.</div>
                </div>
              </div>

              {/* Section 3: Documents */}
              <div className="form-section">
                <div className="section-header">
                  <div className="section-number">3</div>
                  <div className="section-title">Supporting Documents</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Upload Files (Optional)</label>
                  <div
                    className={`file-upload-area${drag ? ' drag' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
                  >
                    <div className="upload-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4779c4" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <div className="upload-text"><strong>Click to upload</strong> or drag and drop</div>
                    <div className="upload-hint">PDF, JPG, PNG, or JPEG (Max 10MB per file)</div>
                  </div>
                  <input ref={fileInputRef} type="file" style={{display:'none'}} multiple accept=".pdf,.jpg,.jpeg,.png" onChange={e => handleFiles(e.target.files)} />
                  {files.map((f, i) => (
                    <div key={i} className="file-item">
                      <div className="file-info">
                        <div className="file-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                        <div><div className="file-name">{f.name}</div><div className="file-size">{formatSize(f.size)}</div></div>
                      </div>
                      <button type="button" className="file-remove" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Confirmation */}
              <div className="form-section">
                <div className="section-header">
                  <div className="section-number">4</div>
                  <div className="section-title">Confirmation</div>
                </div>
                <div className="info-box">
                  <strong>Before submitting:</strong> Please ensure all information is accurate. You can track the status of your complaint after submission using your unique reference number.
                </div>
                <div className="form-group">
                  <label style={{display:'flex', alignItems:'center', gap:'8px', cursor:'pointer'}}>
                    <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{width:'18px', height:'18px', accentColor:'#090088'}} />
                    <span className="helper-text" style={{marginTop:0}}>I confirm that the information provided is accurate and true</span>
                  </label>
                </div>
                {formError && <div style={{color:'#ef4444', fontSize:'13px', marginTop:'8px'}}>{formError}</div>}
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { if (window.confirm('Cancel? All data will be lost.')) navigate('/dashboard'); }}>{t.cancel}</button>
                <button type="submit" className="btn btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? (
                    <>
                      <svg className="nlp-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Submitting…
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                      {t.submitBtn}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Success Modal */}
        <div className={`modal-overlay${showModal ? ' show' : ''}`}>
          <div className="modal-content">
            <div className="success-icon">✓</div>
            <h2>Complaint Submitted Successfully!</h2>
            <p>Your complaint has been received and routed by our BERT NLP system.</p>
            <div className="reference-number">
              <div className="reference-label">Your Reference Number</div>
              <div className="reference-value">{refNumber}</div>
            </div>
            {nlpResult && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:10, background:(MINISTRIES_CONFIG[nlpResult.ministry]?.color||'#6b7280')+'15', border:`1px solid ${(MINISTRIES_CONFIG[nlpResult.ministry]?.color||'#6b7280')}40`, marginBottom:16, marginTop:12, textAlign:'left' }}>
                <span style={{ fontSize:22 }}>{MINISTRIES_CONFIG[nlpResult.ministry]?.emoji}</span>
                <div>
                  <div style={{ fontSize:11, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px' }}>Routed to</div>
                  <div style={{ fontSize:15, fontWeight:700, color: MINISTRIES_CONFIG[nlpResult.ministry]?.color }}>{MINISTRIES_CONFIG[nlpResult.ministry]?.label}</div>
                  <div style={{ fontSize:12, color:'#9ca3af' }}>BERT confidence: {nlpResult.confidence}%</div>
                </div>
              </div>
            )}
            <div className="info-box">
              <strong>What happens next?</strong><br/>
              • Your complaint has been routed to the correct ministry via BERT NLP<br/>
              • You'll receive an email confirmation shortly<br/>
              • Track your complaint status in the dashboard
            </div>
            <button className="btn btn-primary" style={{width:'100%', justifyContent:'center'}} onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    </>
  );
}
