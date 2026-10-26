(() => {
  const { M, fmt, days, icon, shell, byId, groupOf } = window.UI;
  shell();
  const periods = M.periods.map((p) => ({ ...p, c: byId.get(p.contract), d: days(p.due) })).sort((a, b) => a.d - b.d);
  const due = (d) => (d < 0 ? `<span class="late">Quá hạn ${-d} ngày</span>` : `<span class="muted">Còn ${d} ngày</span>`);
  const sumBy = (list, f) => list.reduce((s, x) => s + f(x), 0);

  const reports = [
    { id: 'ky', group: 'Theo dõi đến hạn', name: 'Kỳ trả nợ đến hạn', rows: periods, total: (l) => `${l.length} kỳ · phải thu ${fmt.money(sumBy(l, (p) => p.goc + p.lai))} VNĐ`,
      head: ['Khách hàng · khế ước', 'Kỳ', 'Đến hạn', 'Phải thu (VNĐ)', 'Nhóm'],
      row: (p) => `<td class="c-who who-cell"><b>${fmt.esc(p.c.kh)}</b><span class="num">${p.c.so}</span></td><td class="r num muted opt">${p.ky}</td><td class="c-due"><span class="num">${fmt.dmy(p.due)}</span><span class="sub-line">${due(p.d)}</span></td><td class="c-amt r money num">${fmt.money(p.goc + p.lai)}</td><td class="opt"><span class="pill g${groupOf(p.c)}">Nhóm ${groupOf(p.c)}</span></td>` },
    { id: 'kunn', group: 'Theo dõi đến hạn', name: 'KUNN đáo hạn', rows: M.kunn.map((k) => ({ ...k, c: byId.get(k.contract), d: days(k.due) })), total: (l) => `${l.length} khế ước · dư nợ ${fmt.money(sumBy(l, (k) => k.outstanding))} VNĐ`,
      head: ['Khách hàng · khế ước', 'Đáo hạn', 'Dư nợ (VNĐ)'],
      row: (k) => `<td class="c-who who-cell"><b>${fmt.esc(k.c.kh)}</b><span class="num">${k.c.so}</span></td><td class="c-due"><span class="num">${fmt.dmy(k.due)}</span><span class="sub-line">${due(k.d)}</span></td><td class="c-amt r money num">${fmt.money(k.outstanding)}</td>` },
    { id: 'hmtd', group: 'Theo dõi đến hạn', name: 'HĐTD hết hiệu lực', rows: M.hmtd.map((h) => ({ ...h, d: days(h.expiry) })), total: (l) => `${l.length} hợp đồng · hạn mức ${fmt.money(sumBy(l, (h) => h.limit))} VNĐ`,
      head: ['Khách hàng · hợp đồng', 'Hết hiệu lực', 'Hạn mức (VNĐ)'],
      row: (h) => `<td class="c-who who-cell"><b>${fmt.esc(h.kh)}</b><span class="num">${h.so}</span></td><td class="c-due"><span class="num">${fmt.dmy(h.expiry)}</span><span class="sub-line">${due(h.d)}</span></td><td class="c-amt r money num">${fmt.money(h.limit)}</td>` },
    { id: 'tsbd', group: 'Theo dõi đến hạn', name: 'TSBĐ cần định giá lại', rows: M.tsbd, total: (l) => `${l.length} tài sản`,
      head: ['Khách hàng · tài sản', 'Định giá gần nhất', 'Giá trị (VNĐ)'],
      row: (t) => `<td class="c-who who-cell"><b>${fmt.esc(t.kh)}</b><span>${fmt.esc(t.ten)}</span></td><td class="c-due num">${fmt.dmy(t.lastValued)}</td><td class="c-amt r money num">${fmt.money(t.value)}</td>` },
    { id: 'dm', group: 'Danh mục và tổng hợp', name: 'Danh mục đang vay', rows: [...M.contracts].sort((a, b) => b.outstanding - a.outstanding), total: (l) => `${l.length} khế ước · dư nợ ${fmt.money(sumBy(l, (c) => c.outstanding))} VNĐ`,
      head: ['Khách hàng · khế ước', 'Phương thức', 'Dư nợ (VNĐ)', 'Nhóm'],
      row: (c) => `<td class="c-who who-cell"><b>${fmt.esc(c.kh)}</b><span class="num">${c.so}</span></td><td class="opt muted">${c.method}</td><td class="c-amt r money num">${fmt.money(c.outstanding)}</td><td class="c-due"><span class="pill g${groupOf(c)}">Nhóm ${groupOf(c)}</span></td>` },
    { id: 'th', group: 'Danh mục và tổng hợp', name: 'Tổng hợp theo phương thức', rows: M.methods.map((m) => { const l = M.contracts.filter((c) => c.method === m); return { m, n: l.length, amt: sumBy(l, (c) => c.outstanding), g2: sumBy(l.filter((c) => groupOf(c) > 1), (c) => c.outstanding) }; }), total: (l) => `${l.length} phương thức`,
      head: ['Phương thức', 'Khế ước', 'Dư nợ (VNĐ)', 'Nợ nhóm 2+ (VNĐ)'], totals: true,
      row: (r) => `<td class="c-who"><b>${r.m}</b></td><td class="r num">${r.n}</td><td class="c-amt r money num">${fmt.money(r.amt)}</td><td class="r num ${r.g2 ? 'late' : 'dash'}">${r.g2 ? fmt.money(r.g2) : '0'}</td>` },
  ];
  let sel = 'ky';

  document.querySelector('#main').innerHTML = `
    <div class="title-row"><h1>Báo cáo Excel</h1></div>
    <div class="reports">
      <nav class="card report-list" aria-label="Danh sách báo cáo" id="list"></nav>
      <section class="card" aria-labelledby="h-prev" id="preview"></section>
    </div>`;

  function render() {
    const groups = [...new Set(reports.map((r) => r.group))];
    document.querySelector('#list').innerHTML = groups.map((g) => `<p class="sub-title">${g}</p>${reports.filter((r) => r.group === g).map((r) => `
      <button type="button" class="report ${r.id === sel ? 'on' : ''}" data-r="${r.id}" aria-pressed="${r.id === sel}"><span>${r.name}</span><span class="count num">${r.rows.length}</span></button>`).join('')}`).join('');
    const r = reports.find((x) => x.id === sel);
    const num = (h) => /VNĐ|Khế ước|Kỳ/.test(h);
    const totalsRow = r.totals ? `<tr class="total-row"><td>TỔNG CỘNG</td><td class="r num">${sumBy(r.rows, (x) => x.n)}</td><td class="r num">${fmt.money(sumBy(r.rows, (x) => x.amt))}</td><td class="r num">${fmt.money(sumBy(r.rows, (x) => x.g2))}</td></tr>` : '';
    document.querySelector('#preview').innerHTML = `
      <div class="card-head"><h2 id="h-prev">${r.name}</h2><button class="btn primary" type="button">Xuất Excel</button></div>
      <p class="total num" style="padding:4px var(--pad) 0;margin:0">${r.total(r.rows)} · số liệu đến ${fmt.dmy(M.today)}</p>
      <div class="tw" style="margin-top:8px"><table>
        <thead><tr>${r.head.map((h, i) => `<th class="${i && num(h) ? 'r' : ''} ${h === 'Kỳ' || h === 'Phương thức' && r.id === 'dm' || h === 'Nhóm' && r.id === 'ky' ? 'opt' : ''}">${h}</th>`).join('')}</tr></thead>
        <tbody>${r.rows.map((x) => `<tr>${r.row(x)}</tr>`).join('')}${totalsRow}</tbody>
      </table></div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (b) { sel = b.dataset.r; render(); }
  });
  render();
})();
