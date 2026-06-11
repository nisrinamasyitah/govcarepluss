import { useState, useEffect, useRef } from 'react';

const translations = {
  en: {
    brandTagline: 'Intelligent Complaint Routing System',
    navHome: 'Home', navFeatures: 'Features', navAbout: 'About', navContact: 'Contact', navFaq: 'FAQ',
    loginBtn: 'Login', registerBtn: 'Register',
    heroTitle: 'Malaysia E-Government Complaint Portal',
    heroDescription: 'Submit your complaints securely and track them in real-time',
    heroSubtitle: 'Powered by AI for intelligent routing to the right ministry',
    submitComplaint: 'Submit Complaint', trackStatus: 'Track Status',
    whyChoose: 'Why Choose GovCare+',
    experienceSeamless: 'Experience seamless, secure, and intelligent complaint management',
    secureSubmission: 'Secure Submission',
    secureSubmissionDesc: 'End-to-end encryption protects your information with industry-leading security standards',
    aiRouting: 'AI-Powered Routing',
    aiRoutingDesc: 'Smart classification ensures your complaint reaches the right ministry instantly',
    realTimeTracking: 'Real-Time Tracking',
    realTimeTrackingDesc: 'Monitor your complaint status with live updates and transparent progress tracking',
    availability: '24/7 Availability',
    availabilityDesc: 'Submit and track complaints anytime, anywhere with our always-on cloud system',
    trustedBy: 'Trusted by Malaysian Citizens', realTimeMetrics: 'Real-time performance metrics',
    complaintsProcessed: 'Complaints Processed', classificationAccuracy: 'Classification Accuracy',
    avgProcessingTime: 'Average Processing Time',
    transforming: 'Transforming Public Service Delivery',
    transformingDesc: 'GovCare+ leverages advanced Natural Language Processing and cloud-based architecture to revolutionize how Malaysian citizens interact with government services.',
    pdpaCompliant: 'PDPA 2010 Compliant Data Protection', multiMinistry: 'Multi-Ministry Integration',
    auditTrail: 'Automated Audit Trail Logging', mobileResponsive: 'Mobile-Responsive Design',
    footerDesc: 'Secure Intelligent Complaint Routing System for Malaysian E-Government Services. Empowering citizens with transparent, efficient, and secure complaint management.',
    quickLinks: 'Quick Links', faq: 'FAQ', support: 'Support', helpCenter: 'Help Center',
    contactUs: 'Contact Us', userGuide: 'User Guide', systemStatus: 'System Status',
    legal: 'Legal', privacyPolicy: 'Privacy Policy', termsOfService: 'Terms of Service',
    dataProtection: 'Data Protection', accessibility: 'Accessibility',
    copyright: '© 2026 Government of Malaysia. All rights reserved.',
    privacy: 'Privacy', terms: 'Terms', sitemap: 'Sitemap'
  },
  ms: {
    brandTagline: 'Sistem Penghalaan Aduan Pintar',
    navHome: 'Utama', navFeatures: 'Ciri-ciri', navAbout: 'Tentang', navContact: 'Hubungi', navFaq: 'Soalan Lazim',
    loginBtn: 'Log Masuk', registerBtn: 'Daftar',
    heroTitle: 'Portal Aduan E-Kerajaan Malaysia',
    heroDescription: 'Hantar aduan anda dengan selamat dan jejaki dalam masa nyata',
    heroSubtitle: 'Dikuasakan oleh AI untuk penghalaan pintar ke kementerian yang betul',
    submitComplaint: 'Hantar Aduan', trackStatus: 'Jejak Status',
    whyChoose: 'Mengapa Pilih GovCare+',
    experienceSeamless: 'Nikmati pengurusan aduan yang lancar, selamat dan pintar',
    secureSubmission: 'Penghantaran Selamat',
    secureSubmissionDesc: 'Penyulitan hujung ke hujung melindungi maklumat anda dengan standard keselamatan terkemuka',
    aiRouting: 'Penghalaan Berkuasa AI',
    aiRoutingDesc: 'Pengelasan pintar memastikan aduan anda sampai ke kementerian yang betul dengan serta-merta',
    realTimeTracking: 'Penjejakan Masa Nyata',
    realTimeTrackingDesc: 'Pantau status aduan anda dengan kemaskini langsung dan penjejakan kemajuan yang telus',
    availability: 'Tersedia 24/7',
    availabilityDesc: 'Hantar dan jejaki aduan pada bila-bila masa, di mana sahaja dengan sistem awan kami',
    trustedBy: 'Dipercayai Rakyat Malaysia', realTimeMetrics: 'Metrik prestasi masa nyata',
    complaintsProcessed: 'Aduan Diproses', classificationAccuracy: 'Ketepatan Pengelasan',
    avgProcessingTime: 'Purata Masa Pemprosesan',
    transforming: 'Mentransformasi Penyampaian Perkhidmatan Awam',
    transformingDesc: 'GovCare+ menggunakan Pemprosesan Bahasa Semula Jadi yang canggih dan seni bina berasaskan awan untuk merevolusikan cara rakyat Malaysia berinteraksi dengan perkhidmatan kerajaan.',
    pdpaCompliant: 'Perlindungan Data Patuh PDPA 2010', multiMinistry: 'Integrasi Pelbagai Kementerian',
    auditTrail: 'Pengelogan Jejak Audit Automatik', mobileResponsive: 'Reka Bentuk Responsif Mudah Alih',
    footerDesc: 'Sistem Penghalaan Aduan Pintar Selamat untuk Perkhidmatan E-Kerajaan Malaysia.',
    quickLinks: 'Pautan Pantas', faq: 'Soalan Lazim', support: 'Sokongan', helpCenter: 'Pusat Bantuan',
    contactUs: 'Hubungi Kami', userGuide: 'Panduan Pengguna', systemStatus: 'Status Sistem',
    legal: 'Perundangan', privacyPolicy: 'Dasar Privasi', termsOfService: 'Terma Perkhidmatan',
    dataProtection: 'Perlindungan Data', accessibility: 'Kebolehcapaian',
    copyright: '© 2026 Kerajaan Malaysia. Hak cipta terpelihara.',
    privacy: 'Privasi', terms: 'Terma', sitemap: 'Peta Laman'
  },
  zh: {
    brandTagline: '智能投诉路由系统',
    navHome: '首页', navFeatures: '功能', navAbout: '关于', navContact: '联系', navFaq: '常见问题',
    loginBtn: '登录', registerBtn: '注册',
    heroTitle: '马来西亚电子政务投诉门户',
    heroDescription: '安全提交您的投诉并实时跟踪',
    heroSubtitle: '由人工智能驱动，智能路由到正确的部门',
    submitComplaint: '提交投诉', trackStatus: '跟踪状态',
    whyChoose: '为什么选择 GovCare+',
    experienceSeamless: '体验无缝、安全、智能的投诉管理',
    secureSubmission: '安全提交',
    secureSubmissionDesc: '端到端加密以行业领先的安全标准保护您的信息',
    aiRouting: 'AI 驱动路由',
    aiRoutingDesc: '智能分类确保您的投诉立即到达正确的部门',
    realTimeTracking: '实时跟踪',
    realTimeTrackingDesc: '通过实时更新和透明的进度跟踪监控您的投诉状态',
    availability: '全天候服务',
    availabilityDesc: '随时随地通过我们的云系统提交和跟踪投诉',
    trustedBy: '受马来西亚公民信赖', realTimeMetrics: '实时性能指标',
    complaintsProcessed: '已处理投诉', classificationAccuracy: '分类准确率',
    avgProcessingTime: '平均处理时间',
    transforming: '转变公共服务交付',
    transformingDesc: 'GovCare+ 利用先进的自然语言处理和基于云的架构，彻底改变马来西亚公民与政府服务的互动方式。',
    pdpaCompliant: '符合 PDPA 2010 数据保护', multiMinistry: '多部门集成',
    auditTrail: '自动审计跟踪记录', mobileResponsive: '移动响应式设计',
    footerDesc: '马来西亚电子政务服务的安全智能投诉路由系统。',
    quickLinks: '快速链接', faq: '常见问题', support: '支持', helpCenter: '帮助中心',
    contactUs: '联系我们', userGuide: '用户指南', systemStatus: '系统状态',
    legal: '法律', privacyPolicy: '隐私政策', termsOfService: '服务条款',
    dataProtection: '数据保护', accessibility: '无障碍',
    copyright: '© 2026 马来西亚政府。保留所有权利。',
    privacy: '隐私', terms: '条款', sitemap: '网站地图'
  },
  ta: {
    brandTagline: 'புத்திசாலி புகார் வழிசெலுத்தல் அமைப்பு',
    navHome: 'முகப்பு', navFeatures: 'அம்சங்கள்', navAbout: 'பற்றி', navContact: 'தொடர்பு', navFaq: 'அடிக்கடி கேள்விகள்',
    loginBtn: 'உள்நுழை', registerBtn: 'பதிவு',
    heroTitle: 'மலேசிய மின்-அரசு புகார் போர்டல்',
    heroDescription: 'உங்கள் புகார்களை பாதுகாப்பாக சமர்ப்பித்து நிகழ்நேரத்தில் கண்காணிக்கவும்',
    heroSubtitle: 'சரியான அமைச்சகத்திற்கு புத்திசாலி வழிசெலுத்தலுக்கு AI மூலம் இயக்கப்படுகிறது',
    submitComplaint: 'புகார் சமர்ப்பி', trackStatus: 'நிலையை கண்காணி',
    whyChoose: 'ஏன் GovCare+ தேர்வு செய்ய வேண்டும்',
    experienceSeamless: 'தடையற்ற, பாதுகாப்பான புகார் மேலாண்மையை அனுபவியுங்கள்',
    secureSubmission: 'பாதுகாப்பான சமர்ப்பிப்பு',
    secureSubmissionDesc: 'முனைமுதல்-முனைவரை குறியாக்கம் உங்கள் தகவலைப் பாதுகாக்கிறது',
    aiRouting: 'AI-இயக்க வழிசெலுத்தல்',
    aiRoutingDesc: 'புத்திசாலி வகைப்படுத்தல் உங்கள் புகார் சரியான அமைச்சகத்தை அடைவதை உறுதி செய்கிறது',
    realTimeTracking: 'நிகழ்நேர கண்காணிப்பு',
    realTimeTrackingDesc: 'நேரடி புதுப்பிப்புகளுடன் உங்கள் புகார் நிலையைக் கண்காணிக்கவும்',
    availability: '24/7 கிடைக்கும்',
    availabilityDesc: 'எந்த நேரத்திலும் புகார்களை சமர்ப்பித்து கண்காணிக்கவும்',
    trustedBy: 'மலேசிய குடிமக்களால் நம்பப்படுகிறது', realTimeMetrics: 'நிகழ்நேர செயல்திறன் அளவீடுகள்',
    complaintsProcessed: 'செயலாக்கப்பட்ட புகார்கள்', classificationAccuracy: 'வகைப்படுத்தல் துல்லியம்',
    avgProcessingTime: 'சராசரி செயலாக்க நேரம்',
    transforming: 'பொது சேவை வழங்கலை மாற்றுதல்',
    transformingDesc: 'GovCare+ மேம்பட்ட இயற்கை மொழி செயலாக்கத்தைப் பயன்படுத்தி அரசு சேவைகளுடன் தொடர்புகொள்வதை புரட்சிகரமாக்குகிறது.',
    pdpaCompliant: 'PDPA 2010 இணக்கமான தரவு பாதுகாப்பு', multiMinistry: 'பல அமைச்சக ஒருங்கிணைப்பு',
    auditTrail: 'தானியங்கி தணிக்கை தடம் பதிவு', mobileResponsive: 'மொபைல்-வினைத்திறன் வடிவமைப்பு',
    footerDesc: 'மலேசிய மின்-அரசு சேவைகளுக்கான பாதுகாப்பான புகார் வழிசெலுத்தல் அமைப்பு.',
    quickLinks: 'விரைவு இணைப்புகள்', faq: 'அடிக்கடி கேட்கப்படும் கேள்விகள்', support: 'ஆதரவு', helpCenter: 'உதவி மையம்',
    contactUs: 'எங்களை தொடர்புகொள்ள', userGuide: 'பயனர் வழிகாட்டி', systemStatus: 'அமைப்பு நிலை',
    legal: 'சட்டபூர்வ', privacyPolicy: 'தனியுரிமை கொள்கை', termsOfService: 'சேவை விதிமுறைகள்',
    dataProtection: 'தரவு பாதுகாப்பு', accessibility: 'அணுகல்தன்மை',
    copyright: '© 2026 மலேசிய அரசாங்கம். அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
    privacy: 'தனியுரிமை', terms: 'விதிமுறைகள்', sitemap: 'தள வரைபடம்'
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

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #ffffff; color: #1a1a1a; line-height: 1.6;
    -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
  }

  /* ── DARK MODE OVERRIDES ── */
  body.dark-mode { background: #0f172a; color: #f1f5f9; }

  /* Header → dark navy in dark mode */
  body.dark-mode .header { background: #1e293b; border-bottom-color: #334155; }
  body.dark-mode .brand-name { color: #ffffff; }
  body.dark-mode .brand-tagline { color: #94a3b8; }
  body.dark-mode .nav-links a { color: #cbd5e1; }
  body.dark-mode .nav-links a:hover { color: #ffffff; }
  body.dark-mode .btn-login { color: #ffffff; border-color: #ffffff; }
  body.dark-mode .btn-login:hover { background: rgba(255,255,255,0.1); }
  body.dark-mode .btn-register { background: #4779c4; }
  body.dark-mode .btn-register:hover { background: #3a6ab5; box-shadow: 0 4px 12px rgba(71,121,196,0.4); }
  body.dark-mode .hero { background: #4779c4; }
  body.dark-mode .theme-toggle { background: #334155; border-color: #475569; color: #f1f5f9; }
  body.dark-mode .theme-toggle:hover { background: #475569; }
  body.dark-mode .language-toggle { background: #334155; border-color: #475569; color: #f1f5f9; }
  body.dark-mode .language-toggle:hover { background: #475569; }
  body.dark-mode .language-dropdown { background: #1e293b; border-color: #475569; }
  body.dark-mode .language-option { color: #e2e8f0; }
  body.dark-mode .language-option:hover { background: #334155; }

  /* Other sections in dark mode */
  body.dark-mode .features { background: #1e293b; }
  body.dark-mode .features-header h2, body.dark-mode .feature-card h3 { color: #f1f5f9; }
  body.dark-mode .features-header p, body.dark-mode .feature-card p { color: #94a3b8; }
  body.dark-mode .feature-card { background: #0f172a; border-color: #334155; }
  body.dark-mode .feature-card:hover { border-color: #6366f1; }
  body.dark-mode .statistics { background: #312e81; }
  body.dark-mode .info-section { background: #0f172a; }
  body.dark-mode .info-text h2 { color: #f1f5f9; }
  body.dark-mode .info-text p, body.dark-mode .info-feature-item span { color: #94a3b8; }
  body.dark-mode .footer { background: #0f172a; border-top-color: #334155; }
  body.dark-mode .footer-brand p, body.dark-mode .footer-section ul li a { color: #94a3b8; }
  body.dark-mode .footer-section ul li a:hover { color: #818cf8; }
  body.dark-mode .footer-bottom { border-top-color: #334155; color: #64748b; }

  /* ── LIGHT MODE: Header always white ── */
  .header {
    background: #ffffff; height: 80px; display: flex; align-items: center;
    justify-content: space-between; padding: 0 80px; border-bottom: 1px solid #e5e7eb;
    position: sticky; top: 0; z-index: 1000; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .header-left { display: flex; align-items: center; gap: 20px; }
  .logo-container { display: flex; align-items: center; gap: 16px; cursor: pointer; }
  .jata-negara { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; }
  .jata-negara img { width: 100%; height: 100%; object-fit: contain; }
  .brand-container { display: flex; flex-direction: column; gap: 2px; }
  .brand-name { color: #090088; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; line-height: 1; }
  .brand-tagline { color: #6b7280; font-size: 12px; font-weight: 500; letter-spacing: 0.3px; }
  .header-nav { display: flex; align-items: center; gap: 40px; }
  .nav-links { display: flex; gap: 32px; list-style: none; }
  .nav-links a { color: #4b5563; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
  .nav-links a:hover { color: #090088; }
  .header-buttons { display: flex; gap: 12px; align-items: center; }
  .controls-wrapper { display: flex; align-items: center; gap: 8px; margin-right: 16px; }

  .theme-toggle {
    width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e5e7eb;
    background: white; cursor: pointer; display: flex; align-items: center;
    justify-content: center; transition: all 0.2s; color: #4b5563;
  }
  .theme-toggle:hover { background: #f3f4f6; }

  .language-wrapper { position: relative; }
  .language-toggle {
    display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: white;
    border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer;
    font-size: 13px; font-weight: 500; transition: all 0.2s; color: #4b5563;
  }
  .language-toggle:hover { background: #f3f4f6; }
  .language-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0; background: white;
    border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    min-width: 160px; opacity: 0; visibility: hidden; transform: translateY(-10px);
    transition: all 0.2s; z-index: 1000;
  }
  .language-dropdown.active { opacity: 1; visibility: visible; transform: translateY(0); }
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

  .btn-login {
    background: transparent; color: #090088; padding: 10px 24px; border-radius: 8px;
    font-weight: 600; cursor: pointer; border: 1.5px solid #090088; font-size: 14px;
    transition: all 0.2s; text-decoration: none; display: inline-flex; align-items: center;
  }
  .btn-login:hover { background: #f3f4f6; }
  .btn-register {
    background: #090088; color: white; padding: 10px 24px; border-radius: 8px;
    font-weight: 600; cursor: pointer; border: none; font-size: 14px; transition: all 0.2s;
    text-decoration: none; display: inline-flex; align-items: center;
  }
  .btn-register:hover { background: #070066; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(9,0,136,0.25); }

  .btn-admin {
    display: inline-flex; align-items: center; gap: 6px;
    background: transparent; color: #6b7280; padding: 8px 14px; border-radius: 8px;
    font-weight: 500; font-size: 13px; border: 1px solid #d1d5db;
    text-decoration: none; transition: all 0.2s; cursor: pointer;
  }
  .btn-admin:hover { background: #f3f4f6; color: #090088; border-color: #090088; }
  body.dark-mode .btn-admin { color: #94a3b8; border-color: #334155; }
  body.dark-mode .btn-admin:hover { background: rgba(99,102,241,0.15); color: #a5b4fc; border-color: #6366f1; }

  .hero { background: #6b9fd4; padding: 100px 80px 120px; text-align: center; position: relative; }
  .hero-content { max-width: 900px; margin: 0 auto; }
  .hero h1 { color: #ffffff; font-size: 48px; margin-bottom: 20px; font-weight: 700; letter-spacing: -1px; line-height: 1.2; }
  .hero-description { color: #ffffff; font-size: 20px; margin-bottom: 12px; font-weight: 400; opacity: 0.95; }
  .hero-subtitle { color: #010048; font-size: 15px; margin-bottom: 48px; font-weight: 500; }
  .hero-buttons { display: flex; gap: 16px; justify-content: center; }
  .btn-primary {
    background: #ffffff; color: #090088; padding: 16px 40px; border-radius: 10px;
    font-weight: 600; font-size: 16px; border: none; cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15); transition: all 0.3s;
    text-decoration: none; display: inline-flex; align-items: center;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
  .btn-secondary {
    background: transparent; color: #ffffff; padding: 16px 40px; border-radius: 10px;
    font-weight: 600; font-size: 16px; border: 2px solid #ffffff; cursor: pointer;
    transition: all 0.3s; text-decoration: none; display: inline-flex; align-items: center;
  }
  .btn-secondary:hover { background: rgba(255,255,255,0.1); }
  .features { padding: 100px 80px; background: #f8fafc; }
  .features-header { text-align: center; margin-bottom: 60px; }
  .features-header h2 { font-size: 36px; color: #1a1a1a; margin-bottom: 12px; font-weight: 700; }
  .features-header p { color: #6b7280; font-size: 18px; }
  .features-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; max-width: 1200px; margin: 0 auto; }
  .feature-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px 24px; text-align: center; transition: all 0.3s; }
  .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); border-color: #090088; }
  .feature-icon { width: 64px; height: 64px; background: #ede9fe; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
  .feature-icon svg { width: 32px; height: 32px; fill: #090088; }
  .feature-card h3 { color: #1a1a1a; font-size: 18px; margin-bottom: 12px; font-weight: 600; }
  .feature-card p { color: #6b7280; font-size: 14px; line-height: 1.6; }

  .statistics { background: #090088; padding: 80px; }
  .statistics-header { text-align: center; margin-bottom: 48px; }
  .statistics-header h2 { color: #ffffff; font-size: 32px; margin-bottom: 8px; font-weight: 700; }
  .statistics-header p { color: rgba(255,255,255,0.8); font-size: 16px; }
  .stats-grid { display: flex; justify-content: center; gap: 80px; }
  .stat-item { text-align: center; }
  .stat-number { color: #ffffff; font-size: 48px; font-weight: 700; margin-bottom: 8px; }
  .stat-label { color: rgba(255,255,255,0.8); font-size: 14px; font-weight: 500; }

  .info-section { padding: 100px 80px; background: #ffffff; }
  .info-content { display: flex; align-items: center; gap: 80px; max-width: 1200px; margin: 0 auto; }
  .info-text { flex: 1; }
  .info-text h2 { font-size: 36px; color: #1a1a1a; margin-bottom: 20px; font-weight: 700; line-height: 1.2; }
  .info-text p { color: #6b7280; font-size: 16px; margin-bottom: 32px; line-height: 1.8; }
  .info-features { display: flex; flex-direction: column; gap: 16px; }
  .info-feature-item { display: flex; align-items: center; gap: 12px; }
  .check-icon { width: 24px; height: 24px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .check-icon svg { width: 14px; height: 14px; fill: #059669; }
  .info-feature-item span { color: #4b5563; font-size: 15px; font-weight: 500; }
  .info-image { flex: 1; }
  .info-image img { width: 100%; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.12); }

  .footer { background: #1a1a1a; color: #ffffff; padding: 80px; }
  .footer-content { max-width: 1200px; margin: 0 auto; }
  .footer-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 60px; margin-bottom: 48px; }
  .footer-brand h3 { font-size: 24px; margin-bottom: 16px; font-weight: 700; }
  .footer-brand p { color: #9ca3af; font-size: 14px; line-height: 1.8; margin-bottom: 20px; }
  .footer-security { display: flex; gap: 12px; }
  .security-badge, .pdpa-badge { background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; }
  .footer-section h4 { font-size: 14px; margin-bottom: 20px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .footer-section ul { list-style: none; }
  .footer-section ul li { margin-bottom: 12px; }
  .footer-section ul li a { color: #9ca3af; text-decoration: none; font-size: 14px; transition: color 0.2s; }
  .footer-section ul li a:hover { color: white; }
  .footer-bottom { border-top: 1px solid #333; padding-top: 32px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #6b7280; }
  .footer-links-bottom { display: flex; gap: 24px; }
  .footer-links-bottom a { color: #6b7280; text-decoration: none; transition: color 0.2s; }
  .footer-links-bottom a:hover { color: white; }

  @media (max-width: 1024px) {
    .header { padding: 0 40px; }
    .hero { padding: 60px 40px 80px; }
    .hero h1 { font-size: 36px; }
    .features-grid { grid-template-columns: repeat(2, 1fr); }
    .info-content { flex-direction: column; }
    .footer-top { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 768px) {
    .header { padding: 0 20px; }
    .header-nav { display: none; }
    .features-grid { grid-template-columns: 1fr; }
    .stats-grid { flex-direction: column; gap: 40px; }
    .footer-top { grid-template-columns: 1fr; }
  }

  /* ── FAQ TEASER SECTION ── */
  .faq-teaser {
    background: #f0f4ff;
    padding: 80px;
    position: relative;
    overflow: hidden;
  }
  body.dark-mode .faq-teaser { background: #0d1424; }
  .faq-teaser::before {
    content: '?';
    position: absolute;
    right: -20px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 400px;
    font-weight: 900;
    color: rgba(9,0,136,0.04);
    line-height: 1;
    pointer-events: none;
    user-select: none;
  }
  body.dark-mode .faq-teaser::before { color: rgba(184,137,197,0.04); }
  .faq-teaser-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
  }
  .faq-teaser-left {}
  .faq-teaser-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #090088;
    background: rgba(9,0,136,0.08);
    border: 1px solid rgba(9,0,136,0.15);
    border-radius: 20px;
    padding: 5px 12px;
    margin-bottom: 20px;
  }
  body.dark-mode .faq-teaser-label {
    color: #B889C5;
    background: rgba(184,137,197,0.12);
    border-color: rgba(184,137,197,0.25);
  }
  .faq-teaser-title {
    font-size: 34px;
    font-weight: 700;
    color: #1a1a1a;
    line-height: 1.2;
    margin-bottom: 14px;
    letter-spacing: -0.5px;
  }
  body.dark-mode .faq-teaser-title { color: #f1f5f9; }
  .faq-teaser-sub {
    font-size: 16px;
    color: #6b7280;
    line-height: 1.7;
    margin-bottom: 30px;
  }
  body.dark-mode .faq-teaser-sub { color: #64748b; }
  .faq-teaser-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #090088;
    color: #fff;
    padding: 13px 28px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    border: none;
    cursor: pointer;
    transition: all 0.25s;
  }
  .faq-teaser-btn:hover {
    background: #070066;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(9,0,136,0.25);
  }
  body.dark-mode .faq-teaser-btn { background: linear-gradient(135deg, #B889C5, #9b6aae); }
  body.dark-mode .faq-teaser-btn:hover { box-shadow: 0 8px 24px rgba(184,137,197,0.35); }

  .faq-teaser-right {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .faq-preview-item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-left: 3px solid transparent;
    border-radius: 12px;
    padding: 16px 20px;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: block;
  }
  .faq-preview-item:hover {
    border-left-color: #090088;
    transform: translateX(4px);
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  }
  body.dark-mode .faq-preview-item {
    background: #1e293b;
    border-color: #334155;
  }
  body.dark-mode .faq-preview-item:hover { border-left-color: #B889C5; }
  .faq-preview-q {
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  body.dark-mode .faq-preview-q { color: #e2e8f0; }
  .faq-preview-q-badge {
    font-size: 10px;
    font-weight: 800;
    color: #090088;
    background: rgba(9,0,136,0.08);
    border-radius: 4px;
    padding: 2px 6px;
    flex-shrink: 0;
  }
  body.dark-mode .faq-preview-q-badge { color: #B889C5; background: rgba(184,137,197,0.12); }
  .faq-preview-a {
    font-size: 13px;
    color: #6b7280;
    line-height: 1.5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .faq-teaser-viewall {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #090088;
    text-decoration: none;
    padding: 10px 16px;
    border: 1.5px solid rgba(9,0,136,0.2);
    border-radius: 9px;
    transition: all 0.2s;
    background: rgba(9,0,136,0.04);
    margin-top: 4px;
    align-self: flex-start;
  }
  .faq-teaser-viewall:hover { background: rgba(9,0,136,0.1); transform: translateX(3px); }
  body.dark-mode .faq-teaser-viewall {
    color: #B889C5;
    border-color: rgba(184,137,197,0.3);
    background: rgba(184,137,197,0.06);
  }
  body.dark-mode .faq-teaser-viewall:hover { background: rgba(184,137,197,0.12); }

  @media (max-width: 1024px) {
    .faq-teaser { padding: 60px 40px; }
    .faq-teaser-inner { grid-template-columns: 1fr; gap: 40px; }
    .faq-teaser-title { font-size: 26px; }
  }
  @media (max-width: 768px) {
    .faq-teaser { padding: 60px 20px; }
  }
`;

export default function MainPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load saved preferences on mount
  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    const savedLang = localStorage.getItem('govcare-language') || 'en';
    setLanguage(savedLang);
  }, []);

  // Apply dark-mode class to body
  useEffect(() => {
    document.body.className = darkMode ? 'dark-mode' : '';
    localStorage.setItem('govcare-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  function changeLanguage(lang) {
    setLanguage(lang);
    setDropdownOpen(false);
    localStorage.setItem('govcare-language', lang);
  }

  const t = translations[language];
  const meta = langMeta[language];

  return (
    <>
      {/* Inject CSS into <head> */}
      <style>{css}</style>

      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="logo-container" onClick={() => window.location.href = '/'}>
            <div className="jata-negara">
              <img src="/pictures/Malaysia.svg" alt="Jata Negara Malaysia" />
            </div>
            <div className="brand-container">
              <div className="brand-name">GovCare+</div>
              <div className="brand-tagline">{t.brandTagline}</div>
            </div>
          </div>
        </div>

        <div className="header-nav">
          <ul className="nav-links">
            <li><a href="#home">{t.navHome}</a></li>
            <li><a href="#features">{t.navFeatures}</a></li>
            <li><a href="#about">{t.navAbout}</a></li>
            <li><a href="/faq">{t.navFaq}</a></li>
            <li><a href="#contact">{t.navContact}</a></li>
          </ul>

          <div className="header-buttons">
            <div className="controls-wrapper">
              {/* Theme Toggle */}
              <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} title="Toggle dark mode">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              </button>

              {/* Language Dropdown */}
              <div className="language-wrapper" ref={dropdownRef}>
                <div className="language-toggle" onClick={() => setDropdownOpen(!dropdownOpen)}>
                  <span>{meta.flag}</span>
                  <span>{meta.label}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <div className={`language-dropdown ${dropdownOpen ? 'active' : ''}`}>
                  {Object.entries(langMeta).map(([code, { flag, label }]) => (
                    <div
                      key={code}
                      className={`language-option ${language === code ? 'active' : ''}`}
                      onClick={() => changeLanguage(code)}
                    >
                      <span className="lang-info"><span>{flag}</span> {label === 'EN' ? 'English' : label === 'BM' ? 'Bahasa Melayu' : label === '中文' ? '中文' : 'தமிழ்'}</span>
                      {language === code && (
                        <svg className="check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <a href="/admin/login" className="btn-admin">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Admin
            </a>
            <a href="/login" className="btn-login">{t.loginBtn}</a>
            <a href="/register" className="btn-register">{t.registerBtn}</a>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero" id="home">
        <div className="hero-content">
          <h1>{t.heroTitle}</h1>
          <p className="hero-description">{t.heroDescription}</p>
          <p className="hero-subtitle">{t.heroSubtitle}</p>
          <div className="hero-buttons">
            <a href="/login" className="btn-primary">{t.submitComplaint}</a>
            <a href="/track-status" className="btn-secondary">{t.trackStatus}</a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="features" id="features">
        <div className="features-header">
          <h2>{t.whyChoose}</h2>
          <p>{t.experienceSeamless}</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </div>
            <h3>{t.secureSubmission}</h3>
            <p>{t.secureSubmissionDesc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zm-2 10H6V7h12v12zm-9-6c-.83 0-1.5-.67-1.5-1.5S8.17 10 9 10s1.5.67 1.5 1.5S9.83 13 9 13zm7.5-1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5 1.5.67 1.5 1.5zM8 15h8v2H8v-2z"/>
              </svg>
            </div>
            <h3>{t.aiRouting}</h3>
            <p>{t.aiRoutingDesc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            </div>
            <h3>{t.realTimeTracking}</h3>
            <p>{t.realTimeTrackingDesc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
            </div>
            <h3>{t.availability}</h3>
            <p>{t.availabilityDesc}</p>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="statistics">
        <div className="statistics-header">
          <h2>{t.trustedBy}</h2>
          <p>{t.realTimeMetrics}</p>
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">15,234</div>
            <div className="stat-label">{t.complaintsProcessed}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">94%</div>
            <div className="stat-label">{t.classificationAccuracy}</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">&lt; 5s</div>
            <div className="stat-label">{t.avgProcessingTime}</div>
          </div>
        </div>
      </div>

      {/* FAQ Teaser Section */}
      <div className="faq-teaser">
        <div className="faq-teaser-inner">
          <div className="faq-teaser-left">
            <div className="faq-teaser-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {t.helpCenter}
            </div>
            <div className="faq-teaser-title">{t.faq}</div>
            <p className="faq-teaser-sub">{t.experienceSeamless}</p>
            <a href="/faq" className="faq-teaser-btn">
              {t.faq} →
            </a>
          </div>
          <div className="faq-teaser-right">
            {[
              { q: t.secureSubmission,   a: t.secureSubmissionDesc  },
              { q: t.aiRouting,          a: t.aiRoutingDesc         },
              { q: t.realTimeTracking,   a: t.realTimeTrackingDesc  },
            ].map((item, i) => (
              <a key={i} href="/faq" className="faq-preview-item">
                <div className="faq-preview-q">
                  <span className="faq-preview-q-badge">Q</span>
                  {item.q}
                </div>
                <div className="faq-preview-a">{item.a}</div>
              </a>
            ))}
            <a href="/faq" className="faq-teaser-viewall">
              {t.faq} — View all questions →
            </a>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="info-section" id="about">
        <div className="info-content">
          <div className="info-text">
            <h2>{t.transforming}</h2>
            <p>{t.transformingDesc}</p>
            <div className="info-features">
              {[
                { key: 'pdpaCompliant' },
                { key: 'multiMinistry' },
                { key: 'auditTrail' },
                { key: 'mobileResponsive' }
              ].map(({ key }) => (
                <div key={key} className="info-feature-item">
                  <div className="check-icon">
                    <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                  <span>{t[key]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="info-image">
            <img src="/pictures/MainPage.jpeg" alt="GovCare+ Dashboard Preview" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer" id="contact">
        <div className="footer-content">
          <div className="footer-top">
            <div className="footer-brand">
              <h3>GovCare+</h3>
              <p>{t.footerDesc}</p>
              <div className="footer-security">
                <span className="security-badge">TLS/SSL SECURED</span>
                <span className="pdpa-badge">PDPA 2010 Compliant</span>
              </div>
            </div>
            <div className="footer-section">
              <h4>{t.quickLinks}</h4>
              <ul>
                <li><a href="/">{t.navHome}</a></li>
                <li><a href="/login">{t.submitComplaint}</a></li>
                <li><a href="/track-status">{t.trackStatus}</a></li>
                <li><a href="/faq">{t.faq}</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>{t.support}</h4>
              <ul>
                <li><a href="/faq">{t.helpCenter}</a></li>
                <li><a href="#contact">{t.contactUs}</a></li>
                <li><a href="/faq">{t.userGuide}</a></li>
                <li><a href="/faq">{t.systemStatus}</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>{t.legal}</h4>
              <ul>
                <li><a href="/faq">{t.privacyPolicy}</a></li>
                <li><a href="/faq">{t.termsOfService}</a></li>
                <li><a href="/faq">{t.dataProtection}</a></li>
                <li><a href="/faq">{t.accessibility}</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>{t.copyright}</div>
            <div className="footer-links-bottom">
              <a href="/faq">{t.privacy}</a>
              <a href="/faq">{t.terms}</a>
              <a href="/faq">{t.sitemap}</a>
              <a href="/admin/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: 0.6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Admin Portal
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
