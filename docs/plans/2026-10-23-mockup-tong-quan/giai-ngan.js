(() => {
  const { fmt, icon, shell } = window.UI;
  const X = window.MORE;
  shell();
  let q = '';

  document.querySelector('#main').innerHTML = `
    <div class="title-row">
      <h1>Thông tin giải ngân</h1>
      <div class="actions"><button class="btn primary" type="button">${icon('plus')}Thêm người thụ hưởng</button></div>
    </div>
    <section class="card" aria-labelledby="h-list">
      <h2 id="h-list" class="sr">Danh sách người thụ hưởng</h2>
      <div class="card-toolbar">
        <div class="left"><label class="input">${icon('search')}<input id="q" type="search" placeholder="Tìm theo họ tên, CCCD, số tài khoản, ngân hàng" aria-label="Tìm thông tin giải ngân"></label></div>
        <span class="total num" id="total"></span>
      </div>
      <div id="table"></div>
    </section>
    <section class="card" aria-labelledby="h-recent" style="margin-top:var(--gap)">
      <div class="card-head"><h2 id="h-recent">Giải ngân gần đây</h2><span class="meta">30 ngày qua</span></div>
      <div class="tw" style="margin-top:8px"><table>
        <thead><tr><th>Khế ước · khách hàng</th><th>Người thụ hưởng</th><th class="opt">Tài khoản</th><th>Ngày</th><th class="r">Số tiền (VNĐ)</th></tr></thead>
        <tbody>${X.disbursements.map((d) => `<tr>
          <td class="c-who who-cell"><b class="num">${d.kunn}</b><span>${fmt.esc(d.kh)}</span></td>
          <td>${fmt.esc(d.payee)}<span class="sub-line">${fmt.esc(d.content)}</span></td>
          <td class="opt num muted">${d.account}</td>
          <td class="c-due num">${fmt.dmy(d.date)}</td>
          <td class="c-amt r num money">${fmt.money(d.amount)}</td>
        </tr>`).join('')}
        <tr class="total-row"><td>TỔNG CỘNG</td><td></td><td class="opt"></td><td></td><td class="r num">${fmt.money(X.disbursements.reduce((s, d) => s + d.amount, 0))}</td></tr></tbody>
      </table></div>
    </section>`;

  function render() {
    const needle = q.trim().toLowerCase().replace(/\s/g, '');
    const list = X.payees.filter((p) => !needle || [p.name, p.idNo, ...p.accounts.flat()].some((v) => v.toLowerCase().replace(/\s/g, '').includes(needle)));
    const accounts = list.reduce((s, p) => s + p.accounts.length, 0);
    document.querySelector('#total').textContent = `${list.length} người thụ hưởng · ${accounts} tài khoản`;
    document.querySelector('#table').innerHTML = list.length ? `<div class="tw"><table>
      <thead><tr><th>Người thụ hưởng</th><th class="opt">Ngày cấp · nơi cấp</th><th>Tài khoản nhận tiền</th><th class="r opt">Lần giải ngân</th><th><span class="sr">Thao tác</span></th></tr></thead>
      <tbody>${list.map((p) => `<tr>
        <td class="c-who who-cell"><b>${fmt.esc(p.name)}</b><span class="num">CCCD ${p.idNo}</span></td>
        <td class="opt"><span class="num">${fmt.dmy(p.idDate)}</span><span class="sub-line">${p.idPlace}</span></td>
        <td class="c-due">${p.accounts.map(([no, bank, branch]) => `<span class="line"><span class="num">${no}</span> <span class="muted">· ${bank}, ${branch}</span></span>`).join('')}</td>
        <td class="r num opt ${p.used ? '' : 'dash'}">${p.used || '0'}</td>
        <td class="c-act r"><button class="btn ghost" type="button">Sửa</button></td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Không tìm thấy người thụ hưởng khớp từ khoá.</div>';
  }
  document.querySelector('#q').addEventListener('input', (e) => { q = e.target.value; render(); });
  render();
})();
