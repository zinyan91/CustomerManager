(() => {
  const { fmt, icon, shell } = window.UI;
  const R = window.REF.cardPolicies;
  shell();
  let q = '';
  let group = 'all';
  let sel = R[1].code;
  const short = (code) => code.split('_')[0];
  const isSecured = (p) => /_TSBD_/.test(p.code);

  document.querySelector('#main').innerHTML = `
    <div class="title-row"><h1>Chính sách thẻ</h1></div>
    <div class="split" style="margin-top:0">
      <section class="card" aria-labelledby="h-list">
        <h2 id="h-list" class="sr">Mã chính sách phát hành thẻ</h2>
        <div class="card-toolbar">
          <div class="left">
            <label class="input">${icon('search')}<input id="q" type="search" placeholder="Tìm theo mã hoặc đối tượng" aria-label="Tìm chính sách thẻ"></label>
            <div class="seg" role="group" aria-label="Nhóm chính sách" id="groups"></div>
          </div>
          <span class="total num" id="total"></span>
        </div>
        <div class="tw" id="table"></div>
      </section>
      <section class="card" aria-labelledby="h-rule" id="detail"></section>
    </div>`;

  function render() {
    document.querySelector('#groups').innerHTML = [['all', 'Tất cả'], ['tsbd', 'Có TSBĐ'], ['tc', 'Tín chấp']].map(([id, l]) => `<button type="button" data-g="${id}" aria-pressed="${group === id}">${l}</button>`).join('');
    const list = R
      .filter((p) => group === 'all' || (group === 'tsbd') === isSecured(p))
      .filter((p) => !q || `${p.code} ${p.subject}`.toLowerCase().includes(q.toLowerCase()));
    document.querySelector('#total').textContent = `${list.length} / ${R.length} mã`;
    document.querySelector('#table').innerHTML = list.length ? `<table>
      <thead><tr><th>Mã</th><th>Đối tượng áp dụng</th><th class="r">Hạn mức tối đa (VNĐ)</th></tr></thead>
      <tbody>${list.map((p) => `<tr class="link-row ${p.code === sel ? 'selected' : ''}" data-code="${p.code}">
        <td class="c-amt num"><b>${short(p.code)}</b><span class="sub-line">${isSecured(p) ? 'Có TSBĐ' : 'Tín chấp'}</span></td>
        <td class="c-who wrap" style="max-width:420px">${fmt.esc(p.subject)}</td>
        <td class="c-due r num">${p.maxLimit ? fmt.money(p.maxLimit) : '<span class="muted">Theo tiền gửi</span>'}</td>
      </tr>`).join('')}</tbody></table>` : '<div class="empty">Không có mã chính sách khớp từ khoá.</div>';
    const p = R.find((x) => x.code === sel);
    document.querySelector('#detail').innerHTML = `
      <div class="card-head"><h2 id="h-rule" class="num">${short(p.code)}</h2><span class="pill ${isSecured(p) ? 'pos' : 'neutral'}">${isSecured(p) ? 'Có TSBĐ' : 'Tín chấp'}</span></div>
      <div class="card-body">
        <p class="num muted" style="margin:0;font-size:13px;word-break:break-word">${p.code}</p>
        <p style="margin:8px 0 0">${fmt.esc(p.subject)}</p>
        <ul class="facts num" style="margin-top:12px">
          <li><span>Hạn mức tối đa</span><b>${p.maxLimit ? `${fmt.money(p.maxLimit)} VNĐ` : 'Không giới hạn'}</b></li>
        </ul>
        <p class="sub-title" style="margin-top:16px">Cách tính hạn mức</p>
        <p style="margin:0">${fmt.esc(p.limitRule)}</p>
        ${p.conditions.length ? `<p class="sub-title" style="margin-top:16px">Điều kiện</p><ul class="bullets">${p.conditions.map((c) => `<li>${fmt.esc(c)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-g]');
    if (g) { group = g.dataset.g; render(); return; }
    const r = e.target.closest('[data-code]');
    if (r) { sel = r.dataset.code; render(); }
  });
  document.querySelector('#q').addEventListener('input', (e) => { q = e.target.value; render(); });
  render();
})();
