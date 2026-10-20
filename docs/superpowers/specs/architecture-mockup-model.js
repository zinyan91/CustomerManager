globalThis.MockupModel = (() => {
  const groups = [
    { id: 'overview', label: 'Tổng quan', symbol: '◫' },
    { id: 'credit', label: 'Tín dụng', symbol: '▤' },
    { id: 'finance', label: 'Phân tích', symbol: '▥' },
    { id: 'dossier', label: 'Hồ sơ & tài liệu', symbol: '▱' },
    { id: 'retail', label: 'Dự toán & hàng hóa', symbol: '▦' },
    { id: 'reference', label: 'Tra cứu', symbol: '⌕' },
    { id: 'system', label: 'Cài đặt', symbol: '⚙' },
  ];
  const screens = [
    { id: 'dashboard', group: 'overview', label: 'Bàn làm việc', path: '/dashboard', module: 'credit' },
    { id: 'customers', group: 'credit', label: 'Khách hàng', path: '/customers', module: 'credit' },
    { id: 'profile', group: 'credit', label: 'Thông tin khách hàng', path: '/customers/:customerId/profile', module: 'credit', scope: 'customer', tab: true },
    { id: 'credit-contracts', group: 'credit', label: 'Hợp đồng tín dụng', path: '/credit-contracts', module: 'credit', scope: 'optional', tab: true },
    { id: 'collaterals', group: 'credit', label: 'Tài sản bảo đảm', path: '/collaterals', module: 'credit', scope: 'optional', tab: true },
    { id: 'mortgage-contracts', group: 'credit', label: 'Hợp đồng thế chấp', path: '/mortgage-contracts', module: 'credit', scope: 'optional', tab: true },
    { id: 'disbursement', group: 'credit', label: 'Thông tin giải ngân', path: '/hub/disbursement', module: 'credit' },
    { id: 'loans', group: 'credit', label: 'KUNN & lịch trả nợ', path: '/loans', module: 'credit', scope: 'optional', tab: true },
    { id: 'credit-cards', group: 'credit', label: 'Thẻ tín dụng', path: '/credit-cards', module: 'credit', scope: 'optional', tab: true },
    { id: 'post-loan', group: 'credit', label: 'Kiểm soát sau vay', path: '/post-loan-control', module: 'credit', scope: 'optional', tab: true },
    { id: 'corporate-financial', group: 'finance', label: 'Báo cáo tài chính', path: '/hub/corporate-financial', module: 'tools', scope: 'analysis' },
    { id: 'business-plan', group: 'finance', label: 'Phương án kinh doanh', path: '/tools/business-plan', module: 'tools', scope: 'analysis' },
    { id: 'toi', group: 'finance', label: 'Dự phóng TOI', path: '/hub/toi', module: 'rates', scope: 'analysis' },
    { id: 'calculators', group: 'finance', label: 'Công cụ tính', path: '/tools/calculators', module: 'tools' },
    { id: 'rate-quote', group: 'finance', label: 'Chào lãi suất', path: '/tools/rate-quote', module: 'rates' },
    { id: 'cof', group: 'finance', label: 'Giá vốn nội bộ', path: '/hub/cof', module: 'rates' },
    { id: 'templates', group: 'dossier', label: 'Biểu mẫu', path: '/hub/documents', module: 'credit' },
    { id: 'dispatches', group: 'dossier', label: 'Văn thư', path: '/dispatches', module: 'dispatch' },
    { id: 'storage', group: 'dossier', label: 'Kho tệp', path: '/storage', module: 'storage' },
    { id: 'office', group: 'dossier', label: 'Office', path: '/office', module: 'tools' },
    { id: 'reports', group: 'dossier', label: 'Báo cáo tổng hợp', path: '/hub/reports', module: 'tools' },
    { id: 'estimate', group: 'retail', label: 'Dự toán công trình', path: '/hub/estimate', module: 'inventory' },
    { id: 'shopping', group: 'retail', label: 'Bảng kê mua sắm', path: '/hub/shopping', module: 'inventory' },
    { id: 'invoice', group: 'retail', label: 'Hóa đơn bán lẻ', path: '/hub/invoice', module: 'inventory' },
    { id: 'statement', group: 'retail', label: 'Bảng kê thu mua', path: '/hub/statement', module: 'inventory' },
    { id: 'inventory', group: 'retail', label: 'Kho hàng', path: '/tools/inventory', module: 'inventory' },
    { id: 'mdsdv', group: 'reference', label: 'Mục đích sử dụng vốn', path: '/hub/mdsdv', module: 'tools' },
    { id: 'card-policies', group: 'reference', label: 'Chính sách thẻ', path: '/hub/card-fees', module: 'tools' },
    { id: 'quiz', group: 'reference', label: 'Ôn tập nghiệp vụ', path: '/hub/quiz', module: 'quiz' },
    { id: 'settings', group: 'system', label: 'Cài đặt cá nhân', path: '/settings', module: null },
    { id: 'admin', group: 'system', label: 'Quản trị người dùng', path: '/admin', module: null, adminOnly: true },
  ];
  const customers = [
    { id: '101', name: 'Công ty CP Thép Nam Hà', cif: '28489102', contract: 'HDTD/2025/082', loan: 'KUNN/2026/089' },
    { id: '102', name: 'Nguyễn Văn An', cif: '28489103', contract: 'HDTD/2025/119', loan: 'KUNN/2026/012' },
  ];
  const presets = {
    full: { modules: ['credit', 'tools', 'rates', 'dispatch', 'storage', 'inventory', 'quiz'], admin: true },
    credit: { modules: ['credit'], admin: false },
    dispatch: { modules: ['dispatch'], admin: false },
    rates: { modules: ['rates'], admin: false },
  };
  const allowed = (screen, preset) => (!screen.module || presets[preset].modules.includes(screen.module)) && (!screen.adminOnly || presets[preset].admin);
  const visibleScreens = preset => screens.filter(screen => allowed(screen, preset));
  const visibleGroups = preset => groups.filter(group => visibleScreens(preset).some(screen => screen.group === group.id));
  const getScreen = id => screens.find(screen => screen.id === id);
  const getCustomer = id => customers.find(customer => customer.id === id);
  const isScoped = screen => ['customer', 'optional', 'analysis'].includes(screen.scope);
  const liveUrlFor = screen => `https://customer-manager-eta.vercel.app${screen.id === 'profile' ? '/customers' : screen.path}`;
  const pathFor = (screen, customerId) => {
    if (screen.id === 'profile') return screen.path.replace(':customerId', customerId);
    if (customerId && screen.scope === 'optional') return `/customers/${customerId}${screen.path}`;
    if (customerId && screen.scope === 'analysis') return `${screen.path}?customerId=${customerId}`;
    return screen.path;
  };
  const findRoute = path => {
    const [pathname, query] = path.split('?');
    const direct = screens.find(screen => screen.path === pathname);
    if (direct) {
      const id = new URLSearchParams(query).get('customerId');
      return { screen: direct.id, customerId: direct.scope === 'analysis' && getCustomer(id) ? id : null };
    }
    const match = pathname.match(/^\/customers\/(\d+)(\/.*)$/);
    if (!match || !getCustomer(match[1])) return null;
    const screen = match[2] === '/profile' ? getScreen('profile') : screens.find(item => item.scope === 'optional' && item.path === match[2]);
    return screen ? { screen: screen.id, customerId: match[1] } : null;
  };
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
  const search = (query, preset) => {
    const value = normalize(query.trim());
    const results = visibleScreens(preset).filter(screen => screen.scope !== 'customer').map(screen => ({ screen: screen.id, label: screen.label, customerId: null }));
    if (presets[preset].modules.includes('credit')) {
      customers.forEach(customer => {
        results.push({ screen: 'profile', label: `${customer.name} · ${customer.cif}`, customerId: customer.id });
        results.push({ screen: 'credit-contracts', label: customer.contract, customerId: customer.id });
        results.push({ screen: 'loans', label: customer.loan, customerId: customer.id });
      });
    }
    return results.filter(result => normalize(result.label).includes(value));
  };
  return { groups, screens, customers, presets, allowed, visibleScreens, visibleGroups, getScreen, getCustomer, isScoped, liveUrlFor, pathFor, findRoute, search };
})();
