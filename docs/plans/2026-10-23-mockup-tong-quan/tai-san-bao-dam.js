(() => {
  const { M, fmt, icon, shell, customerBar, assetStatus, capacityOf, outstandingOf } = window.UI;
  shell();
  const F = M.focus;
  const kh = M.customers.find((c) => c.cif === F.cif).kh;
  const debt = outstandingOf(kh);

  const assets = F.assets.map((a) => ({ ...a, st: assetStatus(a), cap: capacityOf(a), maxCap: a.value ? Math.round((a.value * a.ltv) / 100) : null }));
  const total = assets.reduce((s, a) => s + (a.value || 0), 0);
  const capacity = assets.reduce((s, a) => s + a.cap, 0);
  const short = debt - capacity;
  const recoverable = assets.filter((a) => a.st.key === 'expired');

  const filters = [
    { id: 'all', tone: 'collateral', label: 'Tổng giá trị TSBĐ', test: () => true },
    { id: 'expired', tone: 'neg', label: 'Hết hiệu lực định giá', test: (a) => a.st.key === 'expired' },
    { id: 'soon', tone: 'warn', label: 'Sắp hết hạn định giá', test: (a) => a.st.key === 'soon' },
    { id: 'none', tone: 'neutral', label: 'Chưa định giá', test: (a) => a.st.key === 'none' },
  ];
  let filter = 'all';

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Tài sản bảo đảm</h1>
      <div class="actions"><button class="btn primary" type="button">${icon('plus')}Thêm tài sản</button></div>
    </div>
    ${customerBar([['Dư nợ hiện hành', fmt.money(debt)], ['Sức cấp tín dụng', fmt.money(capacity), short > 0 ? 'neg' : '']])}
    <section class="kpis" id="kpis" aria-label="Lọc theo hiệu lực định giá"></section>
    <section class="card" aria-labelledby="h-cover" style="margin-bottom:var(--gap)">
      <div class="card-head"><h2 id="h-cover">Bảo đảm cho dư nợ</h2><span class="meta">Chỉ tính tài sản còn hiệu lực định giá</span></div>
      <div class="coverage" id="coverage"></div>
    </section>
    <section class="card" aria-labelledby="h-assets">
      <div class="card-head"><h2 id="h-assets">Danh sách tài sản</h2><span class="meta num" id="count"></span></div>
      <div id="table"></div>
    </section>`;

  function renderCoverage() {
    const scale = Math.max(debt, capacity) * 1.08;
    const x = (v) => `${(v / scale) * 100}%`;
    let at = 0;
    const segs = assets.filter((a) => a.cap).map((a) => {
      const s = `<span class="seg" style="left:${x(at)};width:${x(a.cap)};background:var(--t-kpi-collateral)">${fmt.esc(a.ten.split(',')[0])}</span>`;
      at += a.cap;
      return s;
    }).join('');
    const gap = short > 0 ? `<span class="gap" style="left:${x(capacity)};width:${x(short)}"></span>` : '';
    const best = recoverable.sort((a, b) => b.maxCap - a.maxCap)[0];
    document.querySelector('#coverage').innerHTML = `
      <div class="coverage-scale" role="img" aria-label="Sức cấp ${fmt.money(capacity)} so với dư nợ ${fmt.money(debt)}">${segs}${gap}<span class="marker" style="left:${x(debt)}"></span></div>
      <div class="coverage-labels num"><span style="left:0">Sức cấp ${fmt.money(capacity)}</span><span style="right:${(1 - debt / scale) * 100}%">Dư nợ ${fmt.money(debt)}</span></div>
      <p>${short > 0 ? `<strong>Thiếu ${fmt.money(short)} VNĐ bảo đảm.</strong> ` : 'Sức cấp đủ cho dư nợ. '}${best ? `Định giá lại ${fmt.esc(best.ten.split(',')[0])} sẽ thêm tối đa ${fmt.money(best.maxCap)} VNĐ sức cấp.` : ''}</p>`;
  }

  function renderKpis() {
    document.querySelector('#kpis').innerHTML = filters.map((f) => {
      const list = assets.filter(f.test);
      const value = f.id === 'all' ? fmt.money(total) : list.length;
      const unit = f.id === 'all' ? 'VNĐ' : 'tài sản';
      const note = f.id === 'all' ? `${assets.length} tài sản` : f.id === 'none' ? (list.length ? 'Chưa có giá trị để tính sức cấp' : 'Đã định giá đủ') : list.length ? `Giá trị ${fmt.money(list.reduce((s, a) => s + (a.value || 0), 0))} VNĐ` : 'Không có';
      return `<button type="button" class="kpi" data-metric-tone="${f.tone}" data-filter="${f.id}" aria-pressed="${filter === f.id}">
        <div class="kpi-label">${f.label}</div>
        <div class="kpi-value num">${value}<small>${unit}</small></div>
        <div class="kpi-note num">${note}</div>
      </button>`;
    }).join('');
  }

  function renderTable() {
    const list = assets.filter(filters.find((f) => f.id === filter).test);
    document.querySelector('#count').textContent = `${list.length} / ${assets.length} tài sản`;
    const action = (a) => a.st.key === 'expired' || a.st.key === 'soon' ? 'Định giá lại' : a.st.key === 'none' ? 'Định giá' : 'Sửa';
    document.querySelector('#table').innerHTML = `<div class="tw" style="margin-top:8px"><table>
      <thead><tr><th>Tài sản</th><th class="r opt">Giá trị (VNĐ)</th><th class="r">Sức cấp (VNĐ)</th><th>Hạn định giá</th><th class="opt">HĐTC</th><th>Hiệu lực định giá</th><th><span class="sr">Thao tác</span></th></tr></thead>
      <tbody>${list.map((a) => `
        <tr>
          <td class="c-who who-cell"><b>${fmt.esc(a.ten)}</b><span class="num">${a.ma} · ${a.loai}</span></td>
          <td class="r num opt ${a.value ? '' : 'dash'}">${fmt.money(a.value)}</td>
                    <td class="c-amt r">${a.cap ? `<span class="money num">${fmt.money(a.cap)}</span><span class="sub-line num">LTV ${a.ltv}%</span>` : a.maxCap ? `<span class="num dash">${fmt.money(a.maxCap)}</span><span class="sub-line">Không tính, hết hạn</span>` : `<span class="dash">—</span><span class="sub-line num">LTV ${a.ltv}%</span>`}</td>
          <td class="c-due">${a.next ? `<span class="num">${fmt.dmy(a.next)}</span><span class="sub-line num">Định giá ${fmt.dmy(a.valued)}</span>` : '<span class="dash">—</span>'}</td>
          <td class="num opt ${a.hdtc ? 'muted' : 'dash'}">${a.hdtc || '—'}</td>
          <td><span class="pill ${a.st.tone}">${a.st.key === 'soon' ? `Còn ${a.st.days} ngày` : a.st.key === 'ok' ? 'Còn hiệu lực' : a.st.label}</span></td>
          <td class="c-act r"><button class="btn ghost" type="button">${action(a)}</button></td>
        </tr>`).join('')}</tbody>
    </table></div>
    <div class="card-foot"><span class="num">Tổng giá trị ${fmt.money(list.reduce((s, a) => s + (a.value || 0), 0))} VNĐ · sức cấp ${fmt.money(list.reduce((s, a) => s + a.cap, 0))} VNĐ</span></div>`;
  }

  document.addEventListener('click', (e) => {
    const k = e.target.closest('[data-filter]');
    if (k) { filter = k.dataset.filter; renderKpis(); renderTable(); }
  });
  renderCoverage();
  renderKpis();
  renderTable();
})();
