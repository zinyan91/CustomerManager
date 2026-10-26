(() => {
  const { M, fmt, days, icon, shell, customerBar, kpi, byId, groupOf, capacityOf, outstandingOf } = window.UI;
  shell();
  const F = M.focus;
  const kh = M.customers.find((c) => c.cif === F.cif).kh;

  const contracts = F.hdtd.map((h) => {
    const kunn = h.kunn.map((id) => ({ c: byId.get(id), k: F.kunn[id] }));
    const used = kunn.reduce((s, x) => s + x.c.outstanding, 0);
    const disbursed = kunn.reduce((s, x) => s + x.k.amount, 0);
    // Hạn mức quay vòng được dùng lại khi trả gốc; hạn mức từng lần chỉ trừ phần đã giải ngân.
    const available = h.method === 'Hạn mức tín dụng' ? h.limit - used : h.limit - disbursed;
    const left = days(h.expiry);
    const status = left < 0 ? { label: 'Hết hiệu lực', tone: 'neg' } : left <= 30 ? { label: `Hết hiệu lực sau ${left} ngày`, tone: 'warn' } : { label: 'Đang hiệu lực', tone: 'pos' };
    return { ...h, kunn, used, available, status, left };
  });
  const debt = outstandingOf(kh);
  console.assert(debt === contracts.reduce((s, h) => s + h.used, 0), 'dư nợ HĐTD lệch dư nợ khách hàng');
  const granted = contracts.reduce((s, h) => s + h.limit, 0);
  const available = contracts.reduce((s, h) => s + h.available, 0);
  const capacity = F.assets.reduce((s, a) => s + capacityOf(a), 0);
  const ratio = (capacity / debt) * 100;
  const short = debt - capacity;
  const expiring = contracts.filter((h) => h.left >= 0 && h.left <= 30).length;

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Hợp đồng tín dụng</h1>
      <div class="actions"><button class="btn primary" type="button">${icon('plus')}Tạo hợp đồng</button></div>
    </div>
    ${customerBar([['Dư nợ hiện hành', fmt.money(debt)], ['Hạn mức khả dụng', fmt.money(available)]])}
    <section class="kpis" aria-label="Chỉ số hợp đồng">
      ${kpi({ tone: 'accent', label: 'Hạn mức đã cấp', value: fmt.money(granted), unit: 'VNĐ', note: `Đã dùng ${fmt.pct((debt / granted) * 100)} hạn mức` })}
      ${kpi({ tone: expiring ? 'warn' : 'pos', label: 'Hợp đồng', value: contracts.length, unit: 'HĐTD', note: expiring ? `${expiring} hết hiệu lực trong 30 ngày` : 'Đều còn hiệu lực' })}
      ${kpi({ tone: 'collateral', label: 'Khả năng bảo đảm', value: fmt.money(capacity), unit: 'VNĐ', note: `Từ ${F.assets.filter((a) => capacityOf(a)).length} / ${F.assets.length} tài sản còn hiệu lực định giá` })}
      ${kpi({ tone: ratio < 100 ? 'neg' : 'pos', label: 'Tỷ lệ bảo đảm', value: fmt.pct(ratio), cls: ratio < 100 ? 'neg' : '', note: short > 0 ? `Thiếu ${fmt.money(short)} VNĐ bảo đảm` : 'Đủ bảo đảm cho dư nợ' })}
    </section>
    <section class="card" aria-labelledby="h-list">
      <div class="card-head"><h2 id="h-list">Danh sách HĐTD</h2><span class="meta num">${contracts.length} hợp đồng · ${contracts.reduce((s, h) => s + h.kunn.length, 0)} KUNN</span></div>
      <div style="margin-top:12px">${contracts.map(block).join('')}</div>
    </section>`;

  function block(h) {
    const usedPct = (h.used / h.limit) * 100;
    const isRevolving = h.method === 'Hạn mức tín dụng';
    const blocked = isRevolving ? 0 : h.limit - h.available - h.used;
    return `<article class="hdtd">
      <div>
        <div class="hdtd-head"><h3 class="num">${h.so}</h3><span class="pill ${h.status.tone}">${h.status.label}</span></div>
        <p class="purpose">${h.method} · ${fmt.esc(h.purpose)}</p>
        <div class="plan" role="img" aria-label="Đã dùng ${fmt.pct(usedPct)} hạn mức">
          <div class="plan-track"><span style="width:${usedPct}%;background:var(--t-accent)"></span>${blocked > 0 ? `<span style="width:${(blocked / h.limit) * 100}%;background:var(--t-line-strong)"></span>` : ''}</div>
          <div class="plan-legend num"><span>Dư nợ <b>${fmt.money(h.used)}</b></span><span>Khả dụng <b>${fmt.money(h.available)}</b></span></div>
        </div>
        <dl class="num">
          <dt>Hạn mức</dt><dd>${fmt.money(h.limit)}</dd>
          ${blocked > 0 ? `<dt>Đã trả, không dùng lại</dt><dd>${fmt.money(blocked)}</dd>` : ''}
          <dt>Ngày ký</dt><dd>${fmt.dmy(h.signed)}</dd>
          <dt>Hết hiệu lực</dt><dd>${fmt.dmy(h.expiry)}</dd>
        </dl>
        <div class="actions-row">
          ${h.left <= 30 ? '<button class="btn primary" type="button">Lập tờ trình tái cấp</button>' : ''}
          ${h.available > 0 ? `<button class="btn" type="button">${icon('plus')}Giải ngân KUNN</button>` : ''}
          <button class="btn kebab" type="button" aria-label="Thao tác khác với ${h.so}">${icon('dots')}</button>
        </div>
      </div>
      <div>
        <p class="sub-title">Khế ước nhận nợ</p>
        <div class="tw"><table>
          <thead><tr><th>KUNN</th><th class="r">Dư nợ (VNĐ)</th><th class="r">Lãi suất</th><th>Đáo hạn</th><th>Nhóm</th></tr></thead>
          <tbody>${h.kunn.map(({ c, k }) => `
            <tr>
              <td class="c-who who-cell"><b class="num"><a class="name-link" href="khoan-vay.html">${c.so}</a></b><span class="num">Giải ngân ${fmt.dmy(k.disbursed)}</span></td>
              <td class="c-amt r"><span class="money num">${fmt.money(c.outstanding)}</span><span class="sub-line num">nhận nợ ${fmt.money(k.amount)}</span></td>
              <td class="r num">${fmt.pct(k.rate)}</td>
              <td class="c-due num">${fmt.dmy(k.end)}</td>
              <td><span class="pill g${groupOf(c)}">Nhóm ${groupOf(c)}</span></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
    </article>`;
  }
})();
