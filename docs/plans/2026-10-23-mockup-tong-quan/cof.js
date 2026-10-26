(() => {
  const { fmt, icon, shell, kpi } = window.UI;
  const C = window.REF.cof;
  shell();
  const d2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const RESETS = ['3 tháng', '6 tháng', '9 tháng', '12 tháng', '24 tháng', '36 tháng'];
  const s = { row: C.rows.findIndex((r) => r.tenor.startsWith('> 12')), reset: 0, rate: 11.5 };

  document.querySelector('#main').innerHTML = `
    <div class="title-row"><h1>Mua bán vốn nội bộ</h1></div>
    <section class="custbar" aria-label="Văn bản đang áp dụng">
      <div class="custbar-id"><b>Giá mua vốn từ Hội sở (FTP bán, COF)</b><span class="num">${C.so} · cho vay VND thông thường, dư nợ nhóm 1 và nhóm 2</span></div>
      <div class="custbar-fig"><span>Áp dụng từ</span><b class="num">${fmt.dmy(C.from)}</b></div>
      <button class="btn" type="button">${icon('swap')}Đổi văn bản</button>
    </section>
    <section class="card" aria-labelledby="h-calc" style="margin-bottom:var(--gap)">
      <div class="card-head"><h2 id="h-calc">Margin khoản vay</h2></div>
      <div class="card-body calc">
        <label class="field">Kỳ hạn<select class="cell-input select" id="tenor">${C.rows.map((r, i) => `<option value="${i}">${r.tenor}</option>`).join('')}</select></label>
        <label class="field">Kỳ điều chỉnh lãi suất<select class="cell-input select" id="reset"><option value="-1">Cố định</option>${RESETS.map((r, i) => `<option value="${i}">${r}</option>`).join('')}</select></label>
        <label class="field">Lãi suất cho vay (%/năm)<input class="cell-input num" id="rate" value="${d2.format(s.rate)}"></label>
      </div>
      <div class="kpis two inset" id="result"></div>
    </section>
    <section class="card" aria-labelledby="h-table">
      <div class="card-head"><h2 id="h-table">Bảng COF</h2><span class="meta">%/năm</span></div>
      <div class="tw" id="table" style="margin-top:8px"></div>
    </section>`;

  function render() {
    const row = C.rows[s.row];
    if (s.reset >= 0 && row.reset[s.reset] == null) s.reset = -1;
    const cof = s.reset < 0 ? row.fixed : row.reset[s.reset];
    document.querySelector('#tenor').value = s.row;
    document.querySelector('#reset').value = s.reset;
    const margin = s.rate - cof * 100;
    document.querySelector('#result').innerHTML = [
      kpi({ tone: 'neutral', label: 'COF áp dụng', value: `${d2.format(cof * 100)}%`, note: `${row.tenor} · ${s.reset < 0 ? 'lãi suất cố định' : `điều chỉnh ${RESETS[s.reset]}`}` }),
      kpi({ tone: margin < 0 ? 'neg' : 'pos', label: 'Margin', value: `${margin < 0 ? '−' : '+'}${d2.format(Math.abs(margin))}%`, cls: margin < 0 ? 'neg' : '', note: margin < 0 ? 'Lãi suất cho vay thấp hơn giá vốn' : 'Lãi suất cho vay trên giá vốn' }),
    ].join('');
    const cell = (v, ri, ci) => `<td class="r num ${v == null ? 'dash' : 'pick'} ${ri === s.row && ci === s.reset ? 'cell-on' : ''}" ${v == null ? '' : `data-cell="${ri},${ci}"`}>${v == null ? '—' : d2.format(v * 100)}</td>`;
    document.querySelector('#table').innerHTML = `<table class="keep">
      <thead><tr><th>Kỳ hạn</th><th class="r">Cố định</th>${RESETS.map((r) => `<th class="r">Điều chỉnh ${r}</th>`).join('')}</tr></thead>
      <tbody>${C.rows.map((r, ri) => `<tr><td class="num">${r.tenor}</td>${cell(r.fixed, ri, -1)}${r.reset.map((v, ci) => cell(v, ri, ci)).join('')}</tr>`).join('')}</tbody></table>`;
  }
  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cell]');
    if (c) { const [r, k] = c.dataset.cell.split(',').map(Number); s.row = r; s.reset = k; render(); }
  });
  document.querySelector('#tenor').addEventListener('change', (e) => { s.row = Number(e.target.value); render(); });
  document.querySelector('#reset').addEventListener('change', (e) => { s.reset = Number(e.target.value); render(); });
  document.querySelector('#rate').addEventListener('change', (e) => {
    const v = Number(e.target.value.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) s.rate = v;
    e.target.value = d2.format(s.rate);
    render();
  });
  render();
})();
