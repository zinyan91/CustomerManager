(() => {
  const { M, fmt, days, icon, shell, kpi } = window.UI;
  const D = window.REF.deposit;
  shell();
  const d2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (r) => `${d2.format(r * 100)}%`;
  const BANDS = [...new Set(D.tiers.filter((t) => t.channel === 'quay').map((t) => t.balance))];
  const FLOORS = [0, 200e6, 500e6, 2e9, 3e9, 8e9];
  const TENORS = [6, 7, 9, 12];
  const PAYOUT = { cuoi_ky: 'Cuối kỳ', hang_quy: 'Quý', hang_thang: 'Tháng', tra_truoc: 'Trả trước' };
  const s = { amount: 650000000, tenor: 6, channel: 'quay' };
  const left = days(D.to);

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Chào lãi suất</h1>
      <div class="actions"><button class="btn primary" type="button">Xuất PDF gửi khách hàng</button></div>
    </div>
    <section class="custbar" aria-label="Chương trình đang áp dụng">
      <div class="custbar-id"><b>${D.name}</b><span class="num">${D.so} · khách hàng cá nhân · kỳ hạn 6, 7, 9, 12 tháng</span></div>
      <div class="custbar-fig"><span>Hiệu lực</span><b class="num">${fmt.dmy(D.from)} – ${fmt.dmy(D.to)}</b></div>
      <span class="pill ${left <= 0 ? 'warn' : 'pos'}">${left < 0 ? 'Hết hiệu lực' : left === 0 ? 'Hết hiệu lực sau hôm nay' : `Còn ${left} ngày`}</span>
      <button class="btn" type="button">${icon('swap')}Đổi chương trình</button>
    </section>
    <section class="card" aria-labelledby="h-calc" style="margin-bottom:var(--gap)">
      <div class="card-head"><h2 id="h-calc">Tính lãi tiền gửi dự kiến</h2><span class="meta">Actual/365 · lãi cuối kỳ</span></div>
      <div class="card-body calc">
        <label class="field">Số tiền gửi (VNĐ)<input class="cell-input num" id="amount" value="${fmt.money(s.amount)}"></label>
        <div class="field">Kỳ hạn<div class="seg" role="group" aria-label="Kỳ hạn" id="tenors"></div></div>
        <div class="field">Kênh gửi<div class="seg" role="group" aria-label="Kênh gửi" id="channels"></div></div>
      </div>
      <div class="kpis three inset" id="result"></div>
    </section>
    <div class="split three-two" style="margin-top:0">
      <section class="card" aria-labelledby="h-rates">
        <div class="card-head"><h2 id="h-rates">Bảng lãi suất tiền gửi</h2><span class="meta">%/năm · lãi cuối kỳ</span></div>
        <div class="tw" id="rates" style="margin-top:8px"></div>
      </section>
      <section class="card" aria-labelledby="h-vof">
        <div class="card-head"><h2 id="h-vof">FTP mua (VOF)</h2><span class="meta">%/năm · theo cách trả lãi</span></div>
        <div class="tw" id="vof" style="margin-top:8px"></div>
      </section>
    </div>`;

  const bandOf = (amount) => BANDS[FLOORS.filter((f) => amount >= f).length - 1];
  const rateOf = () => D.tiers.find((t) => t.channel === s.channel && t.tenor === s.tenor && (s.channel === 'online' || t.balance === bandOf(s.amount)));

  function render() {
    document.querySelector('#tenors').innerHTML = TENORS.map((t) => `<button type="button" data-tenor="${t}" aria-pressed="${s.tenor === t}">${t} tháng</button>`).join('');
    document.querySelector('#channels').innerHTML = [['quay', 'Tại quầy'], ['online', 'Online']].map(([id, l]) => `<button type="button" data-ch="${id}" aria-pressed="${s.channel === id}">${l}</button>`).join('');
    const t = rateOf();
    const start = new Date(`${M.today}T00:00:00Z`);
    const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + s.tenor);
    const dd = Math.round((end - start) / 86400000);
    const interest = Math.round((s.amount * t.rate * dd) / 365);
    const vof = D.tiers.find((x) => x.channel === 'ftp' && x.tenor === s.tenor && x.payout === 'cuoi_ky');
    document.querySelector('#result').innerHTML = [
      kpi({ tone: 'accent', label: 'Lãi suất chào', value: pct(t.rate), note: s.channel === 'online' ? 'Kênh online, mọi quy mô' : bandOf(s.amount) }),
      kpi({ tone: 'pos', label: 'Tiền lãi dự kiến', value: fmt.money(interest), unit: 'VNĐ', note: `${dd} ngày, đáo hạn ${fmt.dmy(end.toISOString().slice(0, 10))}` }),
      kpi({ tone: 'neutral', label: 'Chênh lệch với VOF', value: pct(vof.rate - t.rate), note: `VOF ${s.tenor} tháng cuối kỳ ${pct(vof.rate)}` }),
    ].join('');
    const cell = (tier, on) => `<td class="r num ${on ? 'cell-on' : ''}">${tier ? d2.format(tier.rate * 100) : '—'}</td>`;
    const band = s.channel === 'quay' ? bandOf(s.amount) : null;
    document.querySelector('#rates').innerHTML = `<table class="keep">
      <thead><tr><th>Quy mô khách hàng</th>${TENORS.map((t) => `<th class="r">${t} tháng</th>`).join('')}</tr></thead>
      <tbody>${BANDS.map((b) => `<tr><td class="c-who wrap" style="max-width:none">${b.replace('Quy mô KH', 'quy mô').replace(/^quy mô/, 'Quy mô')}</td>${TENORS.map((t) => cell(D.tiers.find((x) => x.channel === 'quay' && x.balance === b && x.tenor === t), band === b && s.tenor === t)).join('')}</tr>`).join('')}
      <tr><td class="c-who"><b>Online</b><span class="sub-line">Mọi quy mô</span></td>${TENORS.map((t) => cell(D.tiers.find((x) => x.channel === 'online' && x.tenor === t), s.channel === 'online' && s.tenor === t)).join('')}</tr></tbody></table>`;
    document.querySelector('#vof').innerHTML = `<table class="keep">
      <thead><tr><th>Kỳ hạn</th>${Object.values(PAYOUT).map((p) => `<th class="r">${p}</th>`).join('')}</tr></thead>
      <tbody>${TENORS.map((t) => `<tr><td class="num">${t} tháng</td>${Object.keys(PAYOUT).map((p) => cell(D.tiers.find((x) => x.channel === 'ftp' && x.tenor === t && x.payout === p), t === s.tenor && p === 'cuoi_ky')).join('')}</tr>`).join('')}</tbody></table>`;
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tenor]');
    if (t) { s.tenor = Number(t.dataset.tenor); render(); return; }
    const c = e.target.closest('[data-ch]');
    if (c) { s.channel = c.dataset.ch; render(); }
  });
  document.querySelector('#amount').addEventListener('change', (e) => {
    const v = Number(e.target.value.replace(/\./g, ''));
    if (Number.isFinite(v) && v > 0) s.amount = v;
    e.target.value = fmt.money(s.amount);
    render();
  });
  render();
})();
