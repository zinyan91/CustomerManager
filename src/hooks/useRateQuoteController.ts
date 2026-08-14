import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRatePrograms } from './useRatePrograms';
import { updateRateProgramTierAPI } from '../lib/api';
import {
  resolvePostFixedRate, calcServiceFee, calcDepositInterest,
  collectQuoteWarnings, hasBlockingWarning,
  type RateProgramKind,
} from '../lib/rateQuote';
import {
  buildRateSheetHtml, buildRateSheetParts, findRateSheetBlockers, rateSheetFileBase,
} from '../lib/rateSheet';
import {
  renderHtmlToPngBlob, downloadBlob, A4_PORTRAIT_PX, A4_LANDSCAPE_PX,
} from '../lib/htmlToPng';
import { printHtmlDoc } from '../lib/printHtmlDoc';
import { parseMoneyInput, todayIso } from '../lib/utils';
import vietbankLogo from '../assets/vietbank-logo.png?inline';

export function useRateQuoteController() {
  const { isAdmin } = useAuth();

  const [kind, setKind] = useState<RateProgramKind>('cho_vay_ngan_han');
  const [onDate, setOnDate] = useState(todayIso);

  const [preparedBy, setPreparedBy] = useState('');
  const [exportingImage, setExportingImage] = useState(false);

  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);
  const [amountStr, setAmountStr] = useState('1.000.000.000');
  const [tenorStr, setTenorStr] = useState('6');
  const [baseRateStr, setBaseRateStr] = useState('7.50');
  const [casaStr, setCasaStr] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [depositDaysStr, setDepositDaysStr] = useState('180');

  const [showFeeTable, setShowFeeTable] = useState(false);
  const [includeFeeInSheet, setIncludeFeeInSheet] = useState(true);

  const [editRateStr, setEditRateStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const {
    loading, loadError, reload: loadAll,
    setTiers,
    program, programTiers, programPrepayFees, programFbeCodes,
    programAuthorities, programFeeOptions, programConditions,
    depositChannels, depositRows, hasFeeContent,
  } = useRatePrograms(kind, onDate);

  const lendingTiers = programTiers;

  const sheetInput = useMemo(() => (program ? {
    program,
    tiers: programTiers,
    prepaymentFees: programPrepayFees,
    feeOptions: programFeeOptions,
    conditions: programConditions,
    preparedBy: preparedBy.trim() || undefined,
    logoDataUri: vietbankLogo,
    channel: null,
    includeFees: includeFeeInSheet,
  } : null), [program, programTiers, programPrepayFees, programFeeOptions, programConditions,
    preparedBy, includeFeeInSheet]);

  const sheetBlockers = useMemo(
    () => (sheetInput ? findRateSheetBlockers(sheetInput) : []),
    [sheetInput]
  );

  const handleExportSheet = useCallback(() => {
    if (!sheetInput || sheetBlockers.length > 0) return;
    const html = buildRateSheetHtml(sheetInput);
    if (!printHtmlDoc(html, rateSheetFileBase(sheetInput.program))) {
      setSaveMsg('Không mở được bản in. Thử lại hoặc tải trang lại.');
    }
  }, [sheetInput, sheetBlockers]);

  const handleExportImage = useCallback(async () => {
    if (!sheetInput || sheetBlockers.length > 0) return;
    setExportingImage(true);
    try {
      const parts = buildRateSheetParts(sheetInput);
      const blob = await renderHtmlToPngBlob({
        styles: parts.styles,
        bodyHtml: parts.bodyHtml,
        page: parts.landscape ? A4_LANDSCAPE_PX : A4_PORTRAIT_PX,
      });
      downloadBlob(blob, `${parts.fileBase}.png`);
    } catch (err: any) {
      setSaveMsg(err?.message || 'Không xuất được hình ảnh.');
    } finally {
      setExportingImage(false);
    }
  }, [sheetInput, sheetBlockers]);

  useEffect(() => {
    const pool = kind === 'huy_dong' ? programTiers : lendingTiers;
    if (pool.length === 0) { setSelectedTierId(null); return; }
    if (!pool.some(t => t.Id === selectedTierId)) setSelectedTierId(pool[0].Id);
  }, [kind, programTiers, lendingTiers, selectedTierId]);

  const selectedTier = useMemo(
    () => programTiers.find(t => t.Id === selectedTierId) ?? null,
    [programTiers, selectedTierId]
  );

  useEffect(() => {
    setEditRateStr(
      selectedTier && selectedTier.RateAnnual !== null && selectedTier.RateAnnual !== undefined
        ? (selectedTier.RateAnnual * 100).toFixed(2)
        : ''
    );
    setSaveMsg('');
  }, [selectedTier]);

  const amount = parseMoneyInput(amountStr);
  const tenorMonths = parseInt(tenorStr, 10) || 0;
  const baseRate = baseRateStr.trim() === '' ? null : (parseFloat(baseRateStr) || 0) / 100;
  const casaAverage = casaStr.trim() === '' ? null : parseMoneyInput(casaStr);
  const depositDays = parseInt(depositDaysStr, 10) || 0;

  const warnings = useMemo(
    () => collectQuoteWarnings({ program, tier: selectedTier, onDate, loanTenorMonths: tenorMonths }),
    [program, selectedTier, onDate, tenorMonths]
  );
  const blocked = hasBlockingWarning(warnings);

  const postFixedRate = useMemo(
    () => resolvePostFixedRate(baseRate, program?.FloatingSpreadAnnual),
    [baseRate, program]
  );

  const fee = useMemo(() => calcServiceFee({
    disbursementAmount: amount,
    feeRatio: selectedTier?.MinFeeRatio,
    minFeeAmountVnd: program?.MinFeeAmountVnd,
    casaAverage,
    casaMinRatio: program?.CasaMinRatio,
    casaShortfallAddon: program?.CasaShortfallFeeAddon,
    newCustomerDiscount: isNewCustomer ? program?.NewCustomerFeeDiscount : 0,
  }), [amount, selectedTier, program, casaAverage, isNewCustomer]);

  const depositInterest = useMemo(
    () => calcDepositInterest(amount, selectedTier?.RateAnnual, depositDays),
    [amount, selectedTier, depositDays]
  );

  const handleSaveRate = useCallback(async () => {
    if (!selectedTier) return;
    setSaving(true);
    setSaveMsg('');
    try {
      const trimmed = editRateStr.trim();
      const parsed = trimmed === '' ? null : parseFloat(trimmed);
      if (trimmed !== '' && (parsed === null || isNaN(parsed))) {
        throw new Error('Lãi suất không hợp lệ.');
      }
      if (parsed !== null && (parsed < 0 || parsed > 100)) {
        throw new Error('Lãi suất phải trong khoảng 0 – 100 %/năm.');
      }
      const updated = await updateRateProgramTierAPI(selectedTier.Id, {
        RateAnnual: parsed === null ? null : parsed / 100,
      });
      setTiers(prev => prev.map(t => (t.Id === updated.Id ? { ...t, ...updated } : t)));
      setSaveMsg('Đã lưu.');
    } catch (err: any) {
      setSaveMsg(err?.message || 'Lưu thất bại.');
    } finally {
      setSaving(false);
    }
  }, [selectedTier, editRateStr, setTiers]);

  return {
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
    editRateStr,
    setEditRateStr,
    saving,
    saveMsg,
    setSaveMsg,
    loading,
    loadError,
    loadAll,
    program,
    programTiers,
    programPrepayFees,
    programFbeCodes,
    programAuthorities,
    programFeeOptions,
    programConditions,
    depositChannels,
    depositRows,
    hasFeeContent,
    lendingTiers,
    sheetInput,
    sheetBlockers,
    handleExportSheet,
    handleExportImage,
    selectedTier,
    amount,
    tenorMonths,
    baseRate,
    casaAverage,
    depositDays,
    warnings,
    blocked,
    postFixedRate,
    fee,
    depositInterest,
    handleSaveRate,
  };
}
