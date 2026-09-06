import React from 'react';
import { UI } from '../../lib/uiClasses';
import { Search, Info } from 'lucide-react';
import { fmtNumber } from '../../lib/utils';
import { useMdsdvController, RESULT_LIMIT } from '../../hooks/useMdsdvController';
import { MdsdvFilterHeader } from '../mdsdv/MdsdvFilterHeader';
import { MdsdvTableView } from '../mdsdv/MdsdvTableView';

export const MdsdvLookupView: React.FC = () => {
  const {
    query,
    setQuery,
    level1Code,
    setLevel1Code,
    overdraftOnly,
    setOverdraftOnly,
    level1Options,
    search,
  } = useMdsdvController();

  const cardBg = UI.containerCardBg;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Card */}
      <MdsdvFilterHeader
        query={query}
        setQuery={setQuery}
        level1Code={level1Code}
        setLevel1Code={setLevel1Code}
        overdraftOnly={overdraftOnly}
        setOverdraftOnly={setOverdraftOnly}
        level1Options={level1Options}
      />

      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs tracking-tight text-ink uppercase">
            KẾT QUẢ TÌM KIẾM
          </span>
          <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent font-mono font-bold text-xs border border-accent/30">
            {fmtNumber(search.total)} mã
          </span>
        </div>

        {search.truncated && (
          <span className="text-[11px] text-warn font-medium hidden md:inline">
            ⚠️ Hiển thị {fmtNumber(RESULT_LIMIT)} kết quả đầu — gõ thêm từ khoá để thu hẹp
          </span>
        )}
      </div>

      {/* Main Results Content */}
      {search.items.length === 0 ? (
        <div className={`${cardBg} rounded-xl p-12 border border-line text-center space-y-3`}>
          <div className="w-12 h-12 rounded-full bg-panel-muted text-ink-faint flex items-center justify-center mx-auto border border-line">
            <Search className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-ink">Không tìm thấy mục đích sử dụng vốn phù hợp</div>
          <p className="text-xs text-ink-faint max-w-md mx-auto">
            Hãy thử tìm bằng từ khóa không dấu, mã ngành cấp 5 (vd: <code className="text-accent font-mono">CEA01110</code>), hoặc mã cấp 6 (vd: <code className="text-accent font-mono">CEA0111001</code>).
          </p>
          {(query || level1Code || overdraftOnly) && (
            <button
              type="button"
              onClick={() => { setQuery(''); setLevel1Code(''); setOverdraftOnly(false); }}
              className="px-3 py-1.5 rounded-lg bg-accent text-accent-ink text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <MdsdvTableView items={search.items} />
      )}

      {/* Footer Instructions & Rules Card */}
      <div className={`${cardBg} rounded-xl p-3.5 border border-line text-xs text-ink-faint flex items-start space-x-2.5`}>
        <div className="p-1.5 rounded-md bg-accent-soft text-accent shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-ink text-xs">
            Quy chuẩn Mã Mục đích sử dụng vốn (MĐSDV / FBE) theo Thông tư NHNN:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div>
              • <strong>Mã Cấp 5 (8 ký tự)</strong>: Mã hóa ngành kinh tế (ví dụ: <code className="font-mono text-accent">CEA01110</code> — Trồng lúa).
            </div>
            <div>
              • <strong>Mã Cấp 6 (10-11 ký tự)</strong>: Ghép giữa Mã Cấp 5 + Mã đuôi mục đích (ví dụ: <code className="font-mono text-accent">CEA0111001</code> — Bổ sung vốn lưu động).
            </div>
            <div>
              • <strong>Đặc thù Thấu chi</strong>: Các mã có gắn nhãn <span className="font-bold text-pos">THẤU CHI</span> mới được phép mở tài khoản thấu chi trên Core Banking.
            </div>
            <div>
              • <strong>Sao chép mã</strong>: Bấm vào ô <strong>Mã Cấp 5</strong> hoặc <strong>Quy ước FBE</strong> để chọn nhanh toàn bộ, rồi copy tay dán vào tờ trình / HĐTD / GNN.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
