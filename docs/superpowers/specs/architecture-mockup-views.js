globalThis.MockupViews = (() => {
  const M = globalThis.MockupModel;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const button = (label, screen, customerId = '') => `<button type="button" data-screen="${screen}" data-customer="${customerId}">${escape(label)}</button>`;
  const iconPaths = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    credit: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    finance: '<path d="M3 3v18h18M7 15l5-5 4 3 5-8M16 5h5v5"/>',
    dossier: '<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/>',
    retail: '<path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5"/>',
    reference: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    system: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  };
  const icon = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[id]}</svg>`;
  function content(state) {
    const screen = M.getScreen(state.screen);
    return `<div class="screen-heading"><h1>${screen.label}</h1></div>
      <section class="panel"><div class="panel-heading"><h2>Giữ nguyên giao diện chức năng hiện tại</h2></div>
      <div class="panel-body actions"><a class="button-link primary-button" href="${escape(M.liveUrlFor(screen))}" target="_blank" rel="noopener noreferrer">Mở ${escape(screen.label.toLowerCase())} hiện tại ↗</a></div></section>`;
  }
  function render(state) {
    const screen = M.getScreen(state.screen);
    const group = M.groups.find(item => item.id === screen.group);
    const customer = M.getCustomer(state.customerId);
    const scoped = customer && M.isScoped(screen);
    return {
      primary: M.visibleGroups(state.permission).map(item => `<button type="button" data-group="${item.id}"${item.id === screen.group ? ' aria-current="page"' : ''}>${icon(item.id)}<span>${item.label}</span></button>`).join(''),
      secondary: M.visibleScreens(state.permission).filter(item => item.group === screen.group && item.scope !== 'customer').map(item => `<button type="button" data-screen="${item.id}"${item.id === screen.id || (screen.id === 'profile' && item.id === 'customers') ? ' aria-current="page"' : ''}>${item.label}</button>`).join(''),
      title: group.label,
      breadcrumb: `<span>${group.label}</span><span aria-hidden="true">/</span><strong>${screen.label}</strong>`,
      context: scoped ? `<div><strong>${escape(customer.name)}</strong><span class="detail">CIF ${customer.cif}</span></div><label>Khách hàng <select id="customer-select">${M.customers.map(item => `<option value="${item.id}"${item.id === customer.id ? ' selected' : ''}>${escape(item.name)}</option>`).join('')}</select></label><button type="button" data-action="all-customers">Toàn danh mục</button>` : '',
      tabs: customer && screen.tab ? M.visibleScreens(state.permission).filter(item => item.tab).map(item => `<button type="button" data-screen="${item.id}" data-customer="${customer.id}"${item.id === screen.id ? ' aria-current="page"' : ''}>${item.label}</button>`).join('') : '',
      content: content(state),
    };
  }
  const searchResults = (query, permission) => {
    const results = M.search(query, permission);
    return results.length ? results.map(item => button(item.label, item.screen, item.customerId ?? '')).join('') : '<p class="empty">Không tìm thấy kết quả.</p>';
  };
  return { render, searchResults };
})();
