(() => {
  const { M, fmt, days, groupOf, byId } = window.UI;
  const $ = (s) => document.querySelector(s);
  const nf = new Intl.NumberFormat('vi-VN');
  const money = fmt.money, pct = fmt.pct, dmy = fmt.dmy, esc = fmt.esc;
  const DAY = 86400000;
  const toDate = (iso) => new Date(`${iso}T00:00:00Z`);
  const dm = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  window.UI.shell();

  const totalDebt = M.contracts.reduce((s, c) => s + c.outstanding, 0);
  const borrowers = new Set(M.contracts.map((c) => c.kh)).size;
  const totalCollateral = M.collaterals.reduce((s, v) => s + v, 0);
  const cardLimit = M.cardLimits.reduce((s, v) => s + v, 0);

  const periods = M.periods
    .map((p) => ({ ...p, c: byId.get(p.contract), d: days(p.due), total: p.goc + p.lai }))
    .sort((a, b) => a.d - b.d);
  const overdue = periods.filter((p) => p.d < 0);
  const overdueSum = overdue.reduce((s, p) => s + p.total, 0);
  const dueWeek = periods.filter((p) => p.d >= 0 && p.d <= 7);

  console.assert(periods.reduce((s, p) => s + p.total, 0) === M.periods.reduce((s, p) => s + p.goc + p.lai, 0), 'tổng phải thu lệch');

  $('#stamp').textContent = `Cập nhật ${dmy(M.today)} lúc 09:14`;

  const kpis = [
    { tone: 'accent', label: 'Dư nợ', value: money(totalDebt), unit: 'VNĐ', note: `${M.contracts.length} khế ước · ${borrowers} khách hàng` },
    { tone: 'cust', label: 'Khách hàng', value: money(M.customers.filter((c) => !c.archived).length), unit: 'khách hàng', note: `${borrowers} còn dư nợ` },
    { tone: 'collateral', label: 'Giá trị TSBĐ', value: money(totalCollateral), unit: 'VNĐ', note: `Dư nợ / TSBĐ ${pct((totalDebt / totalCollateral) * 100)}` },
    { tone: 'card', label: 'Thẻ tín dụng', value: money(M.cardLimits.length), unit: 'thẻ', note: `Hạn mức cấp ${money(cardLimit)} VNĐ` },
  ];
  $('#kpis').innerHTML = kpis.map((k) => `
    <div class="kpi" data-metric-tone="${k.tone}">
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value num">${k.value}<small>${k.unit}</small></div>
      <div class="kpi-note num">${k.note}</div>
    </div>`).join('');

  // Nhóm nợ: N1 trung tính, N2 cảnh báo, N3–N5 xấu.
  const groupColor = ['var(--t-line-strong)', 'var(--t-warn)', 'var(--t-neg)', 'var(--t-neg)', 'var(--t-neg)'];
  const groups = [1, 2, 3, 4, 5].map((g) => {
    const list = M.contracts.filter((c) => groupOf(c) === g);
    const amount = list.reduce((s, c) => s + c.outstanding, 0);
    return { g, count: list.length, amount, share: (amount / totalDebt) * 100 };
  });
  console.assert(groups.reduce((s, x) => s + x.amount, 0) === totalDebt, 'nhóm nợ không cộng ra tổng dư nợ');
  $('#groups').innerHTML = `
    <div class="stack" role="img" aria-label="Tỷ trọng dư nợ theo nhóm">${groups.filter((x) => x.amount).map((x) => `<span style="width:${x.share}%;background:${groupColor[x.g - 1]}" title="Nhóm ${x.g}: ${pct(x.share)}"></span>`).join('')}</div>
    <ul class="rows">${groups.map((x) => `
      <li class="${x.amount ? '' : 'zero'}">
        <span class="name"><i style="background:${groupColor[x.g - 1]}"></i>Nhóm ${x.g} <small class="num">${x.count} HĐ</small></span>
        <span class="r num ${x.amount ? 'money' : ''}">${money(x.amount)}</span>
        <span class="r num faint">${pct(x.share)}</span>
      </li>`).join('')}</ul>`;

  const methods = M.methods.map((m) => {
    const list = M.contracts.filter((c) => c.method === m);
    const amount = list.reduce((s, c) => s + c.outstanding, 0);
    return { m, count: list.length, amount, share: (amount / totalDebt) * 100 };
  }).sort((a, b) => b.amount - a.amount);
  const top = methods[0].amount;
  $('#methods').innerHTML = `<ul class="methods">${methods.map((x) => `
    <li>
      <div class="line1"><span>${x.m}</span><b class="num money">${money(x.amount)}</b></div>
      <div class="track"><span style="width:${(x.amount / top) * 100}%"></span></div>
      <div class="line2 num"><span>${x.count} khế ước</span><span>${pct(x.share)}</span></div>
    </li>`).join('')}</ul>`;

  // Hàng việc
  const tabs = [
    { id: 'ky', label: 'Kỳ trả nợ', n: periods.length, hot: overdue.length > 0 },
    { id: 'kunn', label: 'KUNN đáo hạn', n: M.kunn.length },
    { id: 'hmtd', label: 'HĐTD hết hiệu lực', n: M.hmtd.length },
    { id: 'tsbd', label: 'TSBĐ cần định giá', n: M.tsbd.length },
  ];
  let tab = 'ky';
  let filter = 'all';
  $('#window').textContent = `Đến ${dmy(new Date(toDate(M.today).getTime() + 30 * DAY).toISOString().slice(0, 10))}`;

  const dueCell = (d) => d < 0 ? `<span class="late">Quá hạn ${-d} ngày</span>` : d === 0 ? '<span class="soon">Hôm nay</span>' : d <= 7 ? `<span class="soon">Còn ${d} ngày</span>` : `<span class="muted">Còn ${d} ngày</span>`;

  function renderTabs() {
    $('#tabs').innerHTML = tabs.map((t) => `<button class="tab" role="tab" aria-selected="${t.id === tab}" data-tab="${t.id}">${t.label}<span class="count num ${t.hot ? 'hot' : ''}">${t.n}</span></button>`).join('');
  }

  function periodRows(list) {
    return list.map((p) => `
      <tr>
        <td class="c-who who-cell"><b>${esc(p.c.kh)}</b><span class="num">${p.c.so} · ${p.c.method}</span></td>
        <td class="c-ky r num muted">${p.ky}</td>
        <td class="c-due"><span class="num">${dmy(p.due)}</span><span class="sub-line">${dueCell(p.d)}</span></td>
        <td class="c-amt r"><span class="money num">${money(p.total)}</span><span class="sub-line num">gốc ${money(p.goc)} · lãi ${money(p.lai)}</span></td>
        <td class="c-group"><span class="pill g${groupOf(p.c)}">Nhóm ${groupOf(p.c)}</span></td>
        <td class="c-act r"><button class="btn ghost" type="button">Thu nợ</button></td>
      </tr>`).join('');
  }

  function renderPanel() {
    const panel = $('#panel');
    if (tab === 'ky') {
      const list = filter === 'late' ? overdue : filter === 'week' ? dueWeek : periods;
      const shown = list.slice(0, 5);
      const sum = list.reduce((s, p) => s + p.total, 0);
      panel.innerHTML = `
        <div class="toolbar">
          <div class="seg" role="group" aria-label="Lọc kỳ trả nợ">
            <button type="button" data-f="all" aria-pressed="${filter === 'all'}">Tất cả <span class="num">${periods.length}</span></button>
            <button type="button" data-f="late" aria-pressed="${filter === 'late'}">Quá hạn <span class="num">${overdue.length}</span></button>
            <button type="button" data-f="week" aria-pressed="${filter === 'week'}">7 ngày tới <span class="num">${dueWeek.length}</span></button>
          </div>
          <div class="legend"><span><i style="background:var(--t-neg)"></i>Quá hạn</span><span><i style="background:var(--t-accent)"></i>Đến hạn</span></div>
        </div>
        <div class="strip" id="strip"></div>
        ${shown.length ? `<table>
          <thead><tr><th>Khách hàng · khế ước</th><th class="r c-ky">Kỳ</th><th>Đến hạn</th><th class="r">Phải thu (VNĐ)</th><th>Nhóm</th><th class="r"><span class="sr">Thao tác</span></th></tr></thead>
          <tbody>${periodRows(shown)}</tbody></table>` : '<div class="empty">Không có kỳ nào trong bộ lọc này.</div>'}
        <div class="card-foot"><span class="num">${shown.length} / ${list.length} kỳ · tổng phải thu ${money(sum)} VNĐ</span>${list.length > shown.length ? '<button class="link" type="button">Xem tất cả</button>' : ''}</div>`;
      drawStrip();
    } else if (tab === 'kunn') {
      const rows = M.kunn.map((k) => ({ ...k, c: byId.get(k.contract), d: days(k.due) }));
      panel.innerHTML = table(['Khách hàng · khế ước', 'Đáo hạn', 'Dư nợ (VNĐ)', ''], rows.map((k) => `
        <tr><td class="c-who who-cell"><b>${esc(k.c.kh)}</b><span class="num">${k.c.so} · ${k.c.method}</span></td>
        <td class="c-due"><span class="num">${dmy(k.due)}</span><span class="sub-line">${dueCell(k.d)}</span></td>
        <td class="c-amt r money num">${money(k.outstanding)}</td>
        <td class="c-act r"><button class="btn ghost" type="button">Mở khế ước</button></td></tr>`), `${rows.length} khế ước · dư nợ ${money(rows.reduce((s, k) => s + k.outstanding, 0))} VNĐ`);
    } else if (tab === 'hmtd') {
      panel.innerHTML = table(['Khách hàng · hợp đồng', 'Hết hiệu lực', 'Hạn mức (VNĐ)', ''], M.hmtd.map((h) => `
        <tr><td class="c-who who-cell"><b>${esc(h.kh)}</b><span class="num">${h.so}</span></td>
        <td class="c-due"><span class="num">${dmy(h.expiry)}</span><span class="sub-line">${dueCell(days(h.expiry))}</span></td>
        <td class="c-amt r money num">${money(h.limit)}</td>
        <td class="c-act r"><button class="btn ghost" type="button">Lập tờ trình tái cấp</button></td></tr>`), `${M.hmtd.length} hợp đồng · hạn mức ${money(M.hmtd.reduce((s, h) => s + h.limit, 0))} VNĐ`);
    } else {
      panel.innerHTML = table(['Khách hàng · tài sản', 'Định giá gần nhất', 'Giá trị (VNĐ)', ''], M.tsbd.map((t) => {
        const late = -days(t.lastValued) - 365;
        return `<tr><td class="c-who who-cell"><b>${esc(t.kh)}</b><span>${esc(t.ten)}</span></td>
        <td class="c-due"><span class="num">${dmy(t.lastValued)}</span><span class="sub-line"><span class="late">Quá kỳ ${late} ngày</span></span></td>
        <td class="c-amt r money num">${money(t.value)}</td>
        <td class="c-act r"><button class="btn ghost" type="button">Định giá lại</button></td></tr>`;
      }), `${M.tsbd.length} tài sản`);
    }
  }

  function table(heads, rows, foot) {
    return `<table style="margin-top:4px"><thead><tr>${heads.map((h, i) => `<th class="${i >= 2 ? 'r' : ''}">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
      <div class="card-foot"><span class="num">${foot}</span></div>`;
  }

  // Dải lịch thu nợ: 14 ngày trước đến 30 ngày sau hôm nay, mỗi cột là tổng gốc + lãi đến hạn trong ngày.
  function drawStrip() {
    const host = $('#strip');
    if (!host) return;
    const W = host.clientWidth - 40, H = 112, left = 36, top = 18, bottom = 20, plotW = W - left, plotH = H - top - bottom;
    const start = -14, span = 45;
    const perDay = Array.from({ length: span }, (_, i) => periods.filter((p) => p.d === start + i));
    const vals = perDay.map((l) => l.reduce((s, p) => s + p.total, 0) / 1e6);
    const max = Math.max(...vals);
    const step = [50, 100, 200, 250, 500, 1000].find((s) => s * 3 > max);
    const ticks = [0, step, step * 2, step * 3];
    const topV = ticks[ticks.length - 1];
    const x = (i) => left + (i + 0.5) * (plotW / span);
    const y = (v) => top + plotH - (v / topV) * plotH;
    const bw = Math.max(4, Math.min(12, (plotW / span) * 0.6));
    const ti = -start;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Số tiền phải thu theo ngày, từ 14 ngày trước đến 30 ngày tới">`;
    s += `<text x="0" y="8">triệu VNĐ</text>`;
    ticks.forEach((t) => {
      s += `<line x1="${left}" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="var(--grid)" stroke-width="${t === 0 ? 1.5 : 1}"/>`;
      s += `<text x="${left - 6}" y="${y(t) + 4}" text-anchor="end">${nf.format(t)}</text>`;
    });
    for (let i = 0; i <= span - 1; i += 7) {
      const d = new Date(toDate(M.today).getTime() + (start + i) * DAY);
      s += `<text x="${x(i)}" y="${H - 4}" text-anchor="middle">${dm(d)}</text>`;
    }
    s += `<line x1="${x(ti)}" x2="${x(ti)}" y1="${top - 4}" y2="${top + plotH}" stroke="var(--t-ink)" stroke-width="1" stroke-dasharray="3 3"/>`;
    s += `<text class="today-label" x="${x(ti) + 6}" y="${top + 6}">Hôm nay</text>`;
    vals.forEach((v, i) => {
      if (!v) return;
      const late = start + i < 0;
      const tip = perDay[i].map((p) => `${p.c.kh}: ${money(p.total)} VNĐ`).join('\n');
      s += `<rect class="bar" x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${top + plotH - y(v)}" fill="${late ? 'var(--t-neg)' : 'var(--t-accent)'}"><title>${esc(tip)}</title></rect>`;
    });
    host.innerHTML = s + '</svg>';
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) { tab = t.dataset.tab; renderTabs(); renderPanel(); return; }
    const f = e.target.closest('[data-f]');
    if (f) { filter = f.dataset.f; tab = 'ky'; renderTabs(); renderPanel(); return; }
  });
  addEventListener('resize', drawStrip);
  renderTabs();
  renderPanel();
})();
