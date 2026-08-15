import React from 'react';
import { UI } from '../../lib/uiClasses';
import { Search, Target, Copy, Check, Wallet, Info } from 'lucide-react';
import { AdaptiveTable } from '../AdaptiveTable';
import { MDSDV_VERSION } from '../../lib/mdsdv';
import { fmtNumber } from '../../lib/utils';
import { useMdsdvController, RESULT_LIMIT } from '../../hooks/useMdsdvController';

export const MdsdvLookupView: React.FC = () => {
  const {
    query,
    setQuery,
    level1Code,
    setLevel1Code,
    overdraftOnly,
    setOverdraftOnly,
    copiedCode,
    level1Options,
    totalEntries,
    search,
    handleCopy,
  } = useMdsdvController();

  const cardBg = UI.containerCardBg;
  const inputCls = UI.inputStyle;

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className={`${cardBg} rounded-lg p-4 border space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="text-sm font-bold tracking-tight text-accent flex items-center space-x-2">
            <Target className="w-5 h-5 text-accent" />
            <span className="uppercase">TRA CỨU MỤC ĐÍCH SỬ DỤNG VỐN (MĐSDV — FBE)</span>
          </h2>
          <div className="text-[11px] text-ink-faint font-mono bg-panel-muted px-3 py-1 rounded-lg border border-line">
            {fmtNumber(totalEntries)} mã cấp 6 • PL01/PL02 ngày {MDSDV_VERSION.slice(0, 2)}/{MDSDV_VERSION.slice(2, 4)}/{MDSDV_VERSION.slice(4)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold text-ink-faint mb-1">
              Tìm theo mã hoặc tên (không cần dấu)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="VD: CEA0111001 · trong lua · bo sung von luu dong"
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-ink-faint mb-1">Ngành kinh tế cấp 1</label>
            <select
              value={level1Code}
              onChange={e => setLevel1Code(e.target.value)}
              className={`${inputCls} bg-panel`}
            >
              <option value="">Tất cả ngành</option>
              {level1Options.map(o => (
                <option key={o.code} value={o.code}>{o.code} — {o.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="button"
              onClick={() => setOverdraftOnly(v => !v)}
              className={`w-full flex items-center justify-center space-x-1.5 p-2.5 rounded-md text-[11px] font-bold border transition-colors ${
                overdraftOnly
                  ? 'bg-accent text-accent-ink border-accent'
                  : 'text-ink-muted border-line hover:bg-panel-muted'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>CHỈ TK THẤU CHI</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className={`${cardBg} rounded-lg border overflow-hidden`}>
        <div className="p-3 border-b border-line flex items-center justify-between">
          <span className="font-bold text-xs tracking-tight text-accent">
            KẾT QUẢ ({fmtNumber(search.total)} MÃ PHÙ HỢP)
          </span>
          {search.truncated && (
            <span className="text-[11px] text-ink-faint">
              Chỉ hiển thị {fmtNumber(RESULT_LIMIT)} kết quả đầu — gõ thêm từ khoá để thu hẹp
            </span>
          )}
        </div>

        <AdaptiveTable
          maxHeight="560px"
          rows={search.items}
          rowKey={item => item.code}
          emptyText="Không tìm thấy mục đích sử dụng vốn nào phù hợp."
          cardTitle={item => item.purposeName}
          cardSubtitle={item => (
            <div className="font-mono text-accent flex items-center gap-1.5 mt-0.5">
              <span>{item.code}</span>
              {item.allowsOverdraft && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-accent-soft text-accent border border-accent/30">
                  Thấu chi
                </span>
              )}
            </div>
          )}
          actions={item => (
            <button
              type="button"
              onClick={() => handleCopy(item.code)}
              className="p-1.5 rounded-lg border border-line text-ink-faint hover:text-accent hover:bg-panel-muted transition-colors"
              title="Sao chép mã"
            >
              {copiedCode === item.code ? <Check className="w-3.5 h-3.5 text-pos" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          columns={[
            {
              key: 'code',
              label: 'MÃ CẤP 6 (FBE)',
              priority: 1,
              render: item => (
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono font-bold text-accent">{item.code}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.code)}
                    className="p-1 rounded text-ink-faint hover:text-accent hover:bg-panel-muted transition-colors"
                    title="Sao chép mã"
                  >
                    {copiedCode === item.code ? <Check className="w-3 h-3 text-pos" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ),
            },
            {
              key: 'name',
              label: 'TÊN MỤC ĐÍCH SỬ DỤNG VỐN',
              priority: 1,
              render: item => (
                <div className="space-y-0.5">
                  <div className="font-bold text-ink">{item.purposeName}</div>
                  <div className="text-[11px] text-ink-faint">
                    {item.level1Name} → {item.level2Name || item.fbeName}
                  </div>
                </div>
              ),
            },
            {
              key: 'tag',
              label: 'ĐẶC THÙ',
              priority: 2,
              align: 'center',
              render: item => (
                item.allowsOverdraft ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-soft text-accent border border-accent/30 font-mono">
                    THẤU CHI
                  </span>
                ) : (
                  <span className="text-ink-faint font-mono">—</span>
                )
              ),
            },
          ]}
        />
      </div>

      {/* Footer Info */}
      <div className={`${cardBg} rounded-lg p-3 border text-[11px] text-ink-faint flex items-start space-x-2`}>
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-accent" />
        <div className="space-y-0.5">
          <div>
            • Tra cứu hỗ trợ tìm theo <strong>mã</strong> (vd <code>CEA0111001</code>) hoặc <strong>tên ngành</strong> không dấu.
          </div>
          <div>
            • Mã cấp 6 dùng để nhập vào hệ thống core banking khi lập hồ sơ vay vốn, khế ước nhận nợ hoặc mở tài khoản thấu chi.
          </div>
        </div>
      </div>
    </div>
  );
};
