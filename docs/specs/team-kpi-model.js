globalThis.TeamKpiModel = (() => {
  const metrics = [
    { id: 'loanNet', label: 'Tăng ròng cho vay', short: 'Cho vay', kind: 'net', unit: 'tỷ đồng', divisor: 1e9, digits: 2 },
    { id: 'termNet', label: 'Tăng ròng huy động có kỳ hạn', short: 'Huy động có kỳ hạn', kind: 'net', unit: 'tỷ đồng', divisor: 1e9, digits: 2 },
    { id: 'casaNet', label: 'Tăng ròng CASA', short: 'CASA', kind: 'net', unit: 'tỷ đồng', divisor: 1e9, digits: 2 },
    { id: 'customers', label: 'Khách hàng mới', short: 'Khách hàng mới', kind: 'flow', unit: 'khách hàng', divisor: 1, digits: 0 },
    { id: 'fees', label: 'Phí dịch vụ', short: 'Phí dịch vụ', kind: 'flow', unit: 'triệu đồng', divisor: 1e6, digits: 1 },
    { id: 'debt', label: 'Quy mô dư nợ quản lý', short: 'Dư nợ quản lý', kind: 'stock', unit: 'tỷ đồng', divisor: 1e9, digits: 2 },
    { id: 'cards', label: 'Thẻ tín dụng', short: 'Thẻ tín dụng', kind: 'flow', unit: 'thẻ', divisor: 1, digits: 0 },
  ];
  const teams = [
    { id: 'a', name: 'Team Khách hàng A', factor: 1, members: [
      { id: 'a1', name: 'Nguyễn Minh Anh', role: 'Leader', since: '01/01/2026' },
      { id: 'a2', name: 'Trần Quốc Bảo', role: 'Thành viên', since: '01/01/2026' },
      { id: 'a3', name: 'Lê Thu Hà', role: 'Thành viên', since: '01/01/2026' },
      { id: 'a4', name: 'Phạm Đức Long', role: 'Thành viên', since: '01/01/2026' },
      { id: 'a5', name: 'Võ Ngọc Mai', role: 'Thành viên', since: '01/01/2026' },
    ] },
    { id: 'b', name: 'Team Khách hàng B', factor: 0.8, members: [
      { id: 'b1', name: 'Hoàng Thanh Bình', role: 'Leader', since: '01/01/2026' },
      { id: 'b2', name: 'Đỗ Thu Phương', role: 'Thành viên', since: '01/01/2026' },
      { id: 'b3', name: 'Bùi Anh Tuấn', role: 'Thành viên', since: '01/01/2026' },
      { id: 'b4', name: 'Phan Minh Châu', role: 'Thành viên', since: '01/01/2026' },
      { id: 'b5', name: 'Ngô Thảo Vy', role: 'Thành viên', since: '01/01/2026' },
    ] },
  ];
  const base = {
    loanNet: { target: [1.5e9, 2e9, 1.2e9, 1.8e9, 1.5e9], actual: [1.7e9, 1.8e9, 1.35e9, 1.1e9, -0.2e9] },
    termNet: { target: [2e9, 2.5e9, 1.5e9, 2e9, 2e9], actual: [2.2e9, 2.4e9, 1.7e9, -0.3e9, 1.5e9] },
    casaNet: { target: [0.5e9, 0.6e9, 0.4e9, 0.5e9, 0.5e9], actual: [0.6e9, 0.7e9, 0.35e9, 0.4e9, -0.05e9] },
    customers: { target: [6, 8, 5, 7, 6], actual: [7, 6, 6, 5, 4] },
    fees: { target: [60e6, 90e6, 55e6, 70e6, 65e6], actual: [65e6, 82e6, 60e6, 51e6, 48e6] },
    debt: { target: [30e9, 35e9, 26e9, 31e9, 28e9], actual: [28.4e9, 31.2e9, 25.6e9, 27.8e9, 21e9] },
    cards: { target: [3, 4, 2, 3, 3], actual: [3, 3, 2, 1, 2] },
  };
  const createState = () => ({
    role: 'leader', teamId: 'a', month: 9, metricId: 'loanNet', area: 'team',
    view: 'overview', cumulative: false, comparison: 'value', allocations: {}, audit: [], memberId: null,
  });
  const metricOf = state => metrics.find(metric => metric.id === state.metricId);
  const teamOf = state => teams.find(team => team.id === state.teamId);
  const capabilities = state => ({
    team: state.role !== 'member',
    allocate: state.role !== 'member' && state.month === 10 && state.area === 'team',
    manageTeam: state.role === 'admin',
  });
  const completion = (actual, target) => actual == null || target == null || target <= 0 ? null : Math.round(actual / target * 1000) / 10;
  const allocationKey = state => `${state.teamId}:${state.month}:${state.metricId}`;
  function monthlyRow(state, member, index, month) {
    const metric = metricOf(state);
    const step = metric.kind === 'stock' ? 0.64 + month * 0.04 : 0.55 + month * 0.05;
    const goalStep = 0.75 + month / 36;
    const asOf = month === 10 && metric.kind !== 'stock' ? 0.67 : 1;
    const round = value => metric.divisor > 1 ? Math.round(value / 1e6) * 1e6 : Math.round(value);
    const defaults = base[metric.id];
    const factor = teamOf(state).factor;
    const defaultTarget = round(defaults.target[index] * goalStep * factor);
    const override = state.allocations[allocationKey({ ...state, month })]?.[member.id];
    return {
      member, target: override ?? defaultTarget, defaultTarget,
      actual: round(defaults.actual[index] * step * asOf * factor),
    };
  }
  function rows(state, cumulative = false) {
    return teamOf(state).members.map((member, index) => {
      const periods = cumulative && metricOf(state).kind !== 'stock'
        ? Array.from({ length: state.month }, (_, i) => monthlyRow(state, member, index, i + 1))
        : [monthlyRow(state, member, index, state.month)];
      const target = periods.reduce((sum, row) => sum + row.target, 0);
      const actual = periods.reduce((sum, row) => sum + row.actual, 0);
      return { member, target, actual, gap: actual - target, completion: completion(actual, target) };
    });
  }
  const visibleRows = (state, cumulative = false) => state.role === 'member' || state.area === 'personal'
    ? rows(state, cumulative).filter(row => row.member.id === (state.role === 'member' ? `${state.teamId}2` : state.memberId ?? `${state.teamId}1`))
    : rows(state, cumulative);
  function total(state, cumulative = false) {
    const team = teamOf(state);
    const months = cumulative && metricOf(state).kind !== 'stock' ? Array.from({ length: state.month }, (_, i) => i + 1) : [state.month];
    const target = months.reduce((sum, month) => sum + team.members.reduce((subtotal, member, index) => subtotal + monthlyRow(state, member, index, month).defaultTarget, 0), 0);
    const actual = rows(state, cumulative).reduce((sum, row) => sum + row.actual, 0);
    return { target, actual, gap: actual - target, completion: completion(actual, target) };
  }
  const unallocated = (state, cumulative = false) => total(state, cumulative).target - rows(state, cumulative).reduce((sum, row) => sum + row.target, 0);
  const series = state => Array.from({ length: Math.min(6, state.month) }, (_, i) => {
    const month = state.month - Math.min(6, state.month) + i + 1;
    return { month, ...total({ ...state, month }), open: month === 10 };
  });
  const format = (value, metric) => value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: metric.digits }).format(value / metric.divisor);
  const percent = value => value == null ? '—' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value)}%`;
  function allocate(state, values, reason) {
    if (!capabilities(state).allocate) return { ok: false, error: 'Kỳ đã chốt hoặc tài khoản không có quyền phân bổ.' };
    if (!reason.trim()) return { ok: false, error: 'Nhập lý do điều chỉnh.' };
    const members = teamOf(state).members;
    const entries = members.map(member => values[member.id]);
    if (Object.keys(values).length !== members.length || entries.some(value => !Number.isSafeInteger(value) || value < 0)) {
      return { ok: false, error: 'Chỉ tiêu phải là số nguyên không âm, đủ tất cả thành viên.' };
    }
    if (entries.reduce((sum, value) => sum + value, 0) > total(state).target) return { ok: false, error: 'Tổng phân bổ vượt chỉ tiêu team.' };
    return { ok: true, state: {
      ...state,
      allocations: { ...state.allocations, [allocationKey(state)]: { ...values } },
      audit: [...state.audit, { teamId: state.teamId, month: state.month, metricId: state.metricId, reason: reason.trim(), version: state.audit.length + 1 }],
    } };
  }
  function feeComponents(state) {
    const feeState = { ...state, metricId: 'fees' };
    const fee = state.area === 'personal' ? visibleRows(feeState, state.cumulative)[0].actual : total(feeState, state.cumulative).actual;
    const components = [
      ['Số đẹp', .2], ['Phi nhân thọ', .3], ['Nhân thọ', .15], ['Hủy bảo hiểm', -.05],
      ['Hoạt động tín dụng', .2], ['FX', .08],
    ].map(([label, share]) => ({ label, value: Math.round(fee * share) }));
    return [...components, { label: 'Dịch vụ tại quầy & NHĐT', value: fee - components.reduce((sum, row) => sum + row.value, 0) }];
  }
  return { metrics, teams, createState, metricOf, teamOf, capabilities, completion, rows, visibleRows, total, unallocated, series, format, percent, allocate, feeComponents };
})();
