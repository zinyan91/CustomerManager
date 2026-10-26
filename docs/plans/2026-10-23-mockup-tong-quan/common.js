// Dùng chung cho mọi trang mockup: định dạng, phép tính nghiệp vụ từ data.js, khung menu.
window.UI = (() => {
  const M = window.MOCK;
  const nf = new Intl.NumberFormat('vi-VN');
  const pf = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const DAY = 86400000;
  const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
  const fmt = {
    money: (v) => (v == null ? '—' : nf.format(v)),
    pct: (v) => (v == null ? '—' : `${pf.format(v)}%`),
    dmy: (iso) => (iso ? iso.split('-').reverse().join('/') : '—'),
    esc: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  };
  const days = (iso) => Math.round((toDate(iso) - toDate(M.today)) / DAY);

  // Nhóm nợ hiệu lực = max(nhóm lưu, nhóm tính từ số ngày quá hạn) như DashboardView.
  const groupFromOverdue = (d) => (d >= 10 && d <= 90 ? 2 : d >= 91 && d <= 180 ? 3 : d >= 181 && d <= 360 ? 4 : d > 360 ? 5 : 1);
  const maxOverdue = new Map();
  for (const p of M.periods) {
    const d = -days(p.due);
    if (d > 0) maxOverdue.set(p.contract, Math.max(maxOverdue.get(p.contract) || 0, d));
  }
  const overdueDays = (c) => maxOverdue.get(c.id) || 0;
  const groupOf = (c) => Math.max(c.storedGroup, groupFromOverdue(overdueDays(c)));
  const byId = new Map(M.contracts.map((c) => [c.id, c]));
  const outstandingOf = (kh) => M.contracts.filter((c) => c.kh === kh).reduce((s, c) => s + c.outstanding, 0);

  // Hiệu lực định giá TSBĐ: hết hạn, sắp hết hạn trong 30 ngày, chưa định giá, còn hiệu lực.
  const assetStatus = (a) => {
    if (!a.valued) return { key: 'none', label: 'Chưa định giá', tone: 'neutral' };
    const d = days(a.next);
    if (d < 0) return { key: 'expired', label: 'Hết hiệu lực', tone: 'neg', days: -d };
    if (d <= 30) return { key: 'soon', label: 'Sắp hết hạn', tone: 'warn', days: d };
    return { key: 'ok', label: 'Đang hiệu lực', tone: 'pos', days: d };
  };
  // Sức cấp tín dụng chỉ tính tài sản còn hiệu lực định giá.
  const capacityOf = (a) => (a.value && ['ok', 'soon'].includes(assetStatus(a).key) ? Math.round((a.value * a.ltv) / 100) : 0);

  const icons = {
    dash: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
    trend: '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M8 13h8M8 17h5"/>',
    folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
    db: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    box: '<path d="M21 8 12 3 3 8l9 5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    bank: '<path d="M3 10 12 4l9 6z"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M3 22h18"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    gear: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-17.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>',
    out: '<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    menu: '<path d="M4 5h16M4 12h16M4 19h16"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    dots: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    swap: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
  };
  const icon = (n) => `<svg class="i" aria-hidden="true" viewBox="0 0 24 24">${icons[n]}</svg>`;

  const SECTIONS = [
    { id: 'overview', label: 'Tổng quan', icon: 'dash', items: [['ban-lam-viec', 'Bàn làm việc', 'index.html'], ['team', 'Team & KPI', 'team-kpi.html'], ['tien-do', 'Báo cáo tiến độ', 'tien-do.html'], ['excel', 'Báo cáo Excel', 'bao-cao.html']] },
    { id: 'credit', label: 'Tín dụng', icon: 'users', items: [['khach-hang', 'Khách hàng', 'khach-hang.html'], ['hdtd', 'Hợp đồng tín dụng', 'hop-dong-tin-dung.html'], ['tsbd', 'Tài sản bảo đảm', 'tai-san-bao-dam.html'], ['hdtc', 'Hợp đồng thế chấp', 'hop-dong-the-chap.html'], ['giai-ngan', 'Thông tin giải ngân', 'giai-ngan.html'], ['khoan-vay', 'Khoản vay', 'khoan-vay.html'], ['the', 'Thẻ tín dụng', 'the-tin-dung.html'], ['ksv', 'Kiểm soát sau vay', 'kiem-soat-sau-vay.html']] },
    { id: 'finance', label: 'Phân tích', icon: 'trend', items: [['pakd', 'Phương án kinh doanh', 'phuong-an.html'], ['bctc', 'BCTC doanh nghiệp', 'bctc.html'], ['toi', 'Dự phóng TOI', 'toi.html'], ['cong-cu', 'Công cụ tính toán', 'cong-cu.html']] },
    { id: 'documents', label: 'Hồ sơ chứng từ', icon: 'file' },
    { id: 'dispatch', label: 'Quản lý văn thư', icon: 'folder' },
    { id: 'storage', label: 'Kho lưu trữ', icon: 'db' },
    { id: 'retail', label: 'Dự toán', icon: 'box' },
    { id: 'reference', label: 'Tra cứu', icon: 'bank', items: [['mdsdv', 'Mục đích sử dụng vốn', 'mdsdv.html'], ['chinh-sach-the', 'Chính sách thẻ', 'chinh-sach-the.html'], ['chao-lai-suat', 'Chào lãi suất', 'chao-lai-suat.html'], ['cof', 'Mua bán vốn nội bộ', 'cof.html'], ['on-tap', 'Ôn tập nghiệp vụ', 'on-tap.html']] },
    { id: 'admin', label: 'Quản trị', icon: 'shield' },
    { id: 'system', label: 'Cài đặt', icon: 'gear' },
  ];

  function shell() {
    const page = document.body.dataset.page;
    const section = SECTIONS.find((s) => s.items?.some(([id]) => id === page));
    const link = (s) => s.items?.find(([, , href]) => href)?.[2] || '#';
    const nav = SECTIONS.map((s) => {
      const open = s === section;
      const sub = open ? `<ul class="sub">${s.items.map(([id, label, href]) => `<li><a href="${href || '#'}"${id === page ? ' aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul>` : '';
      return `<li><a href="${link(s)}"${open ? ' aria-current="true"' : ''}>${icon(s.icon)}${s.label}</a>${sub}</li>`;
    }).join('');
    const dark = document.documentElement.classList.contains('dark');
    document.querySelector('.nav').innerHTML = `
      <div class="brand"><img src="felix-icon.png" alt=""><div><b>Felix</b><span>Quản lý khách hàng</span></div></div>
      <button class="scope" type="button" aria-label="Đổi phạm vi dữ liệu">${icon('users')}<span class="who">Tài khoản của tôi</span>${icon('chev')}</button>
      <button class="search" type="button">${icon('search')}<span>Tìm khách hàng, tính năng</span><span class="kbd">Ctrl K</span></button>
      <ul class="navlist">${nav}</ul>
      <div class="nav-foot">
        <button type="button">${icon('bot')}Trợ lý AI</button>
        <button type="button" id="theme">${icon(dark ? 'sun' : 'moon')}<span>${dark ? 'Giao diện sáng' : 'Giao diện tối'}</span></button>
        <div class="user"><span class="avatar">QT</span><div><b>Quản trị viên</b><span>Master Admin · Trực tuyến</span></div></div>
        <button type="button">${icon('out')}Đăng xuất</button>
      </div>`;
    document.querySelector('.phonebar').innerHTML = `
      <img src="felix-icon.png" alt=""><b>${section ? section.label : ''}</b>
      <button class="btn icon" type="button" aria-label="Tìm kiếm">${icon('search')}</button>
      <button class="btn icon" type="button" aria-label="Mở menu">${icon('menu')}</button>`;
    document.querySelectorAll('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#theme')) return;
      const on = document.documentElement.classList.toggle('dark');
      localStorage.setItem('mockup-theme', on ? 'dark' : 'light');
      document.querySelector('#theme').innerHTML = `${icon(on ? 'sun' : 'moon')}<span>${on ? 'Giao diện sáng' : 'Giao diện tối'}</span>`;
    });
  }
  if (localStorage.getItem('mockup-theme') === 'dark') document.documentElement.classList.add('dark');

  // Thanh khách hàng đang mở, dùng ở các trang làm việc theo một khách hàng.
  function customerBar(extra, cif = M.focus.cif) {
    const c = M.customers.find((x) => x.cif === cif);
    return `<section class="custbar" aria-label="Khách hàng đang mở">
      <span class="avatar lg">${c.kh.replace(/^Cty (TNHH|CP) /, '').split(' ').slice(-2).map((w) => w[0]).join('')}</span>
      <div class="custbar-id"><b>${fmt.esc(c.kh)}</b><span class="num">CIF ${c.cif} · ${c.type === 'Doanh nghiệp' ? 'MST' : 'CCCD'} ${c.idNo} · ${c.phone}</span></div>
      ${extra.map(([label, value, cls = '']) => `<div class="custbar-fig"><span>${label}</span><b class="num ${cls}">${value}</b></div>`).join('')}
      <button class="btn" type="button">${icon('swap')}Đổi khách hàng</button>
    </section>`;
  }

  const kpi = (k) => `<div class="kpi" data-metric-tone="${k.tone}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value num ${k.cls || ''}">${k.value}${k.unit ? `<small>${k.unit}</small>` : ''}</div>
      <div class="kpi-note num">${k.note}</div>
    </div>`;

  return { M, fmt, days, groupOf, overdueDays, byId, outstandingOf, assetStatus, capacityOf, icon, shell, customerBar, kpi };
})();
