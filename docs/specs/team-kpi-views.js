globalThis.TeamKpiViews = (() => {
  const M = globalThis.TeamKpiModel;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const button = (attr, value, label, active) => `<button ${attr}="${value}" aria-current="${active}">${label}</button>`;
  const metricOptions = state => M.metrics.map(metric => `<option value="${metric.id}" ${state.metricId === metric.id ? 'selected' : ''}>${metric.label}</option>`).join('');
  const metricSelect = state => `<label>Chỉ tiêu <select id="metric">${metricOptions(state)}</select></label>`;
  const scopeTotal = (state, cumulative = false) => state.area === 'personal' ? M.visibleRows(state, cumulative)[0] : M.total(state, cumulative);
  const amount = (value, metric) => `<span class="${value < 0 ? 'negative-text' : ''}">${M.format(value, metric)}</span>`;
  const completion = value => `<span class="${value < 0 ? 'negative-text' : value >= 100 ? 'good-text' : ''}">${M.percent(value)}</span>`;
  const meter = value => `<span class="meter"><i style="width:${Math.max(0, Math.min(100, value ?? 0))}%"></i></span>${completion(value)}`;
  function kpiTable(state) {
    return `<div class="panel"><div class="panel-head"><h2>${state.area === 'team' ? 'Kết quả kinh doanh team' : 'KPI cá nhân · RBO'}</h2><span class="unit">${state.cumulative ? `Lũy kế 01–${String(state.month).padStart(2, '0')}/2026` : `Tháng ${state.month}/2026`}</span></div><div class="table-scroll"><table><thead><tr><th>Chỉ tiêu</th><th>Đơn vị</th><th class="number">Kế hoạch</th><th class="number">Thực hiện</th><th class="number">Chênh lệch</th><th class="number">Hoàn thành</th></tr></thead><tbody>${M.metrics.map(metric => {
      const result = scopeTotal({ ...state, metricId: metric.id }, state.cumulative);
      return `<tr><td>${metric.label}${state.cumulative && metric.kind === 'stock' ? ' (cuối kỳ)' : ''}</td><td class="unit">${metric.unit}</td><td class="number">${M.format(result.target, metric)}</td><td class="number">${amount(result.actual, metric)}</td><td class="number">${amount(result.gap, metric)}</td><td class="number">${meter(result.completion)}</td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  }
  function summary(state) {
    return `<div class="summary">${['loanNet', 'termNet', 'casaNet', 'fees'].map(metricId => {
      const metric = M.metricOf({ metricId }), result = scopeTotal({ ...state, metricId }, state.cumulative);
      return `<article class="stat"><label>${metric.label}</label><strong>${M.format(result.actual, metric)}</strong><small>${metric.unit}</small><footer><span>KH ${M.format(result.target, metric)}</span>${completion(result.completion)}</footer></article>`;
    }).join('')}</div>`;
  }
  function memberChart(state) {
    const metric = M.metricOf(state), rows = M.rows(state, state.cumulative), isPercent = state.comparison === 'percent';
    const values = rows.flatMap(row => isPercent ? [row.completion ?? 0, 100] : [row.actual / metric.divisor, row.target / metric.divisor]);
    const min = Math.min(0, ...values) * 1.2, max = Math.max(1, ...values) * 1.18;
    const x = value => 180 + (value - min) / (max - min) * 650, zero = x(0);
    const axis = Array.from({ length: 5 }, (_, index) => min + index * (max - min) / 4);
    return `<svg class="chart" viewBox="0 0 980 360" role="img" aria-label="So sánh thành viên: ${metric.label}"><title>Thực hiện và kế hoạch theo thành viên</title>${axis.map(value => `<line class="grid" x1="${x(value)}" x2="${x(value)}" y1="20" y2="306"/><text x="${x(value)}" y="333" text-anchor="middle">${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)}${isPercent ? '%' : ''}</text>`).join('')}<line class="zero" x1="${zero}" x2="${zero}" y1="20" y2="306"/>${rows.map((row, index) => {
      const actual = isPercent ? row.completion ?? 0 : row.actual / metric.divisor, target = isPercent ? 100 : row.target / metric.divisor, y = index * 55 + 28;
      return `<text class="label" x="0" y="${y + 18}">${escape(row.member.name)}</text><rect class="target" x="${zero}" y="${y}" width="${Math.max(0, x(target) - zero)}" height="12" rx="2"/><rect class="${actual < 0 ? 'negative' : 'actual'}" x="${Math.min(zero, x(actual))}" y="${y + 17}" width="${Math.abs(x(actual) - zero)}" height="12" rx="2"/><text x="970" y="${y + 27}" text-anchor="end">${isPercent ? M.percent(row.completion) : M.format(row.actual, metric)}</text>`;
    }).join('')}</svg>`;
  }
  function trendChart(state) {
    const metric = M.metricOf(state), series = M.series(state), max = Math.max(...series.flatMap(row => [row.actual, row.target]), 1) * 1.18;
    const y = value => 250 - value / max * 215;
    return `<svg class="chart" viewBox="0 0 980 300" role="img" aria-label="So sánh KPI giữa các tháng: ${metric.label}"><title>Thực hiện và kế hoạch theo tháng</title>${[0, .25, .5, .75, 1].map(part => `<line class="grid" x1="70" x2="970" y1="${y(max * part)}" y2="${y(max * part)}"/><text x="55" y="${y(max * part) + 4}" text-anchor="end">${M.format(max * part, metric)}</text>`).join('')}${series.map((row, index) => {
      const x = 110 + index * (800 / series.length);
      return `<rect class="target" x="${x}" y="${y(row.target)}" width="26" height="${250 - y(row.target)}" rx="2"/><rect class="actual" x="${x + 31}" y="${y(row.actual)}" width="26" height="${250 - y(row.actual)}" rx="2" ${row.open ? 'opacity=".55"' : ''}/><text x="${x + 28}" y="276" text-anchor="middle">T${row.month}${row.open ? ' · Tạm tính' : ''}</text>`;
    }).join('')}</svg>`;
  }
  function charts(state) {
    return `<section class="panel"><div class="panel-head"><h2>So sánh thành viên</h2><div class="filters">${metricSelect(state)}</div></div><div class="panel-body"><div class="toolbar"><div class="segmented"><button data-comparison="value" aria-pressed="${state.comparison === 'value'}">Giá trị</button><button data-comparison="percent" aria-pressed="${state.comparison === 'percent'}">% hoàn thành</button></div><span class="unit">${state.comparison === 'percent' ? '%' : M.metricOf(state).unit}</span></div><div class="chart-scroll">${memberChart(state)}</div><div class="legend"><span>Thực hiện</span><span class="target">Kế hoạch</span></div></div></section><section class="panel"><div class="panel-head"><h2>${M.metricOf(state).label} theo tháng</h2><span class="unit">${M.metricOf(state).unit} · Từng tháng</span></div><div class="panel-body"><div class="chart-scroll">${trendChart(state)}</div><div class="legend"><span>Thực hiện</span><span class="target">Kế hoạch</span></div></div></section>`;
  }
  function targets(state) {
    const metric = M.metricOf(state), rows = M.visibleRows(state, state.cumulative), sum = scopeTotal(state, state.cumulative);
    const audit = state.area === 'team' && M.capabilities(state).team ? state.audit.filter(entry => entry.teamId === state.teamId) : [];
    return `<section class="panel"><div class="panel-head"><h2>Chỉ tiêu theo ${state.cumulative ? 'lũy kế' : 'tháng'}</h2><div class="filters">${metricSelect(state)}${M.capabilities(state).allocate && !state.cumulative ? '<button class="primary" data-action="allocate">Phân bổ chỉ tiêu</button>' : ''}</div></div><div class="panel-body unit">${metric.unit}${state.cumulative && metric.kind === 'stock' ? ` · Số dư cuối tháng ${state.month}, không cộng các tháng` : ''}</div><div class="table-scroll"><table><thead><tr><th>Thành viên</th><th class="number">Kế hoạch</th><th class="number">Thực hiện</th><th class="number">Chênh lệch</th><th class="number">Hoàn thành</th></tr></thead><tbody>${rows.map(row => `<tr data-member="${row.member.id}"><td>${escape(row.member.name)}</td><td class="number">${M.format(row.target, metric)}</td><td class="number">${amount(row.actual, metric)}</td><td class="number">${amount(row.gap, metric)}</td><td class="number">${completion(row.completion)}</td></tr>`).join('')}${state.area === 'team' && M.unallocated(state, state.cumulative) > 0 ? `<tr><td>Chưa phân bổ</td><td class="number">${M.format(M.unallocated(state, state.cumulative), metric)}</td><td colspan="3"></td></tr>` : ''}<tr class="total"><td>TỔNG CỘNG</td><td class="number">${M.format(sum.target, metric)}</td><td class="number">${amount(sum.actual, metric)}</td><td class="number">${amount(sum.gap, metric)}</td><td class="number">${completion(sum.completion)}</td></tr></tbody></table></div></section>${audit.length ? `<section class="panel"><div class="panel-head"><h2>Lịch sử phân bổ trong phiên</h2></div><div class="panel-body">${audit.map(entry => `<p>Tháng ${entry.month} · ${M.metricOf(entry).label} · ${escape(entry.reason)}</p>`).join('')}</div></section>` : ''}`;
  }
  function roster(state) {
    return `<section class="panel"><div class="panel-head"><h2>Thành viên team</h2>${M.capabilities(state).manageTeam ? '<button data-action="manage-team">Quản lý team</button>' : ''}</div><div class="table-scroll"><table><thead><tr><th>Thành viên</th><th>Vai trò</th><th>Ngày tham gia</th><th>KPI cá nhân</th></tr></thead><tbody>${M.teamOf(state).members.map(member => `<tr data-member="${member.id}"><td>${escape(member.name)}</td><td>${member.role}</td><td>${member.since}</td><td><button class="name-button" data-open-member="${member.id}">Xem KPI</button></td></tr>`).join('')}</tbody></table></div></section>`;
  }
  function leaderScore(state) {
    return `<section class="panel"><div class="panel-head"><h2>KPI Leader · SRBO</h2><span class="unit">Tháng ${state.month}/2026</span></div><div class="policy"><div><span>Nhân sự thuộc team</span><strong>5</strong></div><div><span>Điểm kế hoạch</span><strong>—</strong></div><div><span>Điểm thực hiện</span><strong>—</strong></div><div><span>Hệ số quản lý</span><strong>—</strong></div></div><div class="table-scroll"><table><thead><tr><th>Nhân sự trực thuộc</th><th>Tính KPI Leader</th><th class="number">Điểm kế hoạch</th><th class="number">Điểm thực hiện</th><th class="number">Hoàn thành</th></tr></thead><tbody>${M.teamOf(state).members.filter(member => member.role !== 'Leader').map(member => `<tr><td>${escape(member.name)}</td><td>Chờ cấu hình</td><td class="number">—</td><td class="number">—</td><td class="number">—</td></tr>`).join('')}<tr class="total"><td>TỔNG CỘNG</td><td></td><td class="number">—</td><td class="number">—</td><td class="number">—</td></tr></tbody></table></div><div class="summary-line unavailable">Chờ cấu hình quy đổi điểm, hệ số quản lý và điều kiện thưởng theo chính sách.</div></section>`;
  }
  function fees(state) {
    const metric = M.metricOf({ metricId: 'fees' });
    return `<section class="panel"><div class="panel-head"><h2>Chi tiết phí dịch vụ</h2><span class="unit">Triệu đồng · Dữ liệu mô phỏng</span></div><div class="fee-list">${M.feeComponents(state).map(row => `<div><span>${row.label}</span><strong>${amount(row.value, metric)}</strong></div>`).join('')}</div></section>`;
  }
  function personalScore() {
    return '<section class="panel"><div class="panel-head"><h2>Điểm KPI · RBO</h2></div><div class="policy"><div><span>Điểm kế hoạch</span><strong>—</strong></div><div><span>Điểm thực hiện</span><strong>—</strong></div><div><span>Hoàn thành theo điểm</span><strong>—</strong></div><div><span>Thưởng dự kiến</span><strong>—</strong></div></div><div class="summary-line unavailable">Chờ cấu hình quy đổi điểm và chính sách thưởng.</div></section>';
  }
  function render(state) {
    const team = M.teamOf(state), personal = state.area === 'personal';
    const member = M.visibleRows({ ...state, area: 'personal' })[0].member;
    return `<nav class="area-tabs" aria-label="Góc nhìn tổng quan">${button('data-area', 'personal', 'Cá nhân', personal)}${M.capabilities(state).team ? button('data-area', 'team', 'Team', !personal) : ''}</nav><div class="title-row"><div><h1>${personal ? `KPI · ${escape(member.name)}` : team.name}</h1><span class="meta">${personal ? 'RBO' : 'Leader · SRBO'} · ${state.month === 10 ? 'Tạm tính đến 20/10/2026' : `Đã chốt tháng ${state.month}/2026`}</span></div><div class="filters">${state.role === 'admin' ? `<label>Team <select id="team">${M.teams.map(team => `<option value="${team.id}" ${team.id === state.teamId ? 'selected' : ''}>${team.name}</option>`).join('')}</select></label>` : ''}<label>Kỳ <select id="month">${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}" ${state.month === index + 1 ? 'selected' : ''}>Tháng ${index + 1}/2026</option>`).join('')}</select></label></div></div>${personal ? `<div class="toolbar"><a class="own-link" href="/dashboard" data-action="dashboard">Mở Dashboard hiện tại</a></div>` : `<nav class="subnav" aria-label="Nội dung team">${[['overview', 'Tổng quan team'], ['targets', 'Chỉ tiêu KPI'], ['score', 'KPI Leader · SRBO'], ['members', 'Thành viên']].map(([value, label]) => button('data-view', value, label, state.view === value)).join('')}</nav>`}${!['members', 'score'].includes(state.view) || personal ? `<div class="toolbar"><div class="segmented"><button data-period="month" aria-pressed="${!state.cumulative}">Tháng</button><button data-period="year" aria-pressed="${state.cumulative}">Lũy kế năm</button></div></div>` : ''}${personal ? `${personalScore()}${kpiTable(state)}${targets(state)}${fees(state)}` : state.view === 'overview' ? `${summary(state)}${kpiTable(state)}${charts(state)}` : state.view === 'targets' ? `${targets(state)}${state.metricId === 'fees' ? fees(state) : ''}` : state.view === 'score' ? leaderScore(state) : roster(state)}`;
  }
  function allocation(state) {
    const metric = M.metricOf(state);
    return `<form id="allocation-form"><div class="dialog-head"><h2>Phân bổ chỉ tiêu · Tháng ${state.month}</h2><span class="unit">${metric.unit}</span></div><div class="dialog-body"><h3>${metric.label}</h3>${M.rows(state).map(row => `<label>${escape(row.member.name)}<input name="${row.member.id}" aria-label="Chỉ tiêu ${escape(row.member.name)}" type="number" min="0" step="${metric.divisor === 1 ? 1 : .001}" value="${row.target / metric.divisor}" required></label>`).join('')}<div id="allocation-remaining" class="allocation-summary"></div><label>Lý do điều chỉnh<textarea name="reason" required></textarea></label><div id="allocation-error" class="error" role="alert"></div><div class="unit">Lưu bản nháp trong phiên mockup.</div></div><div class="dialog-actions"><button type="button" data-action="cancel">Hủy</button><button class="primary" type="submit">Lưu phân bổ</button></div></form>`;
  }
  return { render, allocation, escape };
})();
