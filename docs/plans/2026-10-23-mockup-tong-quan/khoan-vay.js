(() => {
  const { M, fmt, days, icon, shell, customerBar, kpi, byId, groupOf, overdueDays, outstandingOf } = window.UI;
  shell();
  const F = M.focus;
  const kh = M.customers.find((c) => c.cif === F.cif).kh;

  const loans = Object.entries(F.kunn).map(([id, k]) => ({ c: byId.get(Number(id)), k }));
  const debt = outstandingOf(kh);
  const available = F.hdtd.reduce((s, h) => {
    const list = h.kunn.map((id) => ({ c: byId.get(id), k: F.kunn[id] }));
    return s + (h.method === 'Hạn mức tín dụng' ? h.limit - list.reduce((a, x) => a + x.c.outstanding, 0) : h.limit - list.reduce((a, x) => a + x.k.amount, 0));
  }, 0);

  const sched = F.schedule.map((p) => ({ ...p, total: p.goc + p.lai, d: days(p.due) }));
  const late = sched.filter((p) => !p.paid && p.d < 0);
  const next = sched.find((p) => !p.paid && p.d >= 0);
  const lateSum = late.reduce((s, p) => s + p.total, 0);
  const selected = byId.get(F.scheduleOf);
  const sk = F.kunn[F.scheduleOf];
  const paidPrincipal = sk.amount - selected.outstanding;
  const instalment = sched.find((p) => p.goc > 0).goc;
  const remaining = Math.ceil(selected.outstanding / instalment);
  const worstGroup = Math.max(...loans.map(({ c }) => groupOf(c)));
  const worstDays = Math.max(...loans.map(({ c }) => overdueDays(c)));

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Khoản vay</h1>
      <div class="actions"><button class="btn primary" type="button">${icon('plus')}Giải ngân KUNN</button></div>
    </div>
    ${customerBar([['Dư nợ hiện hành', fmt.money(debt)], ['Hạn mức khả dụng', fmt.money(available)]])}
    <section class="kpis" aria-label="Chỉ số khoản vay">
      ${kpi({ tone: 'accent', label: 'Khế ước nhận nợ', value: loans.length, unit: 'KUNN', note: `Nhận nợ ${fmt.money(loans.reduce((s, x) => s + x.k.amount, 0))} VNĐ` })}
      ${kpi({ tone: lateSum ? 'neg' : 'pos', label: 'Phải thu quá hạn', value: fmt.money(lateSum), unit: 'VNĐ', cls: lateSum ? 'neg' : '', note: late.length ? `Kỳ ${late[0].ky} · ${selected.so} · trễ ${-late[0].d} ngày` : 'Không có kỳ quá hạn' })}
      ${kpi({ tone: worstGroup > 1 ? 'warn' : 'pos', label: 'Nhóm nợ hiệu lực', value: `Nhóm ${worstGroup}`, cls: worstGroup > 1 ? 'warn' : '', note: worstGroup > 1 ? `Quá hạn ${worstDays} ngày, khung 10–90 ngày` : 'Không có ngày quá hạn' })}
      ${kpi({ tone: 'neutral', label: 'Kỳ tới', value: next ? fmt.money(next.total) : '—', unit: next ? 'VNĐ' : '', note: next ? `Kỳ ${next.ky} · đến hạn ${fmt.dmy(next.due)}` : 'Không còn kỳ nào' })}
    </section>
    <section class="card" aria-labelledby="h-loans">
      <div class="card-head"><h2 id="h-loans">Khế ước nhận nợ</h2><span class="meta num">${loans.length} khế ước</span></div>
      <div class="tw" style="margin-top:8px"><table>
        <thead><tr><th>KUNN · HĐTD</th><th class="opt">Phương thức</th><th class="r opt">Nhận nợ (VNĐ)</th><th class="r">Dư nợ (VNĐ)</th><th class="r">Lãi suất</th><th class="opt">Giải ngân</th><th>Kết thúc</th><th>Nhóm</th><th><span class="sr">Thao tác</span></th></tr></thead>
        <tbody>${loans.map(({ c, k }) => `
          <tr class="${c.id === F.scheduleOf ? 'selected' : ''}">
            <td class="c-who who-cell"><b class="num">${c.so}</b><span class="num">${k.hdtd}</span></td>
            <td class="muted opt">${c.method}</td>
            <td class="r num opt">${fmt.money(k.amount)}</td>
            <td class="c-amt r money num">${fmt.money(c.outstanding)}</td>
            <td class="r num">${fmt.pct(k.rate)}</td>
            <td class="num opt">${fmt.dmy(k.disbursed)}</td>
            <td class="c-due num">${fmt.dmy(k.end)}</td>
            <td><span class="pill g${groupOf(c)}">Nhóm ${groupOf(c)}</span></td>
            <td class="c-act r"><button class="btn ghost" type="button">Lịch trả nợ</button></td>
          </tr>`).join('')}</tbody>
      </table></div>
      <div class="card-foot"><span class="num">Tổng dư nợ ${fmt.money(debt)} VNĐ</span></div>
    </section>
    <div class="split">
      <section class="card" aria-labelledby="h-sched">
        <div class="card-head"><h2 id="h-sched">Lịch trả nợ ${selected.so}</h2><span class="meta">Từ kỳ ${sched[0].ky}</span></div>
        <div class="tw" style="margin-top:8px"><table>
          <thead><tr><th class="r">Kỳ</th><th>Đến hạn</th><th class="r">Gốc</th><th class="r">Lãi</th><th class="r">Phải trả (VNĐ)</th><th>Trạng thái</th><th><span class="sr">Thao tác</span></th></tr></thead>
          <tbody>${sched.map((p) => {
            const st = p.paid ? { t: `Đã trả ${fmt.dmy(p.paid).slice(0, 5)}`, c: 'pos' } : p.d < 0 ? { t: `Quá hạn ${-p.d} ngày`, c: 'neg' } : { t: `Còn ${p.d} ngày`, c: 'neutral' };
            return `<tr>
              <td class="r num muted">${p.ky}</td>
              <td class="c-due num">${fmt.dmy(p.due)}</td>
              <td class="r num">${fmt.money(p.goc)}</td>
              <td class="r num">${fmt.money(p.lai)}</td>
              <td class="c-amt r money num">${fmt.money(p.total)}</td>
              <td class="c-who"><span class="pill ${st.c}">${st.t}</span></td>
              <td class="c-act r">${!p.paid && p.d < 0 ? '<button class="btn ghost" type="button">Thu nợ</button>' : ''}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="card-foot"><span class="num">${sched.length} kỳ gần nhất · còn ${remaining} kỳ trả gốc</span><button class="link" type="button">Xem toàn bộ lịch</button></div>
      </section>
      <section class="card" aria-labelledby="h-kunn">
        <div class="card-head"><h2 id="h-kunn" class="num">${selected.so}</h2><span class="pill g${groupOf(selected)}">Nhóm ${groupOf(selected)}</span></div>
        <div class="card-body">
          <div class="plan" role="img" aria-label="Đã trả ${fmt.pct((paidPrincipal / sk.amount) * 100)} gốc">
            <div class="plan-track"><span style="width:${(paidPrincipal / sk.amount) * 100}%;background:var(--t-accent)"></span></div>
            <div class="plan-legend num"><span>Đã trả gốc <b>${fmt.money(paidPrincipal)}</b></span><span>Còn <b>${fmt.money(selected.outstanding)}</b></span></div>
          </div>
          <ul class="facts num" style="margin-top:12px">
            <li><span>Nhận nợ</span><b>${fmt.money(sk.amount)}</b></li>
            <li><span>Gốc mỗi kỳ</span><b>${fmt.money(instalment)}</b></li>
            <li><span>Lãi suất</span><b>${fmt.pct(sk.rate)}/năm</b></li>
            <li><span>Giải ngân</span><b>${fmt.dmy(sk.disbursed)}</b></li>
            <li><span>Kết thúc</span><b>${fmt.dmy(sk.end)}</b></li>
            <li><span>HĐTD</span><b>${sk.hdtd}</b></li>
          </ul>
        </div>
      </section>
    </div>`;
})();
