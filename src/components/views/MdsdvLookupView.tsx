import React, { useMemo, useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { Search, Target, Copy, Check, Wallet, Info } from 'lucide-react';
import {
  searchMdsdv,
  getLevel1Options,
  countMdsdvEntries,
  MDSDV_VERSION,
} from '../../lib/mdsdv';

const RESULT_LIMIT = 300;

export const MdsdvLookupView: React.FC = () => {

  const [query, setQuery] = useState('');
  const [level1Code, setLevel1Code] = useState('');
  const [overdraftOnly, setOverdraftOnly] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const level1Options = useMemo(() => getLevel1Options(), []);
  const totalEntries = useMemo(() => countMdsdvEntries(), []);

  const search = useMemo(
    () => searchMdsdv({ query, level1Code, overdraftOnly, limit: RESULT_LIMIT }),
    [query, level1Code, overdraftOnly]
  );

  const handleCopy = (code: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(
      () => {
        setCopiedCode(code);
        window.setTimeout(() => setCopiedCode(''), 1500);
      },
      () => setCopiedCode('')
    );
  };

  const cardBg = UI.containerCardBg;
  const inputCls = 'w-full p-2.5 rounded-md border text-xs bg-transparent border-line';

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      <div className={`${cardBg} rounded-lg p-4 border space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-line pb-2">
          <h2 className="text-sm font-bold tracking-tight text-accent flex items-center space-x-2">
            <Target className="w-5 h-5 text-pos" />
            <span>TRA CỨU MỤC ĐÍCH SỬ DỤNG VỐN (MĐSDV — FBE)</span>
          </h2>
          <div className="text-[11px] text-ink-faint font-mono">
            {totalEntries.toLocaleString('vi-VN')} mã cấp 6 • PL01/PL02 ngày {MDSDV_VERSION.slice(0, 2)}/{MDSDV_VERSION.slice(2, 4)}/{MDSDV_VERSION.slice(4)}
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
              className={`${inputCls} ${'bg-panel'}`}
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-faint">
          <span>
            Tìm thấy{' '}
            <strong className="text-accent font-mono">
              {search.total.toLocaleString('vi-VN')}
            </strong>{' '}
            mã
            {search.truncated && ` — đang hiển thị ${search.items.length.toLocaleString('vi-VN')} mã đầu tiên`}
          </span>
          {search.truncated && <span>Thu hẹp từ khoá để xem đủ kết quả.</span>}
        </div>
      </div>

      <div className={`${cardBg} rounded-lg border overflow-hidden`}>
        <div className="overflow-x-auto max-h-[620px]">
          <table className="w-full text-left text-[11px] border-collapse min-w-[1080px]">
            <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase tracking-[0.09em] text-ink-faint border-b border-line">
              <tr>
                <th className="px-[var(--row-px)] py-[var(--row-py)] min-w-[110px]">MÃ MĐSDV (CẤP 6)</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] min-w-[240px]">TÊN HIỂN THỊ TRÊN FBE</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] min-w-[220px]">MỤC ĐÍCH CHI TIẾT</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] min-w-[200px]">NGÀNH CẤP 5</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] min-w-[180px]">NGÀNH CẤP 1</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center min-w-[70px]">THẤU CHI</th>
                <th className="px-[var(--row-px)] py-[var(--row-py)] text-center min-w-[50px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {search.items.map(entry => (
                <tr key={entry.code} className="hover:bg-panel-muted transition-colors align-top">
                  <td className="px-[var(--row-px)] py-[var(--row-py)] font-mono font-bold text-accent whitespace-nowrap">
                    {entry.code}
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] font-mono">{entry.fbeName}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)]">{entry.purposeName}</td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)]">
                    <span className="font-mono text-ink-faint">{entry.level5Code}</span>
                    <span className="block">{entry.level5Name}</span>
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)]">
                    <span className="font-mono text-ink-faint">{entry.level1Code}</span>
                    <span className="block text-ink-faint">{entry.level1Name}</span>
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                    {entry.allowsOverdraft
                      ? <span className="text-pos font-bold">Có</span>
                      : <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="px-[var(--row-px)] py-[var(--row-py)] text-center">
                    <button
                      type="button"
                      onClick={() => handleCopy(entry.code)}
                      title="Sao chép mã"
                      className="text-ink-faint hover:text-accent transition-colors"
                    >
                      {copiedCode === entry.code
                        ? <Check className="w-3.5 h-3.5 text-pos" />
                        : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
              {search.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-ink-faint">
                    Không tìm thấy mã MĐSDV nào khớp với điều kiện tra cứu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${cardBg} rounded-lg p-4 border space-y-1.5 text-[11px] text-ink-faint`}>
        <div className="flex items-center space-x-1.5 font-bold text-ink-muted">
          <Info className="w-3.5 h-3.5 text-accent" />
          <span>QUY TẮC CẤU TRÚC MÃ</span>
        </div>
        <div>• Mã MĐSDV ngành cấp 1 = CE + mã ngành cấp 1 theo VSIC.</div>
        <div>• Mã MĐSDV ngành cấp 2–5 = CE + mã ngành cấp 1 + mã ngành cấp 2–5 tương ứng.</div>
        <div>• Mã MĐSDV chi tiết (cấp 6) = mã MĐSDV ngành cấp 5 + mã chi tiết.</div>
        <div>• Vay tiêu dùng phục vụ đời sống: mã MĐSDV chi tiết = CET00000 + mã chi tiết.</div>
        <div>• Tên hiển thị trên FBE = 8 ký tự cuối của mã cấp 6 + tên mục đích chi tiết.</div>
        <div>• Cột “Thấu chi” đánh dấu các mã có trong danh mục tra cứu dành cho tài khoản thấu chi.</div>
      </div>
    </div>
  );
};
