(() => {
  const { fmt, shell, kpi } = window.UI;
  shell();
  const d2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const GROUPS = [
    ['Khoản vay và thu nợ', [['loan', 'Tính lịch thu nợ khoản vay'], ['dti', 'Thẩm định hạn mức (DTI/LTV)'], ['prepay', 'Phân tích trả nợ trước hạn'], ['compare', 'So sánh gốc đều và niên kim']]],
    ['Cho vay cầm cố STK', [['stk1', 'Cầm cố sổ tiết kiệm đơn'], ['stk2', 'Cầm cố sổ tiết kiệm tái tục']]],
    ['Lãi suất và phạt quá hạn', [['reduce', 'Tính giảm lãi suất vay'], ['convert', 'Quy đổi lãi phẳng và EAR'], ['penalty', 'Tính phạt chậm trả quá hạn']]],
  ];
  const s = { amount: 1800000000, months: 120, start: '2026-11-05', promoRate: 9.5, promoMonths: 12, base: 6.2, spread: 3.75, method: 'goc-deu' };
  let tool = 'loan';

  document.querySelector('#main').innerHTML = `
    <div class="title-row"><h1>Công cụ tính toán</h1></div>
    <div class="reports">
      <nav class="card report-list" aria-label="Danh sách công cụ" id="tools"></nav>
      <div id="tool"></div>
    </div>`;

  function schedule() {
    const rows = [];
    let left = s.amount;
    const after = s.base + s.spread;
    let prev = new Date(`${s.start}T00:00:00Z`);
    for (let k = 1; k <= s.months; k++) {
      const due = new Date(prev); due.setUTCMonth(due.getUTCMonth() + 1);
      const d = Math.round((due - prev) / 86400000);
      const rate = k <= s.promoMonths ? s.promoRate : after;
      const interest = Math.round((left * rate) / 100 * d / 365);
      let principal;
      if (s.method === 'goc-deu') principal = k === s.months ? left : Math.round(s.amount / s.months);
      else {
        const r = rate / 1200, n = s.months - k + 1;
        principal = k === s.months ? left : Math.round((left * r) / (1 - (1 + r) ** -n) - left * r);
      }
      rows.push({ k, due: due.toISOString().slice(0, 10), d, rate, principal, interest, total: principal + interest, left: left - principal });
      left -= principal;
      prev = due;
    }
    return rows;
  }

  function render() {
    document.querySelector('#tools').innerHTML = GROUPS.map(([g, items]) => `<p class="sub-title">${g}</p>${items.map(([id, l]) => `<button type="button" class="report ${id === tool ? 'on' : ''}" data-tool="${id}" aria-pressed="${id === tool}"><span>${l}</span></button>`).join('')}`).join('');
    const name = GROUPS.flatMap((g) => g[1]).find(([id]) => id === tool)[1];
    if (tool !== 'loan') {
      document.querySelector('#tool').innerHTML = `<section class="card" aria-labelledby="h-tool"><div class="card-head"><h2 id="h-tool">${name}</h2></div><div class="empty">Chưa dựng trong mockup.</div></section>`;
      return;
    }
    const rows = schedule();
    const sum = (f) => rows.reduce((a, r) => a + r[f], 0);
    console.assert(sum('principal') === s.amount, 'tổng gốc các kỳ phải bằng số tiền giải ngân');
    const shown = rows.length > 14 ? [...rows.slice(0, 12), null, rows[rows.length - 1]] : rows;
    const input = (k, label, val) => `<label>${label}<input class="cell-input num" data-s="${k}" value="${val}"></label>`;
    document.querySelector('#tool').innerHTML = `
      <section class="kpis three" aria-label="Kết quả">
        ${kpi({ tone: 'accent', label: 'Tổng tiền lãi', value: fmt.money(sum('interest')), unit: 'VNĐ', note: `${s.months} kỳ · ${s.method === 'goc-deu' ? 'gốc đều' : 'niên kim'}` })}
        ${kpi({ tone: 'neutral', label: 'Trả kỳ đầu', value: fmt.money(rows[0].total), unit: 'VNĐ', note: `Đến hạn ${fmt.dmy(rows[0].due)}` })}
        ${kpi({ tone: 'neutral', label: 'Trả kỳ cuối', value: fmt.money(rows[rows.length - 1].total), unit: 'VNĐ', note: `Đến hạn ${fmt.dmy(rows[rows.length - 1].due)}` })}
      </section>
      <div style="display:grid;gap:var(--gap)">
        <section class="card" aria-labelledby="h-in">
          <div class="card-head"><h2 id="h-in">Thông số khoản vay</h2></div>
          <div class="card-body form inline">
            <fieldset><legend>Khoản vay</legend>
              ${input('amount', 'Số tiền vay (VNĐ)', fmt.money(s.amount))}
              ${input('months', 'Thời hạn (tháng)', s.months)}
              <label>Ngày giải ngân<input class="cell-input num" data-s="start" value="${s.start}" type="date"></label>
            </fieldset>
            <fieldset><legend>Lãi suất (%/năm)</legend>
              ${input('promoRate', 'Lãi suất ưu đãi', d2.format(s.promoRate))}
              ${input('promoMonths', 'Số tháng ưu đãi', s.promoMonths)}
              ${input('base', 'Lãi suất cơ sở', d2.format(s.base))}
              ${input('spread', 'Biên độ', d2.format(s.spread))}
              <label>Sau ưu đãi<b class="num">${d2.format(s.base + s.spread)}</b></label>
            </fieldset>
            <fieldset><legend>Phương thức trả nợ</legend>
              <div class="seg" role="group" aria-label="Phương thức trả nợ">${[['goc-deu', 'Gốc đều'], ['nien-kim', 'Niên kim']].map(([id, l]) => `<button type="button" data-method="${id}" aria-pressed="${s.method === id}">${l}</button>`).join('')}</div>
            </fieldset>
          </div>
        </section>
        <section class="card" aria-labelledby="h-sched">
          <div class="card-head"><h2 id="h-sched">Lịch trả nợ</h2><button class="btn" type="button">Xuất Excel</button></div>
          <div class="tw" style="margin-top:8px"><table class="keep">
            <thead><tr><th class="r">Kỳ</th><th>Đến hạn</th><th class="r opt">Lãi suất</th><th class="r">Gốc</th><th class="r">Lãi</th><th class="r">Phải trả (VNĐ)</th><th class="r opt">Dư nợ còn lại</th></tr></thead>
            <tbody>${shown.map((r) => r ? `<tr><td class="r num muted">${r.k}</td><td class="c-due num">${fmt.dmy(r.due)}</td><td class="r num opt">${d2.format(r.rate)}%</td><td class="r num">${fmt.money(r.principal)}</td><td class="r num">${fmt.money(r.interest)}</td><td class="c-amt r num money">${fmt.money(r.total)}</td><td class="r num opt">${fmt.money(r.left)}</td></tr>` : `<tr><td colspan="7" class="muted" style="text-align:center">… ${rows.length - 13} kỳ …</td></tr>`).join('')}
            <tr class="total-row"><td>TỔNG CỘNG</td><td></td><td class="opt"></td><td class="r num">${fmt.money(sum('principal'))}</td><td class="r num">${fmt.money(sum('interest'))}</td><td class="r num">${fmt.money(sum('total'))}</td><td class="opt"></td></tr></tbody>
          </table></div>
        </section>
      </div>`;
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]');
    if (t) { tool = t.dataset.tool; render(); return; }
    const m = e.target.closest('[data-method]');
    if (m) { s.method = m.dataset.method; render(); }
  });
  document.addEventListener('change', (e) => {
    const i = e.target.closest('[data-s]');
    if (!i) return;
    const k = i.dataset.s;
    if (k === 'start') s.start = i.value || s.start;
    else {
      const v = Number(i.value.replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(v) && v > 0) s[k] = ['months', 'promoMonths'].includes(k) ? Math.round(v) : v;
    }
    render();
  });
  render();
})();
