(() => {
  const { fmt, icon, shell } = window.UI;
  const X = window.MORE;
  shell();
  const MONTH = 9; // tháng 10, chỉ số 0
  const isStock = (k) => k.name.includes('cuối kỳ');
  const sum = (a, n) => a.slice(0, n + 1).reduce((s, v) => s + v, 0);
  let mode = 'month';
  let sel = 0;

  const valueOf = (k) => mode === 'month' || isStock(k)
    ? { plan: k.plan[MONTH], actual: k.actual[MONTH] }
    : { plan: sum(k.plan, MONTH), actual: sum(k.actual, MONTH) };
  const unit = (k) => (k.unit === 'thẻ' ? 'thẻ' : 'triệu');
  const tone = (p) => (p >= 100 ? 'var(--t-pos)' : p >= 80 ? 'var(--t-warn)' : 'var(--t-neg)');

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Team &amp; KPI</h1>
      <div class="actions">
        <button class="btn" type="button">${icon('users')}${X.team.name}${icon('chev')}</button>
        <button class="btn" type="button">Tháng 10/2026${icon('chev')}</button>
        <div class="seg" role="group" aria-label="Kỳ báo cáo" id="mode"></div>
      </div>
    </div>
    <div class="split" style="margin-top:0">
      <section class="card" aria-labelledby="h-kpi">
        <div class="card-head"><h2 id="h-kpi">Chỉ tiêu</h2><span class="meta" id="period"></span></div>
        <div id="kpis"></div>
      </section>
      <section class="card" aria-labelledby="h-chart">
        <div class="card-head"><h2 id="h-chart">Kết quả theo tháng</h2><span class="legend"><span><i style="background:var(--t-accent)"></i>Thực hiện</span><span><i style="background:var(--t-ink);height:2px;vertical-align:3px"></i>Kế hoạch</span></span></div>
        <div class="card-body"><p class="sub-title" id="chart-title"></p><div class="strip" id="chart" style="padding:0"></div></div>
      </section>
    </div>
    <section class="card" aria-labelledby="h-mem" style="margin-top:var(--gap)">
      <div class="card-head"><h2 id="h-mem">Theo nhân sự</h2><span class="meta">Tháng 10/2026 · triệu đồng, thẻ</span></div>
      <div class="tw" id="members" style="margin-top:8px"></div>
    </section>`;

  function render() {
    document.querySelector('#mode').innerHTML = [['month', 'Tháng'], ['ytd', 'Lũy kế năm']].map(([id, l]) => `<button type="button" data-mode="${id}" aria-pressed="${mode === id}">${l}</button>`).join('');
    document.querySelector('#period').textContent = mode === 'month' ? 'Tháng 10/2026' : 'Từ 01/2026 đến 10/2026';
    document.querySelector('#kpis').innerHTML = `<div class="tw"><table>
      <thead><tr><th>Chỉ tiêu</th><th class="r">Kế hoạch</th><th class="r">Thực hiện</th><th>Hoàn thành</th></tr></thead>
      <tbody>${X.kpis.map((k, i) => {
        const v = valueOf(k);
        const p = (v.actual / v.plan) * 100;
        return `<tr class="link-row ${i === sel ? 'selected' : ''}" data-sel="${i}">
          <td class="c-who who-cell"><b>${k.name}</b><span>${unit(k)}${!isStock(k) && mode === 'ytd' ? ' · cộng dồn' : ''}</span></td>
          <td class="r num">${fmt.money(v.plan)}</td>
          <td class="c-amt r money num">${fmt.money(v.actual)}</td>
          <td class="c-due" style="min-width:150px"><div class="bullet"><span style="width:${Math.min(p, 120) / 1.2}%;background:${tone(p)}"></span><i style="left:${100 / 1.2}%"></i></div><span class="sub-line num" style="color:${tone(p)};font-weight:600">${fmt.pct(p)}</span></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
    drawChart();
    const totals = ['debt', 'deposit', 'cards', 'fees'].map((key) => X.members.reduce((s, m) => s + m[key], 0));
    console.assert(totals[0] === X.kpis[0].actual[MONTH] && totals[1] === X.kpis[1].actual[MONTH] && totals[2] === X.kpis[2].actual[MONTH] && totals[3] === X.kpis[3].actual[MONTH], 'nhân sự không cộng ra số team');
    document.querySelector('#members').innerHTML = `<table>
      <thead><tr><th>Nhân sự</th><th>Vai trò</th><th class="r">Dư nợ</th><th class="r">Huy động</th><th class="r">Thẻ mới</th><th class="r">Thu phí</th></tr></thead>
      <tbody>${X.members.map((m) => `<tr>
        <td class="c-who"><b>${m.name}</b></td><td class="muted">${m.role}</td>
        <td class="c-amt r num money">${fmt.money(m.debt)}</td><td class="r num">${fmt.money(m.deposit)}</td>
        <td class="r num ${m.cards ? '' : 'dash'}">${m.cards}</td><td class="r num">${fmt.money(m.fees)}</td>
      </tr>`).join('')}
      <tr class="total-row"><td colspan="2">TỔNG CỘNG</td>${totals.map((t) => `<td class="r num">${fmt.money(t)}</td>`).join('')}</tr></tbody></table>`;
  }

  function drawChart() {
    const k = X.kpis[sel];
    document.querySelector('#chart-title').textContent = `${k.name} (${unit(k)})`;
    const host = document.querySelector('#chart');
    const W = host.clientWidth, H = 210, left = 48, top = 10, bottom = 22, plotW = W - left, plotH = H - top - bottom;
    const max = Math.max(...k.plan, ...k.actual);
    const raw = max / 4, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const ticks = [];
    for (let v = 0; ; v += step) { ticks.push(v); if (v > max) break; }
    const topV = ticks[ticks.length - 1];
    const y = (v) => top + plotH - (v / topV) * plotH;
    const bw = (plotW / 10) * 0.5;
    const x = (i) => left + (i + 0.5) * (plotW / 10);
    let s = `<svg viewBox="0 0 ${W} ${H}" style="height:${H}px" role="img" aria-label="${k.name} theo tháng, thực hiện so với kế hoạch">`;
    ticks.forEach((t) => { s += `<line x1="${left}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)"/><text x="${left - 6}" y="${y(t) + 4}" text-anchor="end">${fmt.money(t)}</text>`; });
    k.actual.forEach((v, i) => {
      s += `<rect x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${top + plotH - y(v)}" fill="${i === MONTH ? 'var(--t-accent)' : 'var(--t-line-strong)'}"><title>Tháng ${i + 1}: ${fmt.money(v)} / kế hoạch ${fmt.money(k.plan[i])}</title></rect>`;
      s += `<line x1="${x(i) - bw / 2 - 4}" x2="${x(i) + bw / 2 + 4}" y1="${y(k.plan[i])}" y2="${y(k.plan[i])}" stroke="var(--t-ink)" stroke-width="2"/>`;
      s += `<text x="${x(i)}" y="${H - 4}" text-anchor="middle">T${i + 1}</text>`;
    });
    host.innerHTML = s + '</svg>';
  }

  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    if (m) { mode = m.dataset.mode; render(); return; }
    const r = e.target.closest('[data-sel]');
    if (r) { sel = Number(r.dataset.sel); render(); }
  });
  addEventListener('resize', drawChart);
  render();
})();
