(() => {
  const { M, fmt, icon, shell, outstandingOf } = window.UI;
  shell();

  const STEP_NAMES = ['HĐTD', 'khoản vay', 'TSBĐ'];
  const kunnOf = (kh) => M.contracts.some((c) => c.kh === kh);
  const rows = M.customers.map((c) => {
    const steps = [c.hdtd, kunnOf(c.kh), c.tsbd];
    return { ...c, debt: outstandingOf(c.kh), steps, done: steps.filter(Boolean).length };
  });
  const filters = [
    { id: 'all', tone: 'cust', label: 'Tổng hồ sơ', test: () => true, note: 'Mọi khách hàng của tài khoản' },
    { id: 'active', tone: 'pos', label: 'Đang làm việc', test: (c) => !c.archived },
    { id: 'archived', tone: 'neutral', label: 'Hồ sơ lưu trữ', test: (c) => c.archived },
  ];
  const related = rows.filter((c) => c.related).length;
  let filter = 'active';
  let type = 'all';
  let query = '';

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Khách hàng</h1>
      <div class="actions"><button class="btn primary" type="button">${icon('plus')}Thêm khách hàng</button></div>
    </div>
    <section class="kpis" id="kpis" aria-label="Lọc theo trạng thái hồ sơ"></section>
    <section class="card" aria-labelledby="h-list">
      <h2 id="h-list" class="sr">Danh sách khách hàng</h2>
      <div class="card-toolbar">
        <div class="left">
          <label class="input">${icon('search')}<input id="q" type="search" placeholder="Tìm theo CIF, họ tên, CCCD hoặc MST" aria-label="Tìm khách hàng"></label>
          <div class="seg" role="group" aria-label="Loại khách hàng" id="types"></div>
        </div>
        <span class="total num" id="total"></span>
      </div>
      <div id="table"></div>
    </section>`;

  function renderKpis() {
    const cells = filters.map((f) => {
      const n = rows.filter(f.test).length;
      const debtors = rows.filter((c) => f.test(c) && c.debt > 0).length;
      return `<button type="button" class="kpi" data-metric-tone="${f.tone}" data-filter="${f.id}" aria-pressed="${filter === f.id}">
        <div class="kpi-label">${f.label}</div>
        <div class="kpi-value num">${fmt.money(n)}<small>khách hàng</small></div>
        <div class="kpi-note num">${f.note || (debtors ? `${debtors} còn dư nợ` : 'Không còn dư nợ')}</div>
      </button>`;
    });
    cells.push(`<div class="kpi" data-metric-tone="accent">
        <div class="kpi-label">Có KHLQ / hôn phối</div>
        <div class="kpi-value num">${fmt.money(related)}<small>khách hàng</small></div>
        <div class="kpi-note">Khai báo người liên quan</div>
      </div>`);
    document.querySelector('#kpis').innerHTML = cells.join('');
  }

  function renderTypes() {
    const types = [['all', 'Tất cả'], ['Cá nhân', 'Cá nhân'], ['Doanh nghiệp', 'Doanh nghiệp'], ['Hộ kinh doanh', 'Hộ KD']];
    document.querySelector('#types').innerHTML = types.map(([id, label]) => `<button type="button" data-type="${id}" aria-pressed="${type === id}">${label}</button>`).join('');
  }

  function renderTable() {
    const f = filters.find((x) => x.id === filter);
    const q = query.trim().toLowerCase();
    const list = rows
      .filter(f.test)
      .filter((c) => type === 'all' || c.type === type)
      .filter((c) => !q || [c.cif, c.kh, c.idNo].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => b.debt - a.debt || a.kh.localeCompare(b.kh, 'vi'));
    document.querySelector('#total').textContent = `${list.length} khách hàng · dư nợ ${fmt.money(list.reduce((s, c) => s + c.debt, 0))} VNĐ`;
    if (!list.length) {
      document.querySelector('#table').innerHTML = '<div class="empty">Không có khách hàng khớp bộ lọc.</div>';
      return;
    }
    const isFocus = (c) => c.cif === M.focus.cif;
    document.querySelector('#table').innerHTML = `<div class="tw"><table>
      <thead><tr><th>Khách hàng</th><th class="opt">Điện thoại</th><th>CCCD / MST</th><th class="r">Dư nợ (VNĐ)</th><th>Tiến độ hồ sơ</th><th><span class="sr">Thao tác</span></th></tr></thead>
      <tbody>${list.map((c) => `
        <tr${c.archived ? ' class="archived"' : ''}>
          <td class="c-who who-cell"><b><a class="name-link" href="${isFocus(c) ? 'hop-dong-tin-dung.html' : '#'}">${fmt.esc(c.kh)}</a></b><span class="num">CIF ${c.cif} · ${c.type}</span></td>
          <td class="num muted opt">${c.phone}</td>
          <td class="c-due"><span class="num">${c.idNo}</span><span class="sub-line num">Cấp ${fmt.dmy(c.idDate)}</span></td>
          <td class="c-amt r num ${c.debt ? 'money' : 'dash'}">${c.debt ? fmt.money(c.debt) : '—'}</td>
          <td><span class="steps">${c.steps.map((on) => `<i class="${on ? 'on' : ''}"></i>`).join('')}<span>${c.done === 3 ? 'Đủ hồ sơ' : `Thiếu ${STEP_NAMES.filter((_, i) => !c.steps[i]).join(', ')}`}</span></span></td>
          <td class="c-act r"><button class="btn kebab" type="button" aria-label="Thao tác với ${fmt.esc(c.kh)}">${icon('dots')}</button></td>
        </tr>`).join('')}</tbody></table></div>
      <div class="card-foot"><span class="num">Hiển thị 1–${list.length} / ${list.length}</span></div>`;
  }

  document.addEventListener('click', (e) => {
    const k = e.target.closest('[data-filter]');
    if (k) { filter = k.dataset.filter; renderKpis(); renderTable(); return; }
    const t = e.target.closest('[data-type]');
    if (t) { type = t.dataset.type; renderTypes(); renderTable(); }
  });
  document.querySelector('#q').addEventListener('input', (e) => { query = e.target.value; renderTable(); });
  renderKpis();
  renderTypes();
  renderTable();
})();
