import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  FileSignature,
  Target,
  CreditCard,
  PackageCheck,
  Receipt,
  ClipboardList,
  Building2,
  Landmark,
  Search,
  ArrowRight,
  ArrowLeft,
  LayoutGrid,
} from 'lucide-react';

interface HubCardItem {
  id: string;
  title: string;
  path: string;
  icon: React.ElementType;
  keywords: string[];
}

const CARDS: HubCardItem[] = [
  {
    id: 'templates',
    title: 'Hồ sơ chứng từ & Soạn hợp đồng',
    path: '/hub/documents',
    icon: FileSignature,
    keywords: ['chung tu', 'hop dong', 'ho so', 'bieu mau', 'template'],
  },
  {
    id: 'disbursement',
    title: 'Thông tin giải ngân & Người thụ hưởng',
    path: '/hub/disbursement',
    icon: Landmark,
    keywords: ['thong tin giai ngan', 'giai ngan', 'thu huong', 'stk', 'ngan hang', 'disbursement', 'payee'],
  },
  {
    id: 'mdsdv',
    title: 'Tra cứu mục đích sử dụng vốn (MDSDV)',
    path: '/hub/mdsdv',
    icon: Target,
    keywords: ['mdsdv', 'muc dich', 'su dung von', 'ma nganh'],
  },
  {
    id: 'card-policies',
    title: 'Tra cứu mã phí & Quy định thẻ',
    path: '/hub/card-fees',
    icon: CreditCard,
    keywords: ['the', 'ma phi', 'chinh sach the', 'card'],
  },
  {
    id: 'corporate-financial',
    title: 'Báo cáo tài chính doanh nghiệp (TT 133)',
    path: '/hub/corporate-financial',
    icon: Building2,
    keywords: ['bctc', 'doanh nghiep', 'bao cao tai chinh', 'tt133', 'can doi ke toan', 'ket qua kinh doanh'],
  },
  {
    id: 'shopping-checklist',
    title: 'Dự toán mua sắm vật dụng',
    path: '/hub/shopping',
    icon: PackageCheck,
    keywords: ['mua sam', 'vat dung', 'noi that', 'checklist', 'du toan'],
  },
  {
    id: 'retail-invoice',
    title: 'Lập & In hóa đơn bán lẻ',
    path: '/hub/invoice',
    icon: Receipt,
    keywords: ['hoa don', 'ban le', 'invoice', 'bien lai'],
  },
  {
    id: 'purchase-statement',
    title: 'Bảng kê thu mua hàng hóa',
    path: '/hub/statement',
    icon: ClipboardList,
    keywords: ['bang ke', 'thu mua', 'statement', 'tt133'],
  },
];

export const WorkspaceHubView: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return CARDS;
    const q = searchQuery.toLowerCase().trim();
    return CARDS.filter(
      c =>
        c.title.toLowerCase().includes(q) ||
        c.keywords.some(k => k.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 font-app animate-in fade-in duration-150 py-2 sm:py-4">
      {/* Thanh tiêu đề tối giản chuẩn mực */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line/70">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-panel hover:bg-surface text-ink text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Quay về giao diện CRM chính"
          >
            <ArrowLeft size={14} className="text-ink-muted" />
            <span>Về CRM</span>
          </button>
          <div className="h-4 w-px bg-line/80" />
          <div className="flex items-center gap-2">
            <LayoutGrid size={16} className="text-ink-muted" />
            <h1 className="text-base sm:text-lg font-bold text-ink">
              Danh Mục Tác Vụ Độc Lập
            </h1>
          </div>
        </div>

        {/* Ô tìm kiếm nhanh */}
        <div className="w-full sm:w-64">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm tác vụ..."
              className="w-full rounded-lg pl-8 pr-3 py-1.5 bg-panel border border-line focus:border-ink-muted text-xs text-ink placeholder:text-ink-faint transition-all outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Lưới các thẻ Card ngắn gọn, không chú thích thừa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => navigate(card.path)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-panel hover:bg-surface hover:border-ink-muted text-left transition-all cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-surface border border-line text-ink-muted group-hover:text-ink shrink-0 transition-colors">
                  <Icon size={18} />
                </div>
                <span className="font-semibold text-xs sm:text-sm text-ink truncate group-hover:text-accent transition-colors">
                  {card.title}
                </span>
              </div>
              <ArrowRight
                size={15}
                className="text-ink-faint group-hover:text-ink group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
              />
            </button>
          );
        })}
      </div>

      {filteredCards.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-line bg-panel/50 text-xs text-ink-muted">
          Không tìm thấy tác vụ phù hợp với "{searchQuery}"
        </div>
      )}
    </div>
  );
};
