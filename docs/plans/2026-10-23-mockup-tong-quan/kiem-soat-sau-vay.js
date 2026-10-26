(() => {
  const { M, fmt, days, icon, shell } = window.UI;
  const X = window.MORE;
  shell();
  const KIND = { mdsdv: 'Mục đích sử dụng vốn', ksv: 'Kiểm tra sau vay', ts: 'Hiện trạng tài sản' };
  const nameOf = (cif) => M.customers.find((c) => c.cif === cif)?.kh || cif;
  const status = (c) => c.done ? 'done' : days(c.due) < 0 ? 'late' : days(c.due) <= 14 ? 'soon' : 'later';
  const rows = X.checks.map((c) => ({ ...c, kh: nameOf(c.cif), st: status(c), d: days(c.due) })).sort((a, b) => a.d - b.d);
  const groups = [
    { id: 'late', tone: 'neg', label: 'Đợt kiểm soát quá hạn', note: 'Cần kiểm tra ngay' },
    { id: 'soon', tone: 'warn', label: 'Tới hạn trong 14 ngày', note: 'Nhắc lịch với khách hàng' },
    { id: 'later', tone: 'neutral', label: 'Chưa tới hạn', note: 'Theo lịch định kỳ' },
    { id: 'done', tone: 'pos', label: 'Đã hoàn thành', note: 'Đã ghi nhận biên bản' },
  ];
  let filter = 'todo';
  let kind = 'all';

  document.querySelector('#main').innerHTML = `
    <div class="title-row"><h1>Kiểm soát sau vay</h1></div>
    <section class="kpis" id="kpis" aria-label="Lọc theo trạng thái đợt kiểm soát"></section>
    <section class="card" aria-labelledby="h-list">
      <h2 id="h-list" class="sr">Danh sách đợt kiểm soát</h2>
      <div class="card-toolbar">
        <div class="left">
          <div class="seg" role="group" aria-label="Loại kiểm tra" id="kinds"></div>
        </div>
        <span class="total num" id="total"></span>
      </div>
      <div id="table"></div>
    </section>`;

  function render() {
    document.querySelector('#kpis').innerHTML = groups.map((g) => {
      const n = rows.filter((r) => r.st === g.id).length;
      return `<button type="button" class="kpi" data-metric-tone="${g.tone}" data-filter="${g.id}" aria-pressed="${filter === g.id}">
        <div class="kpi-label">${g.label}</div>
        <div class="kpi-value num ${g.id === 'late' && n ? 'neg' : ''}">${n}<small>đợt</small></div>
        <div class="kpi-note">${g.note}</div>
      </button>`;
    }).join('');
    const kinds = [['all', 'Tất cả loại'], ...Object.entries(KIND)];
    document.querySelector('#kinds').innerHTML = kinds.map(([id, l]) => `<button type="button" data-kind="${id}" aria-pressed="${kind === id}">${l}</button>`).join('');
    const list = rows
      .filter((r) => (filter === 'todo' ? r.st !== 'done' : r.st === filter))
      .filter((r) => kind === 'all' || r.kind === kind);
    document.querySelector('#total').innerHTML = `${list.length} đợt${filter === 'todo' ? ' còn phải làm' : ''}${filter !== 'todo' ? ' · <button class="link" type="button" data-filter="todo">Về danh sách còn phải làm</button>' : ''}`;
    const st = (r) => r.st === 'done' ? `<span class="pill ${r.result === 'Đạt' ? 'pos' : 'warn'}">${r.result} · ${fmt.dmy(r.done).slice(0, 5)}</span>` : r.st === 'late' ? `<span class="pill neg">Quá hạn ${-r.d} ngày</span>` : r.st === 'soon' ? `<span class="pill warn">Còn ${r.d} ngày</span>` : `<span class="pill neutral">Còn ${r.d} ngày</span>`;
    document.querySelector('#table').innerHTML = list.length ? `<div class="tw"><table>
      <thead><tr><th>Khách hàng</th><th>Loại kiểm tra</th><th class="opt">Phạm vi</th><th class="opt">Kỳ</th><th>Đến hạn</th><th>Trạng thái</th><th><span class="sr">Thao tác</span></th></tr></thead>
      <tbody>${list.map((r) => `<tr>
        <td class="c-who who-cell"><b>${fmt.esc(r.kh)}</b><span class="num">CIF ${r.cif}</span></td>
        <td>${KIND[r.kind]}</td>
        <td class="opt muted num">${fmt.esc(r.scope)}</td>
        <td class="opt muted">${r.period}</td>
        <td class="c-due num">${fmt.dmy(r.due)}</td>
        <td class="c-amt">${st(r)}</td>
        <td class="c-act r">${r.st === 'done' ? '<button class="btn ghost" type="button">Xem biên bản</button>' : '<button class="btn ghost" type="button">Ghi nhận</button>'}</td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Không có đợt kiểm soát nào trong bộ lọc này.</div>';
  }

  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filter]');
    if (f) { filter = filter === f.dataset.filter ? 'todo' : f.dataset.filter; render(); return; }
    const k = e.target.closest('[data-kind]');
    if (k) { kind = k.dataset.kind; render(); }
  });
  render();
})();
