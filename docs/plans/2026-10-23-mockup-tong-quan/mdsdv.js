(() => {
  const { fmt, icon, shell } = window.UI;
  const R = window.REF.mdsdv;
  shell();
  let q = 'gỗ';
  let sel = 'CEC31010';
  let copied = '';
  const words = (s) => s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

  document.querySelector('#main').innerHTML = `
    <div class="title-row"><h1>Mục đích sử dụng vốn</h1></div>
    <div class="split" style="margin-top:0">
      <section class="card" aria-labelledby="h-list">
        <h2 id="h-list" class="sr">Mã ngành cấp 5</h2>
        <div class="card-toolbar">
          <div class="left"><label class="input">${icon('search')}<input id="q" type="search" value="${q}" placeholder="Tìm theo ngành nghề hoặc mã" aria-label="Tìm mã ngành"></label></div>
          <span class="total num" id="total"></span>
        </div>
        <div class="tw" id="table"></div>
      </section>
      <section class="card" aria-labelledby="h-code" id="detail"></section>
    </div>`;

  function render() {
    const tokens = words(q);
    const list = R.rows.filter((r) => !tokens.length || tokens.every((t) => r.c5.toLowerCase().startsWith(t) || words(r.n5).includes(t)));
    document.querySelector('#total').textContent = `${list.length} / ${fmt.money(R.total)} mã cấp 5`;
    document.querySelector('#table').innerHTML = list.length ? `<table>
      <thead><tr><th>Mã cấp 5</th><th>Ngành nghề</th><th class="opt">Ngành kinh tế</th></tr></thead>
      <tbody>${list.map((r) => `<tr class="link-row ${r.c5 === sel ? 'selected' : ''}" data-c5="${r.c5}">
        <td class="c-amt num"><b>${r.c5}</b></td>
        <td class="c-who wrap" style="max-width:none">${fmt.esc(r.n5)}</td>
        <td class="opt muted clip">${fmt.esc(r.n2)}</td>
      </tr>`).join('')}</tbody></table>` : '<div class="empty">Không tìm thấy mã ngành phù hợp.</div>';
    const r = R.rows.find((x) => x.c5 === sel) || list[0];
    if (!r) { document.querySelector('#detail').innerHTML = ''; return; }
    const copy = (code) => `<button class="btn ghost" type="button" data-copy="${code}">${copied === code ? 'Đã chép' : 'Chép mã'}</button>`;
    document.querySelector('#detail').innerHTML = `
      <div class="card-head"><h2 id="h-code" class="num">${r.c5}</h2>${copy(r.c5)}</div>
      <div class="card-body">
        <p style="margin:0;font-weight:600">${fmt.esc(r.n5)}</p>
        <p class="muted" style="margin:4px 0 0;font-size:13px">${fmt.esc(r.n1)}</p>
        <p class="sub-title" style="margin-top:20px">Mã cấp 6 theo mục đích</p>
        <ul class="facts tall num">${R.purposes.map(([p, name]) => `<li><span class="wrap" style="white-space:normal">${fmt.esc(name)}</span><span style="display:flex;gap:8px;align-items:center;flex:none">${r.od.includes(r.c5 + p) ? '<span class="pill neutral">Thấu chi</span>' : ''}<b>${r.c5}${p}</b>${copy(r.c5 + p)}</span></li>`).join('')}</ul>
      </div>`;
  }

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) { copied = c.dataset.copy; navigator.clipboard?.writeText(copied).catch(() => {}); render(); return; }
    const row = e.target.closest('[data-c5]');
    if (row) { sel = row.dataset.c5; copied = ''; render(); }
  });
  document.querySelector('#q').addEventListener('input', (e) => { q = e.target.value; render(); });
  render();
})();
