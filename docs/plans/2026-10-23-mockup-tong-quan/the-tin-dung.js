(() => {
  const { M, fmt, icon, shell, customerBar } = window.UI;
  const X = window.MORE;
  const R = window.REF;
  shell();
  const addMonths = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  const cards = X.cards.map((c) => ({ ...c, expiry: addMonths(c.issued, c.months), rule: R.cardPolicies.find((p) => p.code === c.policy) }));
  const live = cards.filter((c) => !c.closed);
  const granted = live.reduce((s, c) => s + c.limit, 0);

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Thẻ tín dụng</h1>
      <div class="actions"><button class="btn primary" type="button">${icon('plus')}Thêm hợp đồng thẻ</button></div>
    </div>
    ${customerBar([['Thẻ hiệu lực', live.length], ['Hạn mức đang cấp', fmt.money(granted)]], X.cardCif)}
    <section class="card" aria-labelledby="h-cards">
      <div class="card-head"><h2 id="h-cards">Hợp đồng thẻ</h2><span class="meta num">${cards.length} hợp đồng · ${live.length} hiệu lực</span></div>
      <div class="tw" style="margin-top:8px"><table>
        <thead><tr><th>Hợp đồng · sản phẩm</th><th>Chủ thẻ chính</th><th class="opt">Mã chính sách</th><th class="opt">TSBĐ</th><th class="r">Hạn mức (VNĐ)</th><th>Hết hạn</th><th>Trạng thái</th><th><span class="sr">Thao tác</span></th></tr></thead>
        <tbody>${cards.map((c) => `<tr>
          <td class="c-who who-cell"><b class="num">${c.so}</b><span>${c.product}</span></td>
          <td>${fmt.esc(c.holder)}<span class="sub-line">${c.related ? 'Chủ thẻ KHLQ' : 'Chủ thẻ KH'}${c.secondary ? ` · thẻ phụ ${fmt.esc(c.secondary)}` : ''}</span></td>
          <td class="opt num">${c.policy ? `<a class="name-link" href="chinh-sach-the.html">${c.policy.split('_')[0]}</a>` : '<span class="dash">—</span>'}</td>
          <td class="opt ${c.asset ? '' : 'dash'}">${c.asset ? fmt.esc(c.asset) : '—'}</td>
          <td class="c-amt r num ${c.limit ? 'money' : ''}">${c.limit ? fmt.money(c.limit) : '0'}${c.limit ? '' : '<span class="sub-line">Thẻ ghi nợ</span>'}</td>
          <td class="c-due num">${fmt.dmy(c.expiry)}<span class="sub-line num">Phát hành ${fmt.dmy(c.issued)}</span></td>
          <td>${c.closed ? '<span class="pill neutral">Đã đóng</span>' : '<span class="pill pos">Hiệu lực</span>'}</td>
          <td class="c-act r"><button class="btn kebab" type="button" aria-label="Thao tác với ${c.so}">${icon('dots')}</button></td>
        </tr>`).join('')}</tbody></table></div>
    </section>
    <section class="card" aria-labelledby="h-room" style="margin-top:var(--gap)">
      <div class="card-head"><h2 id="h-room">Hạn mức so với chính sách</h2><span class="meta">Theo hạn mức tối đa của mã chính sách</span></div>
      <div class="card-body room">${live.filter((c) => c.rule).map((c) => {
        const max = c.rule.maxLimit;
        return `<div>
          <div class="line1"><b class="num">${c.so}</b><span class="num muted">${c.rule.code.split('_')[0]} · tối đa ${max ? fmt.money(max) : 'theo giá trị tiền gửi'}</span></div>
          ${max ? `<div class="plan-track" style="margin-top:8px"><span style="width:${(c.limit / max) * 100}%;background:var(--t-kpi-card)"></span></div>
          <div class="plan-legend num"><span>Đang cấp <b>${fmt.money(c.limit)}</b></span><span>Còn có thể cấp <b>${fmt.money(max - c.limit)}</b></span></div>` : ''}
          <p class="muted" style="margin:8px 0 0;font-size:13px">${fmt.esc(c.rule.limitRule)}</p>
        </div>`;
      }).join('')}</div>
    </section>`;
})();
