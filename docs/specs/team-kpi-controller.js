(() => {
  const M = globalThis.TeamKpiModel, V = globalThis.TeamKpiViews;
  const embedded = new URLSearchParams(location.search).get('embedded') === '1';
  document.documentElement.classList.toggle('embedded', embedded);
  let state = M.createState(), noticeTimer;
  const app = document.getElementById('app'), dialog = document.getElementById('allocation-dialog');
  const render = () => {
    app.innerHTML = V.render(state);
    document.querySelector('.topbar span').textContent = M.teamOf(state).members[state.role === 'member' ? 1 : 0].name;
    if (embedded) {
      app.querySelector('[data-area="personal"]').textContent = 'KPI cá nhân';
      const teamTab = app.querySelector('[data-area="team"]');
      if (teamTab) teamTab.textContent = 'KPI team';
    }
  };
  const notice = text => {
    clearTimeout(noticeTimer);
    document.getElementById('notice').textContent = text;
    noticeTimer = setTimeout(() => { document.getElementById('notice').textContent = ''; }, 4000);
  };
  document.addEventListener('change', event => {
    const { id, value } = event.target;
    if (id === 'preview-role') {
      state = { ...state, role: value, area: value === 'member' ? 'personal' : 'team', view: value === 'member' ? 'targets' : 'overview', memberId: null };
    } else if (id === 'month') state = { ...state, month: Number(value) };
    else if (id === 'metric') state = { ...state, metricId: value };
    else if (id === 'team' && state.role === 'admin') state = { ...state, teamId: value, memberId: null };
    else return;
    render();
    if (id !== 'preview-role') document.getElementById(id)?.focus();
  });
  document.addEventListener('click', event => {
    const target = event.target.closest('button,a');
    if (!target) return;
    const data = target.dataset;
    if (data.area) {
      if (data.area === 'team' && !M.capabilities(state).team) return;
      state = { ...state, area: data.area, memberId: null };
    } else if (data.view) state = { ...state, view: data.view };
    else if (data.period) state = { ...state, cumulative: data.period === 'year' };
    else if (data.comparison) state = { ...state, comparison: data.comparison };
    else if (data.openMember && M.capabilities(state).team) state = { ...state, memberId: data.openMember, area: 'personal' };
    else if (data.action === 'allocate' && M.capabilities(state).allocate) {
      dialog.innerHTML = V.allocation(state);
      dialog.showModal();
      updateRemaining();
      return;
    } else if (data.action === 'cancel') { dialog.close(); return; }
    else if (data.action === 'manage-team') {
      const detail = document.getElementById('detail-dialog');
      detail.innerHTML = '<div class="dialog-head"><h2>Quản lý team</h2></div><div class="empty-info"><p>Đề xuất: tạo team, gán thành viên và Leader, ngày hiệu lực và lịch sử thay đổi.</p><p>Chức năng quản trị chưa triển khai trong mockup này.</p></div><form method="dialog" class="dialog-actions"><button>Đóng</button></form>';
      detail.showModal();
      return;
    } else if (data.action === 'dashboard' && location.protocol === 'file:') {
      target.href = 'http://127.0.0.1:5173/dashboard';
      return;
    } else return;
    const attr = ['area', 'view', 'period', 'comparison'].find(key => data[key]);
    render();
    if (attr) app.querySelector(`[data-${attr}="${data[attr]}"]`)?.focus();
  });
  const readAllocation = () => Object.fromEntries(M.teamOf(state).members.map(member => {
    const input = dialog.querySelector(`[name="${member.id}"]`);
    return [member.id, input.value.trim() === '' ? NaN : Math.round(Number(input.value) * M.metricOf(state).divisor)];
  }));
  function updateRemaining() {
    const values = Object.values(readAllocation()), remaining = M.total(state).target - values.reduce((sum, value) => sum + value, 0);
    const output = document.getElementById('allocation-remaining');
    output.textContent = Number.isFinite(remaining) ? `Chưa phân bổ: ${M.format(remaining, M.metricOf(state))} ${M.metricOf(state).unit}` : 'Nhập đủ chỉ tiêu thành viên.';
    output.classList.toggle('negative-text', remaining < 0);
  }
  dialog.addEventListener('input', updateRemaining);
  dialog.addEventListener('submit', event => {
    event.preventDefault();
    const result = M.allocate(state, readAllocation(), dialog.querySelector('[name="reason"]').value);
    if (!result.ok) { document.getElementById('allocation-error').textContent = result.error; return; }
    state = result.state;
    dialog.close();
    render();
    app.querySelector('[data-action="allocate"]')?.focus();
    notice('Đã lưu phân bổ trong phiên mockup.');
  });
  render();
})();
