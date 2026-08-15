import React from 'react';
import { UI } from '../../lib/uiClasses';
import {
  Search, Target, Copy, Check, Wallet, Info,
  Layers, List, X, ChevronRight, CheckCircle2,
  Hash, ArrowUpRight
} from 'lucide-react';
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
    copiedKey,
    viewMode,
    setViewMode,
    level1Options,
    totalEntries,
    search,
    groupedResults,
    handleCopyCode,
    handleCopyLevel5,
    handleCopyFull,
  } = useMdsdvController();

  const cardBg = UI.containerCardBg;
  const inputCls = UI.inputStyle;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Card */}
      <div className={`${cardBg} rounded-xl p-4 sm:p-5 border border-line-strong shadow-xs space-y-4`}>
        {/* Top Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-accent-soft text-accent border border-accent/20">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-ink uppercase flex items-center gap-2">
                TRA CỨU MỤC ĐÍCH SỬ DỤNG VỐN (MĐSDV — FBE)
              </h2>
              <p className="text-[11px] text-ink-faint">
                Phân cấp mã Cấp 5 (Ngành nghề) và Cấp 6 (Mục đích vay/thấu chi) theo chuẩn SBV & Core Banking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="text-[11px] text-ink-faint font-mono bg-panel-muted px-2.5 py-1 rounded-md border border-line flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pos animate-pulse" />
              <strong>{fmtNumber(totalEntries)}</strong> mã cấp 6 • PL01/PL02 ({MDSDV_VERSION.slice(0, 2)}/{MDSDV_VERSION.slice(2, 4)}/{MDSDV_VERSION.slice(4)})
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Search Input */}
          <div className="md:col-span-6">
            <label className="block text-[11px] font-bold text-ink-faint mb-1">
              Tìm kiếm theo Mã hoặc Tên (không dấu)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="VD: CEA01110, CEA0111001, trong lua, von luu dong..."
                className={`${inputCls} pl-9 pr-8 h-10 w-full font-sans text-xs`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-ink-faint hover:text-ink hover:bg-panel transition-colors"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Ngành cấp 1 dropdown */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-ink-faint mb-1">
              Ngành kinh tế cấp 1
            </label>
            <select
              value={level1Code}
              onChange={e => setLevel1Code(e.target.value)}
              className={`${inputCls} bg-panel h-10 w-full text-xs truncate`}
            >
              <option value="">Tất cả ngành (21 ngành)</option>
              {level1Options.map(o => (
                <option key={o.code} value={o.code}>
                  {o.code} — {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Thấu chi button */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-ink-faint mb-1">
              Lọc theo tính chất
            </label>
            <button
              type="button"
              onClick={() => setOverdraftOnly(v => !v)}
              className={`w-full h-10 flex items-center justify-center space-x-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                overdraftOnly
                  ? 'bg-accent text-accent-ink border-accent shadow-xs'
                  : 'bg-panel text-ink-muted border-line hover:bg-panel-muted hover:text-ink'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>CHỈ TK THẤU CHI</span>
              {overdraftOnly && <Check className="w-3.5 h-3.5 ml-1" />}
            </button>
          </div>
        </div>

        {/* Quick Industry Filter Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none pt-1">
          <span className="text-ink-faint shrink-0 font-medium">Lọc nhanh:</span>
          <button
            type="button"
            onClick={() => setLevel1Code('')}
            className={`px-2 py-0.5 rounded-md border shrink-0 transition-colors ${
              !level1Code ? 'bg-accent-soft text-accent border-accent/40 font-bold' : 'bg-panel-muted text-ink-faint border-line hover:text-ink'
            }`}
          >
            Tất cả
          </button>
          {level1Options.slice(0, 7).map(o => (
            <button
              key={o.code}
              type="button"
              onClick={() => setLevel1Code(level1Code === o.code ? '' : o.code)}
              className={`px-2 py-0.5 rounded-md border shrink-0 transition-colors ${
                level1Code === o.code ? 'bg-accent text-accent-ink border-accent font-bold' : 'bg-panel text-ink-faint border-line hover:text-ink hover:bg-panel-muted'
              }`}
              title={o.name}
            >
              {o.code}: {o.name.length > 20 ? `${o.name.slice(0, 20)}...` : o.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs tracking-tight text-ink uppercase">
            KẾT QUẢ TÌM KIẾM
          </span>
          <span className="px-2 py-0.5 rounded-full bg-accent-soft text-accent font-mono font-bold text-xs border border-accent/30">
            {fmtNumber(search.total)} mã
          </span>
          {search.items.length > 0 && (
            <span className="text-[11px] text-ink-faint hidden sm:inline">
              ({fmtNumber(groupedResults.length)} nhóm ngành Cấp 5)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {search.truncated && (
            <span className="text-[11px] text-warn font-medium hidden md:inline">
              ⚠️ Hiển thị {fmtNumber(RESULT_LIMIT)} kết quả đầu — gõ thêm từ khoá để thu hẹp
            </span>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-panel-muted rounded-lg p-0.5 border border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-panel text-accent font-bold shadow-xs border border-line'
                  : 'text-ink-faint hover:text-ink'
              }`}
              title="Gom nhóm theo Ngành Cấp 5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Gom nhóm Cấp 5</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-panel text-accent font-bold shadow-xs border border-line'
                  : 'text-ink-faint hover:text-ink'
              }`}
              title="Xem danh sách dạng Bảng"
            >
              <List className="w-3.5 h-3.5" />
              <span>Dạng bảng</span>
            </button>
          </div>
        </div>
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
      ) : viewMode === 'grouped' ? (
        /* MODE 1: HIERARCHICAL GROUPED BY LEVEL 5 */
        <div className="space-y-4">
          {groupedResults.map(group => {
            const isL5Copied = copiedKey === `l5-${group.level5Code}`;
            return (
              <div
                key={group.level5Code}
                className={`${cardBg} rounded-xl border border-line-strong shadow-xs overflow-hidden`}
              >
                {/* Level 5 Sector Header */}
                <div className="bg-panel-muted/70 px-4 py-3 border-b border-line">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    {/* Left: Code badge & Name */}
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-ink-faint">
                          NGÀNH CẤP 5:
                        </span>
                        <div className="inline-flex items-center gap-1.5 bg-accent-soft border border-accent/30 rounded-md px-2 py-0.5">
                          <Hash className="w-3 h-3 text-accent" />
                          <span className="font-mono font-extrabold text-accent text-xs">
                            {group.level5Code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLevel5(group.level5Code, group.level5Name)}
                            className="text-accent/70 hover:text-accent p-0.5 rounded transition-colors"
                            title="Sao chép Mã & Tên Cấp 5"
                          >
                            {isL5Copied ? <Check className="w-3 h-3 text-pos" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <h3 className="text-sm font-bold text-ink">
                          {group.level5Name}
                        </h3>
                      </div>

                      {/* Full Breadcrumb hierarchy */}
                      <div className="flex items-center flex-wrap gap-1 text-[11px] text-ink-faint">
                        <span className="font-semibold text-ink-muted">{group.level1Code} - {group.level1Name}</span>
                        {group.level2Name && (
                          <>
                            <ChevronRight className="w-3 h-3 text-line-strong shrink-0" />
                            <span>{group.level2Name}</span>
                          </>
                        )}
                        {group.level3Name && group.level3Name !== group.level2Name && (
                          <>
                            <ChevronRight className="w-3 h-3 text-line-strong shrink-0" />
                            <span>{group.level3Name}</span>
                          </>
                        )}
                        {group.level4Name && group.level4Name !== group.level3Name && (
                          <>
                            <ChevronRight className="w-3 h-3 text-line-strong shrink-0" />
                            <span>{group.level4Name}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: Quantity badge */}
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-panel border border-line text-ink-muted font-mono">
                        {group.items.length} mục đích Cấp 6
                      </span>
                    </div>
                  </div>
                </div>

                {/* Level 6 Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-panel/40 border-b border-line text-[11px] font-bold text-ink-faint uppercase">
                      <tr>
                        <th className="py-2.5 px-4 w-44">MÃ CẤP 6</th>
                        <th className="py-2.5 px-4 min-w-[220px]">TÊN MỤC ĐÍCH SỬ DỤNG VỐN</th>
                        <th className="py-2.5 px-4 min-w-[240px]">QUY ƯỚC FBE (CORE BANKING)</th>
                        <th className="py-2.5 px-4 w-36 text-center">ĐẶC THÙ</th>
                        <th className="py-2.5 px-4 w-32 text-right">SAO CHÉP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/60">
                      {group.items.map(item => {
                        const isCodeCopied = copiedKey === `code-${item.code}`;
                        const isFullCopied = copiedKey === `full-${item.code}`;

                        return (
                          <tr
                            key={item.code}
                            className="hover:bg-panel-muted/50 transition-colors group"
                          >
                            {/* Mã cấp 6 */}
                            <td className="py-2.5 px-4 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-accent text-xs tracking-tight">
                                  {item.code}
                                </span>
                                <span className="text-[10px] text-ink-faint bg-panel-muted px-1.5 py-0.2 rounded border border-line">
                                  {item.detailCode}
                                </span>
                              </div>
                            </td>

                            {/* Tên mục đích */}
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-ink text-xs leading-snug">
                                {item.purposeName}
                              </div>
                            </td>

                            {/* Quy ước FBE riêng 1 cột */}
                            <td className="py-2.5 px-4 font-mono">
                              <div className="inline-flex items-center gap-1 bg-panel-muted px-2 py-0.5 rounded border border-line text-[11px] text-ink font-medium max-w-full">
                                <span className="truncate" title={item.fbeName}>{item.fbeName}</span>
                              </div>
                            </td>

                            {/* Đặc thù */}
                            <td className="py-2.5 px-4 text-center">
                              {item.allowsOverdraft ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pos-soft text-pos border border-pos/30 font-mono">
                                  <Wallet className="w-3 h-3" />
                                  <span>THẤU CHI</span>
                                </span>
                              ) : (
                                <span className="text-ink-faint font-mono text-[11px]">—</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyCode(item.code)}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                                    isCodeCopied
                                      ? 'bg-pos-soft text-pos border-pos/40 font-bold'
                                      : 'bg-panel border-line text-ink-muted hover:text-accent hover:border-accent/40 hover:bg-panel-muted'
                                  }`}
                                  title="Sao chép Mã Cấp 6"
                                >
                                  {isCodeCopied ? <Check className="w-3 h-3 text-pos" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCodeCopied ? 'Đã chép' : 'Mã'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyFull(item)}
                                  className={`p-1 rounded-md border transition-colors ${
                                    isFullCopied
                                      ? 'bg-pos-soft text-pos border-pos/40'
                                      : 'bg-panel border-line text-ink-faint hover:text-ink hover:bg-panel-muted'
                                  }`}
                                  title="Sao chép đầy đủ (Mã Cấp 6 + Tên Mục Đích + Ngành Cấp 5)"
                                >
                                  {isFullCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-pos" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* MODE 2: FLAT DATA TABLE */
        <div className={`${cardBg} rounded-xl border border-line-strong shadow-xs overflow-hidden`}>
          <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-panel-muted/90 backdrop-blur-xs sticky top-0 z-10 border-b border-line text-[11px] font-bold text-ink-faint uppercase">
                <tr>
                  <th className="py-2.5 px-4 w-44">MÃ CẤP 6</th>
                  <th className="py-2.5 px-4 w-56">NGÀNH NGHỀ (CẤP 5)</th>
                  <th className="py-2.5 px-4 min-w-[200px]">TÊN MỤC ĐÍCH SỬ DỤNG VỐN</th>
                  <th className="py-2.5 px-4 min-w-[220px]">QUY ƯỚC FBE</th>
                  <th className="py-2.5 px-4 w-32 text-center">ĐẶC THÙ</th>
                  <th className="py-2.5 px-4 w-28 text-right">SAO CHÉP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {search.items.map(item => {
                  const isCodeCopied = copiedKey === `code-${item.code}`;

                  return (
                    <tr
                      key={item.code}
                      className="hover:bg-panel-muted/50 transition-colors"
                    >
                      {/* Mã Cấp 6 */}
                      <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-accent text-xs">
                            {item.code}
                          </span>
                          <span className="text-[10px] text-ink-faint bg-panel-muted px-1.5 py-0.2 rounded border border-line">
                            {item.detailCode}
                          </span>
                        </div>
                      </td>

                      {/* Ngành Cấp 5 */}
                      <td className="py-2.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="font-mono font-bold text-ink text-xs">{item.level5Code}</span>
                            <span className="text-ink-faint font-normal">• {item.level5Name}</span>
                          </div>
                          <div className="text-[10px] text-ink-faint truncate max-w-xs" title={`${item.level1Code} - ${item.level1Name}`}>
                            {item.level1Name}
                          </div>
                        </div>
                      </td>

                      {/* Tên Mục Đích */}
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-ink text-xs leading-snug">
                          {item.purposeName}
                        </div>
                      </td>

                      {/* Quy ước FBE */}
                      <td className="py-2.5 px-4 font-mono">
                        <div className="inline-flex items-center gap-1 bg-panel-muted px-2 py-0.5 rounded border border-line text-[11px] text-ink font-medium">
                          <span>{item.fbeName}</span>
                        </div>
                      </td>

                      {/* Đặc thù */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        {item.allowsOverdraft ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pos-soft text-pos border border-pos/30 font-mono">
                            <Wallet className="w-3 h-3" />
                            <span>THẤU CHI</span>
                          </span>
                        ) : (
                          <span className="text-ink-faint font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(item.code)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                            isCodeCopied
                              ? 'bg-pos-soft text-pos border-pos/40 font-bold'
                              : 'bg-panel border-line text-ink-muted hover:text-accent hover:border-accent/40 hover:bg-panel-muted'
                          }`}
                          title="Sao chép Mã Cấp 6"
                        >
                          {isCodeCopied ? <Check className="w-3 h-3 text-pos" /> : <Copy className="w-3 h-3" />}
                          <span>{isCodeCopied ? 'Đã chép' : 'Copy'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
              • <strong>Phím tắt sao chép</strong>: Nhấn nút <code>Mã</code> để copy nhanh vào clipboard, sẵn sàng dán vào tờ trình, hợp đồng tín dụng hoặc GNN.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
