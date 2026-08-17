import React from 'react';
import { UI } from '../../lib/uiClasses';
import { RateTierTable } from '../rate/RateTierTable';
import { RateReferenceTables } from '../rate/RateReferenceTables';
import { RateProgramAdminPanel } from '../rate/RateProgramAdminPanel';
import {
  Percent, TrendingDown, PiggyBank, Loader2, AlertTriangle, ShieldAlert,
  FileText, Save, RefreshCw, Printer, Image as ImageIcon,
} from 'lucide-react';
import { fmtMoney, fmtDate, fmtPercent, formatMoneyInput } from '../../lib/utils';
import { KIND_LABELS, type RateProgramKind } from '../../lib/rateQuote';
import { useRateQuoteController } from '../../hooks/useRateQuoteController';

const KIND_TABS: { id: RateProgramKind; icon: React.ElementType }[] = [
  { id: 'cho_vay_ngan_han', icon: Percent },
  { id: 'cho_vay_trung_dai_han', icon: TrendingDown },
  { id: 'huy_dong', icon: PiggyBank },
];

export const RateQuoteView: React.FC = () => {
  const {
    isAdmin,
    kind,
    setKind,
    onDate,
    setOnDate,
    preparedBy,
    setPreparedBy,
    exportingImage,
    selectedTierId,
    setSelectedTierId,
    amountStr,
    setAmountStr,
    tenorStr,
    setTenorStr,
    baseRateStr,
    setBaseRateStr,
    casaStr,
    setCasaStr,
    isNewCustomer,
    setIsNewCustomer,
    depositDaysStr,
    setDepositDaysStr,
    showFeeTable,
    setShowFeeTable,
    includeFeeInSheet,
    setIncludeFeeInSheet,
    includeFtpInSheet,
    setIncludeFtpInSheet,
    hasFtpContent,
    editRateStr,
    setEditRateStr,
    saving,
    saveMsg,
    loading,
    loadError,
    loadAll,
    programs,
    program,
    programPrepayFees,
    programFbeCodes,
    programAuthorities,
    programFeeOptions,
    programConditions,
    depositChannels,
    depositRows,
    hasFeeContent,
    lendingTiers,
    sheetBlockers,
    handleExportSheet,
    handleExportImage,
    selectedTier,
    amount,
    baseRate,
    depositDays,
    warnings,
    blocked,
    postFixedRate,
    fee,
    depositInterest,
    handleSaveRate,
  } = useRateQuoteController();

  const cardBg = UI.containerCardBg;
  const inputCls = `w-full p-2 rounded-md border text-xs font-mono bg-transparent border-line`;
  const labelCls = 'block text-[11px] font-bold text-ink-faint mb-1';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      {/* Program Selector Bar */}
      <div className={`${cardBg} rounded-xl p-2 border border-line shadow-sm flex flex-wrap items-center gap-2`}>
        {KIND_TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setKind(id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              kind === id
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:bg-panel-muted/80 hover:text-ink'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{KIND_LABELS[id]}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-1">
          <label className="text-[11px] font-bold text-ink-faint">Áp dụng ngày</label>
          <input
            type="date"
            value={onDate}
            onChange={e => setOnDate(e.target.value)}
            className={`${inputCls} w-auto`}
          />
          <button
            type="button"
            onClick={loadAll}
            title="Tải lại"
            className="p-2 rounded-md text-ink-faint hover:text-accent transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-neg/30 bg-neg-soft p-3 text-xs font-bold text-neg">
          {loadError}
        </div>
      )}

      {!program && !loadError && (
        <div className="rounded-lg border border-warn/30 bg-warn-soft p-4 text-xs font-bold text-warn">
          Không có chương trình {KIND_LABELS[kind].toLowerCase()} nào hiệu lực tại ngày {fmtDate(onDate)}.
          {isAdmin
            ? ' Gia hạn kỳ cũ hoặc nhân bản sang kỳ mới ở khối quản trị bên dưới.'
            : ' Admin cần nhập chương trình cho kỳ này trước khi chào lãi suất.'}
        </div>
      )}

      {isAdmin && !loadError && (
        <RateProgramAdminPanel
          cardBg={cardBg}
          labelCls={labelCls}
          inputCls={inputCls}
          programs={programs}
          kind={kind}
          activeProgram={program}
          reload={loadAll}
        />
      )}

      {program && (
        <>
          {/* Program Header */}
          <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-2`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-bold text-accent">{program.Name}</h2>
                </div>
                <div className="text-[11px] text-ink-faint mt-1 font-mono">
                  {program.DocumentNumber}
                  {program.DocumentDate ? ` • ngày ${fmtDate(program.DocumentDate)}` : ''}
                  {' • hiệu lực '}
                  {fmtDate(program.EffectiveFrom)} → {program.EffectiveTo ? fmtDate(program.EffectiveTo) : 'không thời hạn'}
                </div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1">
                {program.SourceVerified ? (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-pos-soft text-pos border border-pos/30">
                    ✓ ĐÃ ĐỐI CHIẾU VĂN BẢN GỐC
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-neg-soft text-neg border border-neg/30">
                    ⚠ CHƯA ĐỐI CHIẾU VĂN BẢN GỐC
                  </span>
                )}
                {program.QuotaVnd !== null && program.QuotaVnd !== undefined && (
                  <span className="text-[11px] text-ink-faint font-mono">
                    Hạn mức chương trình: <strong className="text-accent">{fmtMoney(program.QuotaVnd)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Scope and Target */}
          {(program.ScopeText || program.TargetText) && (
            <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]`}>
              {program.TargetText && (
                <div>
                  <div className="font-bold uppercase tracking-wider text-accent mb-1">
                    Đối tượng áp dụng
                  </div>
                  <div className="text-ink-muted">{program.TargetText}</div>
                </div>
              )}
              {program.ScopeText && (
                <div>
                  <div className="font-bold uppercase tracking-wider text-accent mb-1">
                    Phạm vi áp dụng
                  </div>
                  <div className="text-ink-muted">{program.ScopeText}</div>
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-xs font-bold flex items-start space-x-2 ${
                    w.level === 'block'
                      ? 'border-neg/30 bg-neg-soft text-neg'
                      : 'border-warn/30 bg-warn-soft text-warn'
                  }`}
                >
                  {w.level === 'block'
                    ? <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Rate Tier Table */}
          <RateTierTable
            cardBg={cardBg}
            kind={kind}
            program={program}
            lendingTiers={lendingTiers}
            depositChannels={depositChannels}
            depositRows={depositRows}
            selectedTierId={selectedTierId}
            setSelectedTierId={setSelectedTierId}
          />

          {/* Admin Rate Edit */}
          {isAdmin && selectedTier && (
            <div className={`${cardBg} rounded-lg p-4 border space-y-2`}>
              <div className="font-bold text-xs tracking-tight text-accent">
                SỬA THÔNG SỐ (CHỈ ADMIN)
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px]">
                  <label className={labelCls}>Lãi suất của “{selectedTier.Label}” (%/năm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editRateStr}
                    onChange={e => setEditRateStr(e.target.value)}
                    placeholder="Để trống = chưa có số"
                    className={`${inputCls} font-bold`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveRate}
                  disabled={saving}
                  className="bg-accent hover:opacity-90 disabled:opacity-50 text-accent-ink text-xs px-3.5 py-2 rounded-md font-bold flex items-center space-x-1.5 transition-colors"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>LƯU</span>
                </button>
                {saveMsg && <span className="text-[11px] font-bold text-ink-faint">{saveMsg}</span>}
              </div>
              <div className="text-[11px] text-ink-faint">
                Để trống nghĩa là <strong>chưa có số</strong> — khác hẳn 0%/năm. Ô trống sẽ chặn việc chào lãi suất cho gói đó.
              </div>
            </div>
          )}

          {/* Quote & Calculator Panel */}
          <div className={`${cardBg} rounded-lg p-4 border space-y-4`}>
            <div className="font-bold text-xs tracking-tight text-accent border-b border-line pb-2">
              {kind === 'huy_dong' ? 'TÍNH LÃI TIỀN GỬI DỰ KIẾN' : 'CHÀO LÃI SUẤT & PHÍ DỊCH VỤ'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className={labelCls}>
                  {kind === 'huy_dong' ? 'Số tiền gửi (VND)' : 'Số tiền giải ngân (VND)'}
                </label>
                <input
                  type="text"
                  value={amountStr}
                  onChange={e => setAmountStr(formatMoneyInput(e.target.value))}
                  className={`${inputCls} font-bold text-accent`}
                />
              </div>

              {kind === 'huy_dong' ? (
                <div>
                  <label className={labelCls}>Số ngày gửi (Actual/365)</label>
                  <input
                    type="number"
                    min={0}
                    value={depositDaysStr}
                    onChange={e => setDepositDaysStr(e.target.value)}
                    className={`${inputCls} font-bold`}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelCls}>Thời gian vay (tháng)</label>
                    <input
                      type="number"
                      min={1}
                      value={tenorStr}
                      onChange={e => setTenorStr(e.target.value)}
                      className={`${inputCls} font-bold`}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>{program.FloatingBaseLabel || 'LSCS'} hiện hành (%/năm)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={baseRateStr}
                      onChange={e => setBaseRateStr(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>CASA bình quân (VND)</label>
                    <input
                      type="text"
                      value={casaStr}
                      onChange={e => setCasaStr(formatMoneyInput(e.target.value))}
                      placeholder="Để trống nếu chưa soát xét"
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>

            {kind !== 'huy_dong' && (
              <label className="flex items-center space-x-2 text-[11px] font-bold text-ink-faint cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewCustomer}
                  onChange={e => setIsNewCustomer(e.target.checked)}
                />
                <span>
                  Khách hàng mới — giảm tối đa {fmtPercent(program.NewCustomerFeeDiscount)} phí dịch vụ
                </span>
              </label>
            )}

            {kind === 'huy_dong' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-accent-soft border border-accent/30">
                  <div className="text-[11px] font-bold text-ink-faint uppercase">LÃI SUẤT CHÀO</div>
                  <div className="text-2xl font-extrabold text-accent font-mono mt-1">
                    {selectedTier?.RateAnnual === null || selectedTier?.RateAnnual === undefined
                      ? 'CHƯA CÓ'
                      : `${(selectedTier.RateAnnual * 100).toFixed(2)} %/năm`}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">{selectedTier?.Label || '—'}</div>
                </div>
                <div className="p-4 rounded-lg bg-pos-soft border border-pos/30">
                  <div className="text-[11px] font-bold text-ink-faint uppercase">TIỀN LÃI DỰ KIẾN</div>
                  <div className="text-2xl font-extrabold text-pos font-mono mt-1">
                    {depositInterest === null ? '—' : fmtMoney(depositInterest)}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    {fmtMoney(amount)} × lãi suất × {depositDays}/365
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-accent-soft border border-accent/30">
                  <div className="text-[11px] font-bold text-ink-faint uppercase">LSCV TRONG THỜI GIAN CỐ ĐỊNH</div>
                  <div className="text-2xl font-extrabold text-accent font-mono mt-1">
                    {selectedTier?.RateAnnual === null || selectedTier?.RateAnnual === undefined
                      ? 'CHƯA CÓ'
                      : `${(selectedTier.RateAnnual * 100).toFixed(2)} %/năm`}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    {selectedTier?.Label || '—'}
                    {selectedTier?.FixedMonths ? ` • cố định ${selectedTier.FixedMonths} tháng` : ''}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-warn-soft border border-warn/30">
                  <div className="text-[11px] font-bold text-ink-faint uppercase">LSCV SAU THỜI GIAN CỐ ĐỊNH</div>
                  <div className="text-2xl font-extrabold text-warn font-mono mt-1">
                    {postFixedRate === null ? '—' : `${(postFixedRate * 100).toFixed(2)} %/năm`}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1">
                    {program.FloatingBaseLabel || 'LSCS'} {fmtPercent(baseRate)} + biên độ {fmtPercent(program.FloatingSpreadAnnual)}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-pos-soft border border-pos/30">
                  <div className="text-[11px] font-bold text-ink-faint uppercase">PHÍ DỊCH VỤ TỐI THIỂU</div>
                  <div className="text-2xl font-extrabold text-pos font-mono mt-1">
                    {fee.feeAmount === null ? '—' : fmtMoney(fee.feeAmount)}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-1 space-y-0.5">
                    <div>Tỷ lệ áp dụng: <strong>{fmtPercent(fee.effectiveRatio)}</strong></div>
                    {fee.casaAddonApplied && (
                      <div className="text-warn">
                        + {fmtPercent(program.CasaShortfallFeeAddon)} do CASA bình quân dưới {fmtPercent(program.CasaMinRatio)} dư nợ
                        {fee.casaRequiredAmount !== null && ` (cần ${fmtMoney(fee.casaRequiredAmount)})`}
                      </div>
                    )}
                    {fee.minFeeApplied && (
                      <div>Đã nâng lên mức sàn {fmtMoney(program.MinFeeAmountVnd)}</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {blocked && (
              <div className="rounded-lg border border-neg/30 bg-neg-soft p-3 text-xs font-bold text-neg">
                Không được dùng kết quả trên để chào khách khi còn cảnh báo đỏ ở trên.
              </div>
            )}
          </div>

          {/* Export Panel */}
          <div className={`${cardBg} rounded-lg p-4 border space-y-3`}>
            <div className="font-bold text-xs tracking-tight text-accent border-b border-line pb-2 flex items-center space-x-1.5">
              <Printer className="w-4 h-4" />
              <span>XUẤT BẢNG LÃI SUẤT GỬI KHÁCH HÀNG</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className={labelCls}>Nhân viên tư vấn (in trên file, có thể bỏ trống)</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={e => setPreparedBy(e.target.value)}
                  placeholder="Họ tên · số điện thoại"
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportSheet}
                  disabled={sheetBlockers.length > 0}
                  className="bg-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-accent-ink text-xs px-4 py-2.5 rounded-md font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>XUẤT PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportImage}
                  disabled={sheetBlockers.length > 0 || exportingImage}
                  className="border border-accent/40 text-accent hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed text-xs px-4 py-2.5 rounded-md font-bold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{exportingImage ? 'ĐANG DỰNG…' : 'XUẤT HÌNH ẢNH'}</span>
                </button>
              </div>
            </div>

            {hasFeeContent && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFeeInSheet}
                  onChange={e => setIncludeFeeInSheet(e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-[11px] font-bold">Kèm bảng phí dịch vụ trong file gửi khách hàng</span>
              </label>
            )}

            {hasFtpContent && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeFtpInSheet}
                  onChange={e => setIncludeFtpInSheet(e.target.checked)}
                  className="w-4 h-4 accent-accent"
                />
                <span className="text-[11px] font-bold">Kèm bảng FTP mua (VOF) chương trình</span>
              </label>
            )}

            {sheetBlockers.length > 0 ? (
              <div className="rounded-md border border-neg/30 bg-neg-soft p-3 space-y-1">
                <div className="text-xs font-bold text-neg">
                  Chưa xuất được file cho khách hàng:
                </div>
                {sheetBlockers.map((b, i) => (
                  <div key={i} className="text-[11px] text-neg">• {b.message}</div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-ink-faint space-y-0.5">
                <div>
                  Bấm nút để mở bản in khổ A4. Trong hộp thoại in, chọn <strong>“Save as PDF”</strong> để lưu file,
                  hoặc chụp ảnh màn hình nếu cần gửi dạng hình.
                </div>
                <div>
                  File chỉ gồm lãi suất, điều kiện và phí công bố của chương trình — không chứa thông tin nội bộ
                  như COF, biên độ lợi nhuận hay dữ liệu khách hàng khác.
                </div>
              </div>
            )}
          </div>

          {/* Reference Tables */}
          <RateReferenceTables
            cardBg={cardBg}
            programFeeOptions={programFeeOptions}
            programConditions={programConditions}
            programPrepayFees={programPrepayFees}
            programAuthorities={programAuthorities}
            programFbeCodes={programFbeCodes}
            showFeeTable={showFeeTable}
            setShowFeeTable={setShowFeeTable}
          />
        </>
      )}
    </div>
  );
};
