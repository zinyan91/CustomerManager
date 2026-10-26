(() => {
  const { fmt, icon, shell } = window.UI;
  const X = window.MORE;
  shell();
  let stage = null;
  let q = '';

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Báo cáo tiến độ</h1>
      <div class="actions">
        <button class="btn" type="button">${icon('users')}${X.team.name}${icon('chev')}</button>
        <button class="btn" type="button">Tháng 10/2026${icon('chev')}</button>
        <button class="btn primary" type="button">${icon('plus')}Thêm hồ sơ</button>
      </div>
    </div>
    <section class="card" aria-labelledby="h-stage" style="margin-bottom:var(--gap)">
      <div class="card-head"><h2 id="h-stage">Hồ sơ theo bước</h2><span class="meta" id="stage-meta"></span></div>
      <div class="card-body"><div class="stages" id="stages"></div></div>
    </section>
    <section class="card" aria-labelledby="h-list">
      <h2 id="h-list" class="sr">Danh sách hồ sơ</h2>
      <div class="card-toolbar">
        <div class="left"><label class="input">${icon('search')}<input id="q" type="search" placeholder="Tìm khách hàng hoặc nhân sự" aria-label="Tìm hồ sơ"></label></div>
        <span class="total num" id="total"></span>
      </div>
      <div class="tw" id="table"></div>
    </section>`;

  function render() {
    const counts = X.stages.map((s) => X.progress.filter((p) => p.stage === s).length);
    const amount = (s) => X.progress.filter((p) => p.stage === s).reduce((a, p) => a + p.amount, 0);
    document.querySelector('#stage-meta').textContent = stage ? `Đang lọc: ${stage}` : `${X.progress.length} hồ sơ · ${X.stages.length} bước`;
    document.querySelector('#stages').innerHTML = X.stages.map((s, i) => `
      <button type="button" class="stage ${counts[i] ? '' : 'empty-stage'} ${s === 'Đã giải ngân' ? 'last' : ''}" data-stage="${s}" aria-pressed="${stage === s}">
        <b class="num">${counts[i]}</b><span>${s}</span>${counts[i] ? `<small class="num">${fmt.money(amount(s) / 1e6)} tr</small>` : ''}
      </button>`).join('');
    const list = X.progress
      .filter((p) => !stage || p.stage === stage)
      .filter((p) => !q || `${p.kh} ${p.who}`.toLowerCase().includes(q.toLowerCase()));
    const tot = ['amount', 'cards', 'fees', 'ins'].map((k) => list.reduce((s, p) => s + p[k], 0));
    document.querySelector('#total').textContent = `${list.length} hồ sơ`;
    const stageTone = (s) => (s === 'Đã giải ngân' ? 'pos' : ['Chờ phê duyệt', 'Đã có phê duyệt', 'Đang công chứng', 'Chờ giải ngân'].includes(s) ? 'warn' : 'neutral');
    document.querySelector('#table').innerHTML = list.length ? `<table>
      <thead><tr><th>Khách hàng</th><th class="opt">Nhân sự</th><th class="opt">Loại hồ sơ</th><th class="r">Số tiền (VNĐ)</th><th class="r opt">Thẻ</th><th class="r opt">Phí (VNĐ)</th><th class="r opt">Bảo hiểm (VNĐ)</th><th>Tiến độ</th><th><span class="sr">Thao tác</span></th></tr></thead>
      <tbody>${list.map((p) => `<tr>
        <td class="c-who who-cell"><b>${fmt.esc(p.kh)}</b><span>KH ${p.kind.toLowerCase()}</span></td>
        <td class="opt">${p.who}</td>
        <td class="opt wrap">${p.type}<span class="sub-line">${p.term}</span></td>
        <td class="c-amt r num money">${fmt.money(p.amount)}</td>
        <td class="r num opt ${p.cards ? '' : 'dash'}">${p.cards}</td>
        <td class="r num opt ${p.fees ? '' : 'dash'}">${fmt.money(p.fees)}</td>
        <td class="r num opt ${p.ins ? '' : 'dash'}">${fmt.money(p.ins)}</td>
        <td class="c-due"><span class="pill ${stageTone(p.stage)}">${p.stage}</span></td>
        <td class="c-act r"><button class="btn ghost" type="button">Sửa</button></td>
      </tr>`).join('')}
      <tr class="total-row"><td>TỔNG CỘNG</td><td class="opt"></td><td class="opt"></td><td class="r num">${fmt.money(tot[0])}</td><td class="r num opt">${tot[1]}</td><td class="r num opt">${fmt.money(tot[2])}</td><td class="r num opt">${fmt.money(tot[3])}</td><td colspan="2"></td></tr>
      </tbody></table>` : '<div class="empty">Không có hồ sơ ở bước này.</div>';
  }

  document.addEventListener('click', (e) => {
    const s = e.target.closest('[data-stage]');
    if (s) { stage = stage === s.dataset.stage ? null : s.dataset.stage; render(); }
  });
  document.querySelector('#q').addEventListener('input', (e) => { q = e.target.value; render(); });
  render();
})();
