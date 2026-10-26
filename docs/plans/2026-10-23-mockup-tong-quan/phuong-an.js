(() => {
  const { M, fmt, icon, shell, customerBar, kpi } = window.UI;
  const X = window.MORE;
  shell();
  const P = X.plan;
  const B = X.bctc;
  const h = M.focus.hdtd[0];
  const d1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const tr = (v) => fmt.money(Math.round(v * 10) / 10);
  let revenue = P.revenue[1];
  let turnover = P.turnover[1];
  let kind = 'hmtd';

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Phương án kinh doanh</h1>
      <div class="actions">
        <div class="seg" role="group" aria-label="Loại hồ sơ" id="kind"></div>
        <button class="btn primary" type="button">Xuất tờ trình (.xlsx)</button>
      </div>
    </div>
    ${customerBar([['Hạn mức đang cấp', fmt.money(h.limit)], ['HĐTD hết hiệu lực', fmt.dmy(h.expiry)]])}
    <section class="kpis" id="kpis" aria-label="Kết quả phương án"></section>
    <div class="split" style="margin-top:0">
      <section class="card" aria-labelledby="h-need">
        <div class="card-head"><h2 id="h-need">Nhu cầu vốn lưu động</h2><span class="meta">Triệu đồng</span></div>
        <div class="tw" id="need" style="margin-top:8px"></div>
      </section>
      <section class="card" aria-labelledby="h-bs">
        <div class="card-head"><h2 id="h-bs">Cân đối tài chính</h2><span class="meta">31/12/${B.year} · triệu đồng</span></div>
        <div class="card-body" id="bs"></div>
      </section>
    </div>`;

  function compute() {
    const costRatio = P.cashCost[0] / P.revenue[0];
    const cost = [P.cashCost[0], revenue * costRatio];
    const profit = [P.netProfit[0], revenue * (P.netProfit[1] / P.revenue[1])];
    const need = [cost[0] / P.turnover[0], cost[1] / turnover];
    const others = [0, 1].map((i) => P.equity[i] + P.otherBanks[i] + P.payables[i]);
    const ask = need.map((n, i) => n - others[i]);
    return { cost, profit, need, ask, proposal: Math.floor(ask[1] / 100) * 100 };
  }

  function render() {
    const r = compute();
    document.querySelector('#kind').innerHTML = [['hmtd', 'Cấp hạn mức'], ['ctl', 'Cho vay từng lần']].map(([id, l]) => `<button type="button" data-kind="${id}" aria-pressed="${kind === id}">${l}</button>`).join('');
    document.querySelector('#kpis').innerHTML = [
      kpi({ tone: 'neutral', label: 'Doanh thu kế hoạch', value: tr(revenue), unit: 'triệu', note: `Tăng ${fmt.pct((revenue / P.revenue[0] - 1) * 100)} so với ${P.years[0]}` }),
      kpi({ tone: 'neutral', label: 'Lợi nhuận ròng kế hoạch', value: tr(r.profit[1]), unit: 'triệu', note: `Biên ròng ${fmt.pct((r.profit[1] / revenue) * 100)}` }),
      kpi({ tone: 'neutral', label: 'Nhu cầu vốn lưu động', value: tr(r.need[1]), unit: 'triệu', note: `Vòng quay ${d1.format(turnover)} vòng/năm` }),
      kpi({ tone: 'accent', label: 'Hạn mức đề xuất', value: fmt.money(r.proposal), unit: 'triệu', note: r.proposal * 1e6 === h.limit ? 'Bằng hạn mức đang cấp' : `${r.proposal * 1e6 > h.limit ? 'Tăng' : 'Giảm'} ${fmt.money(Math.abs(r.proposal - h.limit / 1e6))} triệu so với đang cấp` }),
    ].join('');
    const row = (label, unit, a, b, opts = {}) => `<tr class="${opts.total ? 'total-row' : ''}">
      <td class="c-who">${label}</td><td class="muted opt">${unit}</td>
      <td class="r num">${opts.fmt ? opts.fmt(a) : tr(a)}</td>
      <td class="r num">${opts.input ? `<input class="cell-input num" data-in="${opts.input}" value="${opts.fmt ? opts.fmt(b) : tr(b)}" aria-label="${label} kỳ kế hoạch">` : opts.fmt ? opts.fmt(b) : tr(b)}</td>
      <td class="r num ${b - a < 0 ? 'late' : ''}">${b - a > 0 ? '+' : b - a < 0 ? '−' : ''}${opts.fmt ? opts.fmt(Math.abs(b - a)) : tr(Math.abs(b - a))}</td></tr>`;
    document.querySelector('#need').innerHTML = `<table class="keep">
      <thead><tr><th>Khoản mục</th><th class="opt">Đvt</th><th class="r">${P.years[0]}</th><th class="r">${P.years[1]}</th><th class="r">Tăng/giảm</th></tr></thead>
      <tbody>
        ${row('Doanh thu thuần', 'triệu', P.revenue[0], revenue, { input: 'rev' })}
        ${row('Tổng chi phí bằng tiền', 'triệu', r.cost[0], r.cost[1])}
        ${row('Lợi nhuận ròng', 'triệu', r.profit[0], r.profit[1])}
        ${row('Vòng quay vốn lưu động', 'vòng', P.turnover[0], turnover, { input: 'turn', fmt: (v) => d1.format(v) })}
        ${row('Nhu cầu vốn lưu động bình quân', 'triệu', r.need[0], r.need[1])}
        ${row('Vốn tự có tham gia', 'triệu', P.equity[0], P.equity[1])}
        ${row('Vay tại TCTD khác', 'triệu', P.otherBanks[0], P.otherBanks[1])}
        ${row('Phải trả người bán', 'triệu', P.payables[0], P.payables[1])}
        ${row('Đề nghị cấp HMTD tại Vietbank', 'triệu', r.ask[0], r.ask[1], { total: true })}
      </tbody></table>
      <div class="card-foot"><span class="num">Làm tròn xuống bậc 100 triệu: đề xuất <b>${fmt.money(r.proposal)}</b> triệu</span></div>`;
    const sumCol = (rows) => rows.reduce((s, x) => s + x[2], 0);
    const cur = sumCol(B.assets.filter((a) => B.current.includes(a[0])));
    const totalA = sumCol(B.assets);
    const liab = sumCol(B.liabilities);
    const eq = sumCol(B.equity);
    document.querySelector('#bs').innerHTML = `<ul class="facts num">
      <li><span>Tài sản ngắn hạn</span><b>${fmt.money(cur)}</b></li>
      <li><span>Tài sản dài hạn</span><b>${fmt.money(totalA - cur)}</b></li>
      <li><span><b>Tổng tài sản</b></span><b>${fmt.money(totalA)}</b></li>
      <li><span>Nợ phải trả</span><b>${fmt.money(liab)}</b></li>
      <li><span>Vốn chủ sở hữu</span><b>${fmt.money(eq)}</b></li>
      <li><span><b>Tổng nguồn vốn</b></span><b>${fmt.money(liab + eq)}</b></li>
    </ul>
    <p style="margin:12px 0 0">${totalA === liab + eq ? '<span class="pill pos">Tài sản khớp nguồn vốn</span>' : '<span class="pill neg">Tài sản lệch nguồn vốn</span>'}</p>
    <p class="muted" style="margin:12px 0 0;font-size:13px">Lấy từ <a class="name-link" href="bctc.html">BCTC doanh nghiệp năm ${B.year}</a></p>`;
  }

  document.addEventListener('change', (e) => {
    const i = e.target.closest('[data-in]');
    if (!i) return;
    const v = Number(i.value.replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(v) || v <= 0) { render(); return; }
    if (i.dataset.in === 'rev') revenue = v; else turnover = v;
    render();
  });
  document.addEventListener('click', (e) => {
    const k = e.target.closest('[data-kind]');
    if (k) { kind = k.dataset.kind; render(); }
  });
  render();
})();
