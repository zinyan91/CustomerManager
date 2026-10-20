(() => {
  const M = globalThis.MockupModel;
  const V = globalThis.MockupViews;
  const $ = id => document.getElementById(id);
  const state = { screen: 'dashboard', customerId: null, permission: 'full', layout: 'rail', collapsed: false, menuOpen: false };
  let noticeTimer;
  let searchTrigger;
  const small = () => window.innerWidth < 1200;
  function notice(message) {
    clearTimeout(noticeTimer);
    $('notice').textContent = message;
    $('notice').hidden = false;
    noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000);
  }
  function render(focus = false) {
    const view = V.render(state);
    $('layout').value = state.layout;
    $('permission').value = state.permission;
    $('primary').innerHTML = view.primary;
    $('secondary').innerHTML = view.secondary;
    $('drawer-title').textContent = view.title;
    $('breadcrumb').innerHTML = view.breadcrumb;
    $('customer-context').innerHTML = view.context;
    $('customer-context').hidden = !view.context;
    $('record-tabs').innerHTML = view.tabs;
    $('record-tabs').hidden = !view.tabs;
    $('workspace').innerHTML = view.content;
    $('shell').className = ['shell', state.layout === 'tabs' ? 'tabs' : '', state.collapsed ? 'collapsed' : '', state.menuOpen ? 'menu-open' : ''].filter(Boolean).join(' ');
    const visible = small() ? state.menuOpen : !state.collapsed;
    $('drawer').inert = !visible;
    $('backdrop').hidden = !state.menuOpen || !small();
    $('menu-toggle').setAttribute('aria-expanded', String(visible));
    document.body.style.overflow = state.menuOpen && small() ? 'hidden' : '';
    if (focus) $('workspace').focus();
  }
  function navigate(screenId, customerId = undefined, updateHistory = true) {
    const screen = M.getScreen(screenId);
    if (!screen || !M.allowed(screen, state.permission)) {
      notice('Chức năng không thuộc quyền xem thử hiện tại.');
      return;
    }
    const target = customerId === undefined ? state.customerId : customerId;
    state.screen = screen.id;
    state.customerId = M.isScoped(screen) && M.getCustomer(target) ? target : null;
    if (screen.scope === 'customer' && !state.customerId) state.screen = 'customers';
    state.menuOpen = false;
    if (updateHistory) {
      const path = M.pathFor(M.getScreen(state.screen), state.customerId);
      if (location.hash !== `#${path}`) history.pushState(null, '', `#${path}`);
    }
    render(true);
  }
  function routeFromHash() {
    const route = M.findRoute(location.hash.slice(1));
    if (route && M.allowed(M.getScreen(route.screen), state.permission)) navigate(route.screen, route.customerId, false);
    else navigate(M.visibleScreens(state.permission)[0].id, null);
  }
  function closeMenu() {
    state.menuOpen = false;
    render();
    $('menu-toggle').focus();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.screen) {
      if ($('search-dialog').open) $('search-dialog').close();
      navigate(button.dataset.screen, button.hasAttribute('data-customer') ? button.dataset.customer || null : undefined);
      return;
    }
    if (button.dataset.group) {
      const target = M.visibleScreens(state.permission).find(screen => screen.group === button.dataset.group && screen.scope !== 'customer');
      navigate(target.id);
      if (small()) { state.menuOpen = true; render(); $('secondary button')?.focus(); }
      return;
    }
    switch (button.dataset.action) {
      case 'toggle-menu':
        if (small()) state.menuOpen = !state.menuOpen;
        else state.collapsed = !state.collapsed;
        render();
        if (state.menuOpen) $('secondary button')?.focus();
        break;
      case 'close-menu': closeMenu(); break;
      case 'search':
        searchTrigger = button;
        $('search-input').value = '';
        $('search-results').innerHTML = V.searchResults('', state.permission);
        $('search-dialog').showModal();
        $('search-input').focus();
        break;
      case 'all-customers': navigate(M.getScreen(state.screen).scope === 'analysis' ? state.screen : 'customers', null); break;
    }
  });
  $('backdrop').addEventListener('click', closeMenu);
  $('customer-context').addEventListener('change', event => {
    if (event.target.id === 'customer-select') navigate(state.screen, event.target.value);
  });
  $('layout').addEventListener('change', event => { state.layout = event.target.value; state.menuOpen = false; render(); });
  $('theme').addEventListener('change', event => { document.documentElement.dataset.theme = event.target.value; });
  $('permission').addEventListener('change', event => {
    state.permission = event.target.value;
    const current = M.getScreen(state.screen);
    navigate(M.allowed(current, state.permission) ? current.id : M.visibleScreens(state.permission)[0].id, null);
  });
  $('search-input').addEventListener('input', event => { $('search-results').innerHTML = V.searchResults(event.target.value, state.permission); });
  $('search-dialog').addEventListener('close', () => { if (searchTrigger?.isConnected) searchTrigger.focus(); });
  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('resize', () => { state.menuOpen = false; render(); });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (!$('search-dialog').open) document.querySelector('[data-action="search"]').click();
    }
    if (event.key === 'Escape' && state.menuOpen) closeMenu();
    if (event.key === 'Tab' && state.menuOpen && small()) {
      const items = [...$('drawer').querySelectorAll('button')].filter(item => getComputedStyle(item).display !== 'none');
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  routeFromHash();
})();
