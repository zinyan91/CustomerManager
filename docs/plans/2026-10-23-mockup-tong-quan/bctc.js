(() => {
  const { fmt, icon, shell, customerBar } = window.UI;
  const B = window.MORE.bctc;
  shell();
  const d2 = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const col = (rows, i) => rows.reduce((s, r) => s + r[i], 0);
  const cur = (i) => col(B.assets.filter((a) => B.current.includes(a[0])), i);
  const TA = [col(B.assets, 2), col(B.assets, 3)];
  const TL = [col(B.liabilities, 2), col(B.liabilities, 3)];
  const TE = [col(B.equity, 2), col(B.equity, 3)];
  const inv = B.assets.find((a) => a[0] === '140');
  const cash = B.assets.find((a) => a[0] === '110');
  const I = B.income;
  let tab = 'b01a';

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>BCTC doanh nghiệp</h1>
      <div class="actions">
        <button class="btn" type="button">${icon('bot')}Phân tích bằng Trợ lý AI</button>
        <button class="btn" type="button">Tải lên Excel</button>
        <button class="btn primary" type="button">Xuất Excel (.xlsx)</button>
      </div>
    </div>
    ${customerBar([['Năm tài chính', B.year], ['Chế độ kế toán', 'TT 133/2016']])}
    <div class="split" style="margin-top:0">
      <section class="card" aria-labelledby="h-st">
        <div class="card-head"><h2 id="h-st" class="sr">Biểu mẫu báo cáo</h2></div>
        <div class="tabs" role="tablist" id="tabs" style="margin-top:0"></div>
        <div id="sheet"></div>
      </section>
      <section class="card" aria-labelledby="h-ratio">
        <div class="card-head"><h2 id="h-ratio">Chỉ số tài chính</h2><span class="meta">Năm ${B.year}</span></div>
        <div class="card-body" id="ratios"></div>
      </section>
    </div>`;

  function render() {
    document.querySelector('#tabs').innerHTML = [['b01a', 'B01a · Tình hình tài chính'], ['b02', 'B02 · Kết quả kinh doanh']].map(([id, l]) => `<button class="tab" role="tab" data-tab="${id}" aria-selected="${tab === id}">${l}</button>`).join('');
    const line = (code, name, a, b, cls = '') => `<tr class="${cls}"><td class="c-who">${name}</td><td class="num muted">${code}</td><td class="c-amt r num">${fmt.money(a)}</td><td class="r num">${fmt.money(b)}</td></tr>`;
    const head = (t) => `<tr class="section-row"><td colspan="4">${t}</td></tr>`;
    const ok = TA[0] === TL[0] + TE[0] && TA[1] === TL[1] + TE[1];
    if (tab === 'b01a') {
      document.querySelector('#sheet').innerHTML = `
        <div class="sheet-meta"><span>Báo cáo tình hình tài chính tại 31/12/${B.year} · triệu đồng</span>${ok ? '<span class="pill pos">Tổng tài sản khớp tổng nguồn vốn</span>' : '<span class="pill neg">Tài sản lệch nguồn vốn</span>'}</div>
        <div class="tw"><table class="keep">
        <thead><tr><th>Chỉ tiêu</th><th>Mã số</th><th class="r">Số cuối năm</th><th class="r">Số đầu năm</th></tr></thead>
        <tbody>
          ${head('Tài sản')}
          ${B.assets.map((a) => line(...a)).join('')}
          ${line('200', 'Tổng cộng tài sản', TA[0], TA[1], 'total-row')}
          ${head('Nguồn vốn')}
          ${line('300', 'Nợ phải trả', TL[0], TL[1], 'subtotal')}
          ${B.liabilities.map((a) => line(...a)).join('')}
          ${line('400', 'Vốn chủ sở hữu', TE[0], TE[1], 'subtotal')}
          ${B.equity.map((a) => line(...a)).join('')}
          ${line('500', 'Tổng cộng nguồn vốn', TL[0] + TE[0], TL[1] + TE[1], 'total-row')}
        </tbody></table></div>`;
    } else {
      const gross = [I.revenue[0] - I.cogs[0], I.revenue[1] - I.cogs[1]];
      document.querySelector('#sheet').innerHTML = `
        <div class="sheet-meta"><span>Báo cáo kết quả hoạt động kinh doanh năm ${B.year} · triệu đồng</span></div>
        <div class="tw"><table class="keep">
        <thead><tr><th>Chỉ tiêu</th><th>Mã số</th><th class="r">Năm nay</th><th class="r">Năm trước</th></tr></thead>
        <tbody>
          ${line('10', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', ...I.revenue)}
          ${line('11', 'Giá vốn hàng bán', ...I.cogs)}
          ${line('20', 'Lợi nhuận gộp', ...gross, 'subtotal')}
          ${line('60', 'Lợi nhuận sau thuế thu nhập doanh nghiệp', ...I.net, 'total-row')}
        </tbody></table></div>`;
    }
    const avg = (r) => (r[2] + r[3]) / 2;
    const groups = [
      ['Khả năng thanh toán', [['Hiện hành', cur(2) / TL[0], 'lần'], ['Nhanh', (cur(2) - inv[2]) / TL[0], 'lần'], ['Tức thời', cash[2] / TL[0], 'lần']]],
      ['Cơ cấu vốn', [['Nợ / tổng tài sản', TL[0] / TA[0], '%'], ['Nợ / vốn chủ sở hữu', TL[0] / TE[0], 'lần']]],
      ['Hiệu quả hoạt động', [['Vòng quay hàng tồn kho', I.cogs[0] / avg(inv), 'vòng']]],
      ['Khả năng sinh lời', [['Biên lợi nhuận gộp', (I.revenue[0] - I.cogs[0]) / I.revenue[0], '%'], ['Biên lợi nhuận ròng (ROS)', I.net[0] / I.revenue[0], '%'], ['ROA', I.net[0] / ((TA[0] + TA[1]) / 2), '%'], ['ROE', I.net[0] / ((TE[0] + TE[1]) / 2), '%']]],
    ];
    document.querySelector('#ratios').innerHTML = groups.map(([g, items]) => `<p class="sub-title" style="margin-top:12px">${g}</p><ul class="facts num">${items.map(([n, v, u]) => `<li><span>${n}</span><b>${u === '%' ? fmt.pct(v * 100) : `${d2.format(v)} ${u}`}</b></li>`).join('')}</ul>`).join('');
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; render(); }
  });
  render();
})();
