import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const translations = {
  en: {
    faq: 'FAQ', helpCenter: 'Help Center', support: 'Support',
    home: 'Home', submitComplaint: 'Submit Complaint', trackStatus: 'Track Status',
    profile: 'Profile', logout: 'Logout', menu: 'Menu',
    pageTitle: 'Frequently Asked Questions',
    pageSubtitle: 'Find answers to common questions about GovCare+',
    searchPlaceholder: 'Search questions…',
    all: 'All', complaints: 'Complaints', tracking: 'Tracking',
    account: 'Account', privacy: 'Privacy', technical: 'Technical',
    stillNeedHelp: 'Still need help?',
    stillNeedHelpSub: 'Our support team is ready to assist you.',
    contactSupport: 'Contact Support',
    noResults: 'No results found. Try a different search term.',
    notifications: 'Notifications', markAllRead: 'Mark all as read',
    viewAllNotifications: 'View all notifications',
    categories: {
      complaints: 'Complaints',
      tracking: 'Tracking',
      account: 'Account',
      privacy: 'Privacy',
      technical: 'Technical',
    },
    faqs: [
      { cat: 'complaints', q: 'How do I submit a complaint?', a: 'Log in to GovCare+, click "Submit New Complaint" from your dashboard, fill in the details about your complaint including the ministry category, description, and any supporting documents. Our AI will route it to the correct ministry automatically.' },
      { cat: 'complaints', q: 'What types of complaints can I submit?', a: 'You can submit complaints related to any government ministry or agency in Malaysia — including public services, infrastructure, healthcare, education, utilities, and more. Each complaint is reviewed and routed to the responsible authority.' },
      { cat: 'complaints', q: 'Can I attach documents or images to my complaint?', a: 'Yes. When submitting a complaint, you can upload supporting files such as photos, PDFs, or scanned documents (max 10 MB each). These help the responsible ministry understand your issue faster.' },
      { cat: 'complaints', q: 'How long does it take to process a complaint?', a: 'Processing times vary by ministry and issue complexity. Most complaints receive an initial acknowledgement within 3 working days. Full resolution typically takes 14–30 working days depending on the nature of the issue.' },
      { cat: 'tracking', q: 'How do I track the status of my complaint?', a: 'Go to "Track Status" in the sidebar. You will see all your submitted complaints along with their current status: Pending Review, In Progress, or Resolved. Click any complaint for a full activity timeline.' },
      { cat: 'tracking', q: 'What do the different status labels mean?', a: '"Pending Review" means your complaint has been received and is awaiting assignment. "In Progress" means a ministry officer is actively working on it. "Resolved" means the issue has been addressed and closed.' },
      { cat: 'tracking', q: 'Will I be notified of updates?', a: 'Yes. You will receive in-app notifications whenever your complaint status changes. Make sure notifications are enabled in your profile settings to stay informed.' },
      { cat: 'account', q: 'How do I create a GovCare+ account?', a: 'Visit the GovCare+ homepage and click "Get Started". You can register using your email address or sign in with your MyDigital ID. Email verification is required to activate your account.' },
      { cat: 'account', q: 'How do I change my display name or password?', a: 'Go to "Profile" in the sidebar. From there you can update your display name, profile photo, and password. Password changes require you to verify your current password first.' },
      { cat: 'account', q: 'Can I delete my account?', a: 'Yes. Go to Profile → Settings → Delete Account. This is permanent and will remove all your complaints and personal data within 30 days in accordance with PDPA 2010. Active complaints will be closed.' },
      { cat: 'privacy', q: 'How is my personal data protected?', a: 'All data on GovCare+ is encrypted in transit (TLS 1.3) and at rest (AES-256). We comply fully with Malaysia\'s Personal Data Protection Act 2010 (PDPA). Your data is never sold to third parties.' },
      { cat: 'privacy', q: 'Who can see my complaint?', a: 'Only you and authorised officers from the responsible ministry assigned to your complaint can view its contents. GovCare+ administrators have access for audit and quality purposes only.' },
      { cat: 'privacy', q: 'Can I export my complaint history?', a: 'Yes. Go to Profile → Privacy → Export Data. We will prepare a downloadable report of all your submissions and send you a secure download link via email within 24 hours.' },
      { cat: 'technical', q: 'Which browsers are supported?', a: 'GovCare+ supports the latest two versions of Chrome, Firefox, Safari, and Microsoft Edge. For the best experience, we recommend Google Chrome. Internet Explorer is not supported.' },
      { cat: 'technical', q: 'Is there a mobile app?', a: 'A mobile app for iOS and Android is currently in development and will be released soon. In the meantime, GovCare+ is fully responsive and works well on all modern mobile browsers.' },
      { cat: 'technical', q: 'What should I do if I encounter a bug or error?', a: 'Please use the "Contact Support" option at the bottom of this page to report any bugs. Include a description of what happened, which page you were on, and a screenshot if possible. Our team will investigate promptly.' },
    ]
  },
  ms: {
    faq: 'Soalan Lazim', helpCenter: 'Pusat Bantuan', support: 'Sokongan',
    home: 'Utama', submitComplaint: 'Hantar Aduan', trackStatus: 'Jejak Status',
    profile: 'Profil', logout: 'Log Keluar', menu: 'Menu',
    pageTitle: 'Soalan Lazim',
    pageSubtitle: 'Cari jawapan kepada soalan lazim tentang GovCare+',
    searchPlaceholder: 'Cari soalan…',
    all: 'Semua', complaints: 'Aduan', tracking: 'Penjejakan',
    account: 'Akaun', privacy: 'Privasi', technical: 'Teknikal',
    stillNeedHelp: 'Masih perlukan bantuan?',
    stillNeedHelpSub: 'Pasukan sokongan kami sedia membantu anda.',
    contactSupport: 'Hubungi Sokongan',
    noResults: 'Tiada keputusan. Cuba terma carian yang lain.',
    notifications: 'Pemberitahuan', markAllRead: 'Tandakan semua dibaca',
    viewAllNotifications: 'Lihat semua pemberitahuan',
    categories: {
      complaints: 'Aduan', tracking: 'Penjejakan',
      account: 'Akaun', privacy: 'Privasi', technical: 'Teknikal',
    },
    faqs: [
      { cat: 'complaints', q: 'Bagaimana cara menghantar aduan?', a: 'Log masuk ke GovCare+, klik "Hantar Aduan Baru" dari papan pemuka anda, isi butiran aduan termasuk kategori kementerian, penerangan, dan dokumen sokongan. AI kami akan menghalakannya secara automatik.' },
      { cat: 'complaints', q: 'Apakah jenis aduan yang boleh saya hantar?', a: 'Anda boleh menghantar aduan berkaitan mana-mana kementerian atau agensi kerajaan di Malaysia — termasuk perkhidmatan awam, infrastruktur, kesihatan, pendidikan, utiliti, dan banyak lagi.' },
      { cat: 'complaints', q: 'Bolehkah saya lampirkan dokumen atau gambar?', a: 'Ya. Semasa menghantar aduan, anda boleh memuat naik fail sokongan seperti foto, PDF, atau dokumen imbasan (maks 10 MB setiap satu).' },
      { cat: 'complaints', q: 'Berapa lama masa untuk memproses aduan?', a: 'Masa pemprosesan berbeza mengikut kementerian dan kerumitan isu. Kebanyakan aduan menerima pengakuan awal dalam masa 3 hari bekerja. Penyelesaian penuh biasanya mengambil masa 14–30 hari bekerja.' },
      { cat: 'tracking', q: 'Bagaimana cara menjejak status aduan saya?', a: 'Pergi ke "Jejak Status" dalam bar sisi. Anda akan melihat semua aduan yang telah dihantar berserta status semasa mereka.' },
      { cat: 'tracking', q: 'Apakah maksud label status yang berbeza?', a: '"Menunggu Semakan" bermakna aduan anda telah diterima. "Dalam Proses" bermakna pegawai sedang menanganinya. "Selesai" bermakna isu telah diselesaikan.' },
      { cat: 'tracking', q: 'Adakah saya akan dimaklumkan tentang kemas kini?', a: 'Ya. Anda akan menerima pemberitahuan dalam aplikasi setiap kali status aduan anda berubah.' },
      { cat: 'account', q: 'Bagaimana cara membuat akaun GovCare+?', a: 'Layari halaman utama GovCare+ dan klik "Mulakan". Anda boleh mendaftar menggunakan alamat e-mel atau log masuk dengan MyDigital ID anda.' },
      { cat: 'account', q: 'Bagaimana cara menukar nama paparan atau kata laluan?', a: 'Pergi ke "Profil" dalam bar sisi. Dari sana anda boleh mengemas kini nama paparan, foto profil, dan kata laluan.' },
      { cat: 'account', q: 'Bolehkah saya memadam akaun saya?', a: 'Ya. Pergi ke Profil → Tetapan → Padam Akaun. Ini adalah kekal dan akan memadamkan semua data anda dalam masa 30 hari mengikut PDPA 2010.' },
      { cat: 'privacy', q: 'Bagaimana data peribadi saya dilindungi?', a: 'Semua data di GovCare+ dienkripsi semasa transit (TLS 1.3) dan semasa berehat (AES-256). Kami mematuhi sepenuhnya Akta Perlindungan Data Peribadi 2010 (PDPA) Malaysia.' },
      { cat: 'privacy', q: 'Siapa yang boleh melihat aduan saya?', a: 'Hanya anda dan pegawai yang diberi kuasa dari kementerian yang bertanggungjawab boleh melihat kandungan aduan anda.' },
      { cat: 'privacy', q: 'Bolehkah saya mengeksport sejarah aduan saya?', a: 'Ya. Pergi ke Profil → Privasi → Eksport Data. Kami akan menyediakan laporan yang boleh dimuat turun dalam masa 24 jam.' },
      { cat: 'technical', q: 'Pelayar web manakah yang disokong?', a: 'GovCare+ menyokong dua versi terkini Chrome, Firefox, Safari, dan Microsoft Edge. Internet Explorer tidak disokong.' },
      { cat: 'technical', q: 'Adakah terdapat aplikasi mudah alih?', a: 'Aplikasi mudah alih untuk iOS dan Android sedang dalam pembangunan. Buat masa ini, GovCare+ berfungsi sepenuhnya pada pelayar mudah alih moden.' },
      { cat: 'technical', q: 'Apa yang perlu saya lakukan jika menemui ralat?', a: 'Gunakan pilihan "Hubungi Sokongan" di bahagian bawah halaman ini untuk melaporkan sebarang ralat. Sertakan penerangan tentang apa yang berlaku dan tangkapan skrin jika ada.' },
    ]
  },
  zh: {
    faq: '常见问题', helpCenter: '帮助中心', support: '支持',
    home: '首页', submitComplaint: '提交投诉', trackStatus: '跟踪状态',
    profile: '个人资料', logout: '登出', menu: '菜单',
    pageTitle: '常见问题解答',
    pageSubtitle: '查找关于 GovCare+ 常见问题的答案',
    searchPlaceholder: '搜索问题…',
    all: '全部', complaints: '投诉', tracking: '跟踪',
    account: '账户', privacy: '隐私', technical: '技术',
    stillNeedHelp: '仍需帮助？',
    stillNeedHelpSub: '我们的支持团队随时准备为您提供帮助。',
    contactSupport: '联系支持',
    noResults: '未找到结果，请尝试其他搜索词。',
    notifications: '通知', markAllRead: '全部标为已读',
    viewAllNotifications: '查看所有通知',
    categories: {
      complaints: '投诉', tracking: '跟踪',
      account: '账户', privacy: '隐私', technical: '技术',
    },
    faqs: [
      { cat: 'complaints', q: '如何提交投诉？', a: '登录 GovCare+，从仪表板点击"提交新投诉"，填写投诉详情，包括部门类别、描述和支持文件。我们的 AI 将自动将其路由到正确的部门。' },
      { cat: 'complaints', q: '可以提交哪些类型的投诉？', a: '您可以提交与马来西亚任何政府部门或机构相关的投诉，包括公共服务、基础设施、医疗、教育、公用事业等。' },
      { cat: 'complaints', q: '可以附上文件或图片吗？', a: '可以。提交投诉时，您可以上传支持文件，如照片、PDF 或扫描文件（每个最大 10 MB）。' },
      { cat: 'complaints', q: '处理投诉需要多长时间？', a: '处理时间因部门和问题复杂程度而异。大多数投诉在 3 个工作日内收到初步确认，完全解决通常需要 14–30 个工作日。' },
      { cat: 'tracking', q: '如何跟踪投诉状态？', a: '前往侧边栏中的"跟踪状态"。您将看到所有已提交的投诉及其当前状态。点击任何投诉可查看完整的活动时间线。' },
      { cat: 'tracking', q: '不同状态标签是什么意思？', a: '"待审核"表示您的投诉已收到，正在等待分配。"进行中"表示部门官员正在积极处理。"已解决"表示问题已处理并关闭。' },
      { cat: 'tracking', q: '我会收到更新通知吗？', a: '是的。每当您的投诉状态发生变化时，您将收到应用内通知。请确保在个人资料设置中启用通知。' },
      { cat: 'account', q: '如何创建 GovCare+ 账户？', a: '访问 GovCare+ 主页，点击"开始使用"。您可以使用电子邮件地址注册，或使用 MyDigital ID 登录。需要验证电子邮件才能激活账户。' },
      { cat: 'account', q: '如何更改显示名称或密码？', a: '前往侧边栏中的"个人资料"。您可以在那里更新显示名称、头像和密码。' },
      { cat: 'account', q: '可以删除我的账户吗？', a: '可以。前往个人资料 → 设置 → 删除账户。此操作是永久性的，将在 30 天内根据 PDPA 2010 删除您的所有数据。' },
      { cat: 'privacy', q: '我的个人数据如何受到保护？', a: 'GovCare+ 上的所有数据在传输中（TLS 1.3）和静态（AES-256）均已加密。我们完全遵守马来西亚 2010 年个人数据保护法（PDPA）。' },
      { cat: 'privacy', q: '谁可以查看我的投诉？', a: '只有您和负责您投诉的部门授权官员才能查看其内容。GovCare+ 管理员仅为审计目的拥有访问权限。' },
      { cat: 'privacy', q: '可以导出我的投诉历史吗？', a: '可以。前往个人资料 → 隐私 → 导出数据。我们将在 24 小时内通过电子邮件向您发送安全下载链接。' },
      { cat: 'technical', q: '支持哪些浏览器？', a: 'GovCare+ 支持 Chrome、Firefox、Safari 和 Microsoft Edge 的最新两个版本。不支持 Internet Explorer。' },
      { cat: 'technical', q: '有移动应用程序吗？', a: 'iOS 和 Android 移动应用程序正在开发中，即将发布。目前，GovCare+ 在所有现代移动浏览器上完全响应。' },
      { cat: 'technical', q: '遇到错误应该怎么办？', a: '请使用本页底部的"联系支持"选项报告任何错误。请提供发生情况的描述以及截图（如有）。' },
    ]
  },
  ta: {
    faq: 'அடிக்கடி கேட்கும் கேள்விகள்', helpCenter: 'உதவி மையம்', support: 'ஆதரவு',
    home: 'முகப்பு', submitComplaint: 'புகார் சமர்ப்பி', trackStatus: 'நிலையை கண்காணி',
    profile: 'சுயவிவரம்', logout: 'வெளியேறு', menu: 'மெனு',
    pageTitle: 'அடிக்கடி கேட்கும் கேள்விகள்',
    pageSubtitle: 'GovCare+ பற்றிய பொதுவான கேள்விகளுக்கு பதில்கள் காணுங்கள்',
    searchPlaceholder: 'கேள்விகளை தேடுங்கள்…',
    all: 'அனைத்தும்', complaints: 'புகார்கள்', tracking: 'கண்காணிப்பு',
    account: 'கணக்கு', privacy: 'தனியுரிமை', technical: 'தொழில்நுட்பம்',
    stillNeedHelp: 'இன்னும் உதவி தேவையா?',
    stillNeedHelpSub: 'எங்கள் ஆதரவு குழு உங்களுக்கு உதவ தயாராக உள்ளது.',
    contactSupport: 'ஆதரவை தொடர்பு கொள்ளுங்கள்',
    noResults: 'முடிவுகள் இல்லை. வேறொரு தேடல் சொல்லை முயற்சிக்கவும்.',
    notifications: 'அறிவிப்புகள்', markAllRead: 'அனைத்தையும் படித்ததாக குறி',
    viewAllNotifications: 'அனைத்து அறிவிப்புகளையும் காண்க',
    categories: {
      complaints: 'புகார்கள்', tracking: 'கண்காணிப்பு',
      account: 'கணக்கு', privacy: 'தனியுரிமை', technical: 'தொழில்நுட்பம்',
    },
    faqs: [
      { cat: 'complaints', q: 'புகாரை எவ்வாறு சமர்ப்பிப்பது?', a: 'GovCare+-ல் உள்நுழைந்து, "புதிய புகார் சமர்ப்பி" என்பதை கிளிக் செய்து, கந்தர வகை, விளக்கம் மற்றும் ஆவணங்கள் உள்ளிட்ட விவரங்களை நிரப்பவும். எங்கள் AI அதை தானாகவே சரியான அமைச்சகத்திற்கு அனுப்பும்.' },
      { cat: 'complaints', q: 'எந்த வகையான புகார்களை சமர்ப்பிக்கலாம்?', a: 'மலேசியாவில் எந்த அரசு அமைச்சகம் அல்லது நிறுவனம் தொடர்பான புகார்களையும் — பொது சேவை, உள்கட்டமைப்பு, சுகாதாரம், கல்வி, பயன்பாடுகள் உள்ளிட்டவற்றை சமர்ப்பிக்கலாம்.' },
      { cat: 'complaints', q: 'ஆவணங்கள் அல்லது படங்களை இணைக்க முடியுமா?', a: 'ஆம். புகார் சமர்ப்பிக்கும் போது, புகைப்படங்கள், PDF அல்லது ஸ்கேன் செய்யப்பட்ட ஆவணங்கள் (ஒவ்வொன்றும் அதிகபட்சம் 10 MB) பதிவேற்றலாம்.' },
      { cat: 'complaints', q: 'புகாரை செயலாக்க எவ்வளவு நேரம் ஆகும்?', a: 'செயலாக்க நேரம் அமைச்சகம் மற்றும் சிக்கலின் சிக்கலானது பொருத்து மாறுபடும். பெரும்பாலான புகார்கள் 3 வேலை நாட்களுக்குள் ஆரம்ப உறுதிப்படுத்தலை பெறுகின்றன.' },
      { cat: 'tracking', q: 'புகாரின் நிலையை எவ்வாறு கண்காணிப்பது?', a: 'பக்கப்பட்டியில் "நிலையை கண்காணி" என்பதற்கு செல்லவும். உங்கள் அனைத்து சமர்ப்பிக்கப்பட்ட புகார்களும் தற்போதைய நிலையுடன் காட்டப்படும்.' },
      { cat: 'tracking', q: 'வெவ்வேறு நிலை லேபிள்களின் அர்த்தம் என்ன?', a: '"மதிப்பாய்வு நிலுவையில்" என்பது புகார் பெறப்பட்டது. "செயல்பாட்டில்" என்பது அலுவலர் அதை தீவிரமாக கையாளுகிறார். "தீர்க்கப்பட்டது" என்பது சிக்கல் தீர்க்கப்பட்டது.' },
      { cat: 'tracking', q: 'புதுப்பிப்புகள் குறித்து அறிவிக்கப்படுவேனா?', a: 'ஆம். உங்கள் புகார் நிலை மாறும் போதெல்லாம் ஆப்-உள் அறிவிப்புகள் பெறுவீர்கள்.' },
      { cat: 'account', q: 'GovCare+ கணக்கை எவ்வாறு உருவாக்குவது?', a: 'GovCare+ முகப்புப் பக்கத்தை பார்வையிட்டு "தொடங்கு" என்பதை கிளிக் செய்யவும். உங்கள் மின்னஞ்சல் முகவரியைப் பயன்படுத்தி பதிவு செய்யலாம் அல்லது MyDigital ID மூலம் உள்நுழையலாம்.' },
      { cat: 'account', q: 'காட்சி பெயர் அல்லது கடவுச்சொல்லை எவ்வாறு மாற்றுவது?', a: 'பக்கப்பட்டியில் "சுயவிவரம்" என்பதற்கு செல்லவும். அங்கிருந்து காட்சி பெயர், சுயவிவர புகைப்படம் மற்றும் கடவுச்சொல்லை புதுப்பிக்கலாம்.' },
      { cat: 'account', q: 'என் கணக்கை நீக்கலாமா?', a: 'ஆம். சுயவிவரம் → அமைப்புகள் → கணக்கை நீக்கு என்பதற்கு செல்லவும். இது PDPA 2010 இன் படி 30 நாட்களுக்குள் உங்கள் அனைத்து தரவையும் நீக்கும்.' },
      { cat: 'privacy', q: 'என் தனிப்பட்ட தரவு எவ்வாறு பாதுகாக்கப்படுகிறது?', a: 'GovCare+-ல் உள்ள அனைத்து தரவும் போக்குவரத்தில் (TLS 1.3) மற்றும் ஓய்வில் (AES-256) குறியாக்கம் செய்யப்பட்டுள்ளது. மலேசியாவின் PDPA 2010 ஐ நாங்கள் முழுமையாக பின்பற்றுகிறோம்.' },
      { cat: 'privacy', q: 'என் புகாரை யார் பார்க்கலாம்?', a: 'நீங்களும் உங்கள் புகாருக்கு பொறுப்பான அமைச்சகத்தின் அங்கீகரிக்கப்பட்ட அலுவலர்களும் மட்டுமே அதன் உள்ளடக்கங்களை பார்க்கலாம்.' },
      { cat: 'privacy', q: 'என் புகார் வரலாற்றை ஏற்றுமதி செய்யலாமா?', a: 'ஆம். சுயவிவரம் → தனியுரிமை → தரவை ஏற்றுமதி என்பதற்கு செல்லவும். 24 மணி நேரத்திற்குள் பாதுகாப்பான பதிவிறக்க இணைப்பை மின்னஞ்சல் வழியாக அனுப்புவோம்.' },
      { cat: 'technical', q: 'எந்த உலாவிகள் ஆதரிக்கப்படுகின்றன?', a: 'GovCare+ Chrome, Firefox, Safari மற்றும் Microsoft Edge இன் சமீபத்திய இரண்டு பதிப்புகளை ஆதரிக்கிறது. Internet Explorer ஆதரிக்கப்படவில்லை.' },
      { cat: 'technical', q: 'மொபைல் ஆப் இருக்கிறதா?', a: 'iOS மற்றும் Android மொபைல் ஆப் தற்போது உருவாக்கப்பட்டு வருகிறது. இதற்கிடையில், GovCare+ அனைத்து நவீன மொபைல் உலாவிகளிலும் முழுமையாக வேலை செய்கிறது.' },
      { cat: 'technical', q: 'பிழை ஏற்பட்டால் என்ன செய்வது?', a: 'இந்தப் பக்கத்தின் கீழே உள்ள "ஆதரவை தொடர்பு கொள்ளுங்கள்" விருப்பத்தைப் பயன்படுத்தவும். என்ன நடந்தது என்ற விளக்கமும் திரைப்படமும் (முடிந்தால்) இணையுங்கள்.' },
    ]
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

  .faq-page { font-family: 'Inter', sans-serif; background: #f9fafb; min-height: 100vh; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
  .faq-page.dark { background: #0f172a; color: #e2e8f0; }

  /* Top Nav — identical to Dashboard */
  .top-nav {
    background: #ffffff; height: 70px; border-bottom: 1px solid #e5e7eb;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 32px; position: sticky; top: 0; z-index: 100;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .faq-page.dark .top-nav { background: #1e293b; border-color: #334155; }
  .nav-left { display: flex; align-items: center; gap: 16px; }
  .logo-container { display: flex; align-items: center; gap: 12px; text-decoration: none; }
  .brand-name { color: #090088; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
  .faq-page.dark .brand-name { color: #ffffff; }
  .nav-right { display: flex; align-items: center; gap: 16px; }

  .theme-toggle {
    display: flex; align-items: center; justify-content: center;
    width: 40px; height: 40px; background: #f3f4f6; border: 1px solid #e5e7eb;
    border-radius: 10px; cursor: pointer; transition: all 0.2s; color: #374151;
  }
  .theme-toggle:hover { background: #e5e7eb; }
  .faq-page.dark .theme-toggle { background: #334155; border-color: #475569; color: #fbbf24; }
  .faq-page.dark .theme-toggle:hover { background: #475569; }

  .language-wrapper { position: relative; }
  .language-btn {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 500; color: #374151; transition: all 0.2s;
  }
  .language-btn:hover { background: #e5e7eb; }
  .faq-page.dark .language-btn { background: #334155; border-color: #475569; color: #e2e8f0; }
  .lang-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0; width: 180px;
    background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border: 1px solid #e5e7eb; z-index: 1000; overflow: hidden;
    opacity: 0; visibility: hidden; transform: translateY(-8px); transition: all 0.2s;
  }
  .lang-dropdown.open { opacity: 1; visibility: visible; transform: translateY(0); }
  .faq-page.dark .lang-dropdown { background: #1e293b; border-color: #334155; }
  .lang-option {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px;
    cursor: pointer; font-size: 14px; color: #374151; transition: background 0.2s;
  }
  .lang-option:hover { background: #f3f4f6; }
  .lang-option.active { background: #ede9fe; color: #090088; font-weight: 600; }
  .faq-page.dark .lang-option { color: #e2e8f0; }
  .faq-page.dark .lang-option:hover { background: #334155; }
  .faq-page.dark .lang-option.active { background: #312e81; color: #a5b4fc; }

  .user-profile {
    display: flex; align-items: center; gap: 12px; cursor: pointer;
    padding: 8px 12px; border-radius: 10px; transition: background 0.2s; text-decoration: none;
  }
  .user-profile:hover { background: #f3f4f6; }
  .faq-page.dark .user-profile:hover { background: #334155; }
  .user-avatar {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg, #090088, #1976d2);
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 700; font-size: 14px; flex-shrink: 0;
  }
  .user-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
  .faq-page.dark .user-name { color: #f1f5f9; }
  .user-email { font-size: 12px; color: #6b7280; }
  .faq-page.dark .user-email { color: #94a3b8; }

  /* Layout */
  .page-layout { display: flex; min-height: calc(100vh - 70px); }

  /* Sidebar */
  .sidebar {
    width: 260px; background: #ffffff; border-right: 1px solid #e5e7eb; padding: 24px 16px; flex-shrink: 0;
  }
  .faq-page.dark .sidebar { background: #1e293b; border-color: #334155; }
  .sidebar-section { margin-bottom: 32px; }
  .sidebar-title {
    color: #6b7280; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding: 0 12px;
  }
  .faq-page.dark .sidebar-title { color: #94a3b8; }
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
  .faq-page.dark .sidebar-menu a { color: #cbd5e1; }
  .faq-page.dark .sidebar-menu a:hover { background: #334155; color: #f1f5f9; }
  .faq-page.dark .sidebar-menu a.active { background: #312e81; color: #a5b4fc; }
  .sidebar-logout {
    display: flex; align-items: center; gap: 12px; padding: 12px;
    width: 100%; border: none; font-family: inherit; cursor: pointer;
    font-size: 14px; font-weight: 500; border-radius: 8px; text-align: left;
    transition: all 0.2s; color: #ef4444; background: rgba(239,68,68,0.08);
  }
  .sidebar-logout:hover { background: rgba(239,68,68,0.15); color: #dc2626; }
  .faq-page.dark .sidebar-logout { color: #f87171; background: rgba(239,68,68,0.1); }
  .faq-page.dark .sidebar-logout:hover { background: rgba(239,68,68,0.2); color: #f87171; }
  .menu-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

  /* Main Content */
  .main-content { flex: 1; padding: 32px; overflow-y: auto; max-width: 860px; }
  .page-header { margin-bottom: 28px; }
  .page-header h1 { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 6px; }
  .faq-page.dark .page-header h1 { color: #f1f5f9; }
  .page-header p { font-size: 14px; color: #6b7280; }
  .faq-page.dark .page-header p { color: #94a3b8; }

  /* Search */
  .faq-search { position: relative; margin-bottom: 20px; }
  .faq-search input {
    width: 100%; padding: 12px 16px 12px 44px; font-size: 14px; font-family: 'Inter', sans-serif;
    border: 1px solid #e5e7eb; border-radius: 10px; background: white;
    color: #1a1a1a; outline: none; transition: all 0.2s;
  }
  .faq-search input:focus { border-color: #090088; box-shadow: 0 0 0 3px rgba(9,0,136,0.08); }
  .faq-page.dark .faq-search input { background: #1e293b; border-color: #334155; color: #f1f5f9; }
  .faq-page.dark .faq-search input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,0.12); }
  .faq-search input::placeholder { color: #9ca3af; }
  .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; }

  /* Category Pills */
  .cat-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .cat-pill {
    padding: 6px 16px; border-radius: 99px; font-size: 13px; font-weight: 500;
    border: 1px solid #e5e7eb; background: white; color: #6b7280;
    cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif;
  }
  .cat-pill:hover { border-color: #090088; color: #090088; background: #f5f3ff; }
  .cat-pill.active { background: #090088; color: white; border-color: #090088; }
  .faq-page.dark .cat-pill { background: #1e293b; border-color: #334155; color: #94a3b8; }
  .faq-page.dark .cat-pill:hover { border-color: #818cf8; color: #a5b4fc; background: #1e293b; }
  .faq-page.dark .cat-pill.active { background: #312e81; color: #a5b4fc; border-color: #4338ca; }

  /* Section Label */
  .section-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
    color: #6b7280; margin-bottom: 10px; margin-top: 24px; padding: 0 2px;
  }
  .faq-page.dark .section-label { color: #64748b; }

  /* FAQ Items */
  .faq-item {
    background: white; border: 1px solid #e5e7eb; border-radius: 10px;
    margin-bottom: 8px; overflow: hidden; transition: all 0.2s;
  }
  .faq-item:hover { border-color: #c7d2fe; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .faq-item.open { border-color: #090088; box-shadow: 0 0 0 3px rgba(9,0,136,0.06); }
  .faq-page.dark .faq-item { background: #1e293b; border-color: #334155; }
  .faq-page.dark .faq-item:hover { border-color: #4338ca; }
  .faq-page.dark .faq-item.open { border-color: #4338ca; box-shadow: 0 0 0 3px rgba(67,56,202,0.15); }
  .faq-q {
    display: flex; justify-content: space-between; align-items: center;
    gap: 16px; padding: 16px 18px; cursor: pointer; user-select: none;
  }
  .faq-q-text { font-size: 14px; font-weight: 600; color: #1a1a1a; line-height: 1.4; }
  .faq-page.dark .faq-q-text { color: #f1f5f9; }
  .faq-item.open .faq-q-text { color: #090088; }
  .faq-page.dark .faq-item.open .faq-q-text { color: #a5b4fc; }
  .faq-chevron {
    flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
    background: #f3f4f6; display: flex; align-items: center; justify-content: center;
    color: #6b7280; transition: all 0.25s;
  }
  .faq-item.open .faq-chevron { background: #090088; color: white; transform: rotate(180deg); }
  .faq-page.dark .faq-chevron { background: #334155; color: #94a3b8; }
  .faq-page.dark .faq-item.open .faq-chevron { background: #4338ca; color: white; }
  .faq-a {
    font-size: 14px; color: #4b5563; line-height: 1.75;
    padding: 0 18px 16px; border-top: 1px solid #f3f4f6;
    display: none;
  }
  .faq-item.open .faq-a { display: block; }
  .faq-page.dark .faq-a { color: #94a3b8; border-color: #334155; }

  /* No results */
  .no-results { text-align: center; padding: 60px 24px; color: #9ca3af; }
  .no-results svg { margin: 0 auto 12px; display: block; opacity: 0.35; }
  .no-results p { font-size: 14px; }

  /* Contact Bar */
  .contact-bar {
    margin-top: 32px; background: linear-gradient(135deg, #090088 0%, #1976d2 100%);
    border-radius: 14px; padding: 28px 32px;
    display: flex; align-items: center; justify-content: space-between; gap: 20px;
    flex-wrap: wrap;
  }
  .contact-bar-text h3 { font-size: 16px; font-weight: 700; color: white; margin-bottom: 4px; }
  .contact-bar-text p { font-size: 13px; color: rgba(255,255,255,0.75); }
  .contact-btn {
    padding: 12px 24px; background: white; color: #090088; border: none;
    border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    transition: all 0.2s; font-family: 'Inter', sans-serif; white-space: nowrap;
  }
  .contact-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.25); }
`;

export default function FAQPage() {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [langOpen, setLangOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

  const langRef = useRef(null);
  const t = translations[language];
  const meta = langMeta[language];

  const displayName = currentUser?.displayName || 'User';
  const email = currentUser?.email || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    if (localStorage.getItem('govcare-theme') === 'dark') setDarkMode(true);
    setLanguage(localStorage.getItem('govcare-language') || 'en');
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => setCurrentUser(user));
    return () => unsub();
  }, []);

  useEffect(() => {
    const handler = e => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('govcare-theme', next ? 'dark' : 'light');
  };

  const handleLang = (lang) => {
    setLanguage(lang);
    localStorage.setItem('govcare-language', lang);
    setLangOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  // Filter FAQs
  const cats = ['all', 'complaints', 'tracking', 'account', 'privacy', 'technical'];
  const q = search.toLowerCase();
  const filtered = t.faqs.filter(f => {
    const catMatch = activeCat === 'all' || f.cat === activeCat;
    const textMatch = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    return catMatch && textMatch;
  });

  const grouped = filtered.reduce((acc, f, i) => {
    if (!acc[f.cat]) acc[f.cat] = [];
    acc[f.cat].push({ ...f, _idx: i });
    return acc;
  }, {});

  return (
    <>
      <style>{css}</style>
      <div className={`faq-page${darkMode ? ' dark' : ''}`}>
        {/* Top Nav */}
        <nav className="top-nav">
          <div className="nav-left">
            <Link to="/dashboard" className="logo-container">
              <span className="brand-name">GovCare+</span>
            </Link>
          </div>
          <div className="nav-right">
            <button className="theme-toggle" onClick={toggleDark} title="Toggle theme">
              {darkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18a6 6 0 110-12 6 6 0 010 12zm0-2a4 4 0 100-8 4 4 0 000 8zM11 1h2v3h-2V1zm0 19h2v3h-2v-3zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85l1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2h3zM4 11v2H1v-2h3z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm-7 9a7 7 0 017-7v14a7 7 0 01-7-7z"/></svg>
              )}
            </button>

            <div className="language-wrapper" ref={langRef}>
              <button className="language-btn" onClick={() => setLangOpen(o => !o)}>
                <span>{meta.flag}</span><span>{meta.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
              <div className={`lang-dropdown${langOpen ? ' open' : ''}`}>
                {Object.entries(langMeta).map(([code, m]) => (
                  <div key={code} className={`lang-option${language === code ? ' active' : ''}`} onClick={() => handleLang(code)}>
                    <span>{m.flag}</span><span>{m.label}</span>
                    {language === code && <span className="check">✓</span>}
                  </div>
                ))}
              </div>
            </div>

            <Link to="/profile" className="user-profile">
              <div className="user-avatar">{initials}</div>
              <div>
                <div className="user-name">{displayName}</div>
                <div className="user-email">{email}</div>
              </div>
            </Link>
          </div>
        </nav>

        <div className="page-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-title">{t.menu}</div>
              <ul className="sidebar-menu">
                <li>
                  <Link to="/dashboard">
                    <span className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg></span>
                    {t.home}
                  </Link>
                </li>
                <li>
                  <Link to="/submit-complaint">
                    <span className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>
                    {t.submitComplaint}
                  </Link>
                </li>
                <li>
                  <Link to="/track-status">
                    <span className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                    {t.trackStatus}
                  </Link>
                </li>
                <li>
                  <Link to="/profile">
                    <span className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
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
                    <span className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                    {t.helpCenter}
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="active">
                    <span className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                    {t.faq}
                  </Link>
                </li>
              </ul>
            </div>

            <button className="sidebar-logout" onClick={handleLogout}>
              <span className="menu-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></span>
              {t.logout}
            </button>
          </aside>

          {/* Main */}
          <main className="main-content">
            <div className="page-header">
              <h1>{t.pageTitle}</h1>
              <p>{t.pageSubtitle}</p>
            </div>

            {/* Search */}
            <div className="faq-search">
              <span className="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setOpenIdx(null); }}
              />
            </div>

            {/* Category Pills */}
            <div className="cat-pills">
              {cats.map(c => (
                <button
                  key={c}
                  className={`cat-pill${activeCat === c ? ' active' : ''}`}
                  onClick={() => { setActiveCat(c); setOpenIdx(null); }}
                >
                  {c === 'all' ? t.all : (t.categories[c] || c)}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            {filtered.length === 0 ? (
              <div className="no-results">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <p>{t.noResults}</p>
              </div>
            ) : (
              Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  {activeCat === 'all' && (
                    <div className="section-label">{t.categories[cat] || cat}</div>
                  )}
                  {items.map((item) => {
                    const key = `${cat}-${item._idx}`;
                    const isOpen = openIdx === key;
                    return (
                      <div key={key} className={`faq-item${isOpen ? ' open' : ''}`}>
                        <div className="faq-q" onClick={() => setOpenIdx(isOpen ? null : key)}>
                          <span className="faq-q-text">{item.q}</span>
                          <span className="faq-chevron">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                          </span>
                        </div>
                        <div className="faq-a">{item.a}</div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}

            {/* Contact Bar */}
            <div className="contact-bar">
              <div className="contact-bar-text">
                <h3>{t.stillNeedHelp}</h3>
                <p>{t.stillNeedHelpSub}</p>
              </div>
              <button className="contact-btn" onClick={() => navigate('/help-center')}>
                {t.contactSupport}
              </button>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
