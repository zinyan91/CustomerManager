(() => {
  const { M, fmt, shell, customerBar, kpi, outstandingOf } = window.UI;
  shell();
  const d2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const d1 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const YEAR = 2027;
  const p = { nh: { dnbq: 2500, rate: 8.2, ftp: 6.1 }, tdh: { dnbq: 1400, rate: 9.1, ftp: 7.2 } };
  const daysIn = (m) => new Date(Date.UTC(YEAR, m + 1, 0)).getUTCDate();
  const yearDays = Array.from({ length: 12 }, (_, m) => daysIn(m)).reduce((s, d) => s + d, 0);

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Dự phóng TOI</h1>
      <div class="actions"><button class="btn primary" type="button">Xuất Excel (.xlsx)</button></div>
    </div>
    ${customerBar([['Dư nợ hiện hành', fmt.money(outstandingOf(M.customers.find((c) => c.cif === M.focus.cif).kh))], ['Năm dự phóng', YEAR]])}
    <section class="kpis three" id="kpis" aria-label="Kết quả dự phóng"></section>
    <div class="split narrow-left" style="margin-top:0">
      <section class="card" aria-labelledby="h-in">
        <div class="card-head"><h2 id="h-in">Thông số</h2><span class="meta">Triệu đồng, %/năm</span></div>
        <div class="card-body form">
          ${[['nh', 'Cho vay ngắn hạn'], ['tdh', 'Cho vay trung dài hạn']].map(([k, l]) => `
            <fieldset><legend>${l}</legend>
              <label>Dư nợ bình quân<input class="cell-input num" data-k="${k}.dnbq" value="${fmt.money(p[k].dnbq)}"></label>
              <label>Lãi suất cho vay<input class="cell-input num" data-k="${k}.rate" value="${d2.format(p[k].rate)}"></label>
              <label>FTP<input class="cell-input num" data-k="${k}.ftp" value="${d2.format(p[k].ftp)}"></label>
            </fieldset>`).join('')}
        </div>
      </section>
      <section class="card" aria-labelledby="h-mon">
        <div class="card-head"><h2 id="h-mon">TOI theo tháng năm ${YEAR}</h2><span class="meta">Triệu đồng · Actual/365</span></div>
        <div class="tw" id="months" style="margin-top:8px"></div>
      </section>
    </div>`;

  function render() {
    const toi = (k, d) => (p[k].dnbq * (p[k].rate - p[k].ftp)) / 100 * d / 365;
    const rows = Array.from({ length: 12 }, (_, m) => { const d = daysIn(m); return { m: m + 1, d, nh: toi('nh', d), tdh: toi('tdh', d) }; });
    const r1 = (v) => Math.round(v * 10) / 10;
    rows.forEach((r) => { r.nh = r1(r.nh); r.tdh = r1(r.tdh); r.sum = r1(r.nh + r.tdh); });
    const tot = { nh: r1(rows.reduce((s, r) => s + r.nh, 0)), tdh: r1(rows.reduce((s, r) => s + r.tdh, 0)) };
    tot.sum = r1(tot.nh + tot.tdh);
    const dnbq = p.nh.dnbq + p.tdh.dnbq;
    document.querySelector('#kpis').innerHTML = [
      kpi({ tone: 'neutral', label: 'Dư nợ bình quân cả năm', value: fmt.money(dnbq), unit: 'triệu', note: `Ngắn hạn ${fmt.money(p.nh.dnbq)} · trung dài hạn ${fmt.money(p.tdh.dnbq)}` }),
      kpi({ tone: 'accent', label: 'Tổng TOI cho vay 12 tháng', value: d1.format(tot.sum), unit: 'triệu', note: `${yearDays} ngày tính lãi` }),
      kpi({ tone: tot.sum > 0 ? 'pos' : 'neg', label: 'TOI / dư nợ bình quân', value: fmt.pct((tot.sum / dnbq) * 100), cls: tot.sum > 0 ? '' : 'neg', note: tot.sum > 0 ? 'Chênh lệch dương sau FTP' : 'Lãi suất thấp hơn FTP' }),
    ].join('');
    document.querySelector('#months').innerHTML = `<table class="keep">
      <thead><tr><th>Tháng</th><th class="r">Số ngày</th><th class="r">Ngắn hạn</th><th class="r">Trung dài hạn</th><th class="r">Tổng TOI tháng</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td class="c-who num">Tháng ${r.m}</td><td class="r num muted">${r.d}</td><td class="r num">${d1.format(r.nh)}</td><td class="r num">${d1.format(r.tdh)}</td><td class="c-amt r num money">${d1.format(r.sum)}</td></tr>`).join('')}
      <tr class="total-row"><td>TỔNG CỘNG</td><td class="r num">${yearDays}</td><td class="r num">${d1.format(tot.nh)}</td><td class="r num">${d1.format(tot.tdh)}</td><td class="r num">${d1.format(tot.sum)}</td></tr></tbody></table>`;
  }
  document.addEventListener('change', (e) => {
    const i = e.target.closest('[data-k]');
    if (!i) return;
    const [k, f] = i.dataset.k.split('.');
    const v = Number(i.value.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) p[k][f] = v;
    render();
  });
  render();
})();
