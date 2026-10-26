(() => {
  const { M, fmt, icon, shell, customerBar } = window.UI;
  const X = window.MORE;
  shell();
  const assetName = (ma) => M.focus.assets.find((a) => a.ma === ma)?.ten || ma;
  const rows = X.mortgages.map((h) => ({ ...h, active: !h.released }));
  const active = rows.filter((h) => h.active);
  let filter = 'active';
  let q = '';

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Hợp đồng thế chấp</h1>
      <div class="actions"><button class="btn primary" type="button">${icon('plus')}Thêm HĐTC</button></div>
    </div>
    ${customerBar([['HĐTC đang hiệu lực', active.length], ['Bảo đảm tối đa', fmt.money(active.reduce((s, h) => s + h.maxSecured, 0))]])}
    <section class="card" aria-labelledby="h-list">
      <h2 id="h-list" class="sr">Danh sách hợp đồng thế chấp</h2>
      <div class="card-toolbar">
        <div class="left">
          <label class="input">${icon('search')}<input id="q" type="search" placeholder="Tìm theo số HĐTC hoặc bên thế chấp" aria-label="Tìm HĐTC"></label>
          <div class="seg" role="group" aria-label="Lọc trạng thái" id="seg"></div>
        </div>
        <span class="total num" id="total"></span>
      </div>
      <div id="table"></div>
    </section>
    <section class="card" aria-labelledby="h-free" style="margin-top:var(--gap)">
      <div class="card-head"><h2 id="h-free">Tài sản chưa có HĐTC</h2><span class="meta">Tài sản bảo đảm của khách hàng chưa ký thế chấp</span></div>
      <div id="free"></div>
    </section>`;

  function render() {
    const opts = [['active', 'Đang hiệu lực'], ['released', 'Đã giải chấp'], ['all', 'Tất cả']];
    document.querySelector('#seg').innerHTML = opts.map(([id, l]) => `<button type="button" data-f="${id}" aria-pressed="${filter === id}">${l}</button>`).join('');
    const list = rows
      .filter((h) => filter === 'all' || (filter === 'active') === h.active)
      .filter((h) => !q || `${h.so} ${h.owner || ''}`.toLowerCase().includes(q.toLowerCase()));
    document.querySelector('#total').textContent = `${list.length} hợp đồng · bảo đảm tối đa ${fmt.money(list.reduce((s, h) => s + h.maxSecured, 0))} VNĐ`;
    document.querySelector('#table').innerHTML = list.length ? `<div class="tw"><table>
      <thead><tr><th>Số HĐTC</th><th>Bên thế chấp</th><th>Tài sản</th><th>HĐTD được bảo đảm</th><th class="opt">Công chứng · đăng ký GDBĐ</th><th class="r">Bảo đảm tối đa (VNĐ)</th><th>Trạng thái</th><th><span class="sr">Thao tác</span></th></tr></thead>
      <tbody>${list.map((h) => `<tr>
        <td class="c-who who-cell"><b class="num">${h.so}</b><span class="num">Ký ${fmt.dmy(h.signed)}</span></td>
        <td>${h.owner ? `${fmt.esc(h.owner)}<span class="sub-line">Bên thứ ba</span>` : '<span class="muted">Chính khách hàng</span>'}</td>
        <td>${h.assets.length ? h.assets.map((a) => `<span class="line">${fmt.esc(assetName(a))}</span>`).join('') : `<span class="muted">${fmt.esc(h.assetNote)}</span>`}</td>
        <td class="num">${h.hdtd.join(', ')}</td>
        <td class="opt"><span class="num">${fmt.esc(h.notary)}</span><span class="sub-line num">Công chứng ${fmt.dmy(h.notaryDate)} · GDBĐ ${fmt.dmy(h.gdbd)}</span></td>
        <td class="c-amt r money num">${fmt.money(h.maxSecured)}</td>
        <td class="c-due">${h.active ? '<span class="pill pos">Đang hiệu lực</span>' : `<span class="pill neutral">Giải chấp ${fmt.dmy(h.released)}</span>`}</td>
        <td class="c-act r"><button class="btn kebab" type="button" aria-label="Thao tác với ${h.so}">${icon('dots')}</button></td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Không có hợp đồng thế chấp khớp bộ lọc.</div>';
  }

  const covered = new Set(rows.filter((h) => h.active).flatMap((h) => h.assets));
  const free = M.focus.assets.filter((a) => !covered.has(a.ma));
  document.querySelector('#free').innerHTML = free.length ? `<div class="tw"><table style="margin-top:8px">
    <thead><tr><th>Tài sản</th><th class="r">Giá trị (VNĐ)</th><th>Định giá</th><th><span class="sr">Thao tác</span></th></tr></thead>
    <tbody>${free.map((a) => `<tr>
      <td class="c-who who-cell"><b>${fmt.esc(a.ten)}</b><span class="num">${a.ma} · ${a.loai}</span></td>
      <td class="c-amt r num ${a.value ? 'money' : 'dash'}">${fmt.money(a.value)}</td>
      <td class="c-due">${a.valued ? fmt.dmy(a.valued) : '<span class="pill neutral">Chưa định giá</span>'}</td>
      <td class="c-act r"><button class="btn ghost" type="button">Lập HĐTC</button></td>
    </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Mọi tài sản đã có hợp đồng thế chấp.</div>';

  document.addEventListener('click', (e) => {
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; render(); }
  });
  document.querySelector('#q').addEventListener('input', (e) => { q = e.target.value; render(); });
  render();
})();
