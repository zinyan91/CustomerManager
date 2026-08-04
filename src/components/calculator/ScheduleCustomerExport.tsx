import React, { useState } from 'react';
import { Download, Printer, Send } from 'lucide-react';
import type { ThemeStyles } from '../../lib/themeStyles';
import type { LoanScheduleRow } from '../../lib/calcMath';
import { buildCustomerScheduleDocHtml } from '../../lib/scheduleDocHtml';
import { printHtmlDoc } from '../../lib/printHtmlDoc';

interface ScheduleCustomerExportProps {
  styles: ThemeStyles;
  isLight: boolean;
  rows: LoanScheduleRow[];
  info: { label: string; value: string }[];
  totals: { principal: number; interest: number; total: number };
}

export const ScheduleCustomerExport: React.FC<ScheduleCustomerExportProps> = ({
  styles, isLight, rows, info, totals,
}) => {
  const [orgName, setOrgName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [docRef, setDocRef] = useState('');
  const [preparedBy, setPreparedBy] = useState('');
  const [noteText, setNoteText] = useState(
    'Bảng lịch trả nợ trên chỉ mang tính dự kiến, được lập trên giả định khách hàng trả nợ đúng hạn và đủ số tiền của từng kỳ. '
    + 'Số tiền lãi thực thu được tính trên dư nợ thực tế và số ngày thực tế của từng kỳ, do đó có thể khác với bảng dự kiến này. '
    + 'Trường hợp lãi suất được điều chỉnh theo hợp đồng tín dụng, số tiền phải trả sẽ thay đổi tương ứng.'
  );

  const buildDocHtml = () => buildCustomerScheduleDocHtml({
    rows, info, totals, orgName, customerName, docRef, preparedBy, noteText,
  });

  const handlePrintDoc = () => {
    if (rows.length === 0) return;
    printHtmlDoc(buildDocHtml(), 'Bản lịch trả nợ gửi khách hàng');
  };

  const handleExportDoc = () => {
    if (rows.length === 0) return;
    const blob = new Blob([buildDocHtml()], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = customerName.trim().replace(/\s+/g, '_') || 'KH';
    a.href = url;
    a.download = `Lich_Tra_No_Du_Kien_${slug}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const disabled = rows.length === 0;

  return (
    <div className={`${styles.containerCardBg} rounded-2xl p-5 border space-y-4`}>
      <div className="text-xs font-bold text-violet-500 uppercase tracking-wider flex items-center space-x-2 border-b pb-2 border-slate-200 dark:border-slate-800">
        <Send className="w-4 h-4" />
        <span>BẢN LỊCH TRẢ NỢ DỰ KIẾN GỬI KHÁCH HÀNG</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className={`block mb-1 ${styles.labelStyle}`}>Đơn vị lập bảng</label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            placeholder="VD: Ngân hàng ... – CN ..."
            className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
          />
        </div>
        <div>
          <label className={`block mb-1 ${styles.labelStyle}`}>Tên khách hàng</label>
          <input
            type="text"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            placeholder="Họ tên / tên tổ chức"
            className={`w-full rounded-xl p-2.5 font-bold ${styles.inputStyle}`}
          />
        </div>
        <div>
          <label className={`block mb-1 ${styles.labelStyle}`}>Số HĐTD / Đề nghị vay</label>
          <input
            type="text"
            value={docRef}
            onChange={e => setDocRef(e.target.value)}
            placeholder="VD: HD123/2026"
            className={`w-full rounded-xl p-2.5 font-mono ${styles.inputStyle}`}
          />
        </div>
        <div>
          <label className={`block mb-1 ${styles.labelStyle}`}>Cán bộ lập bảng</label>
          <input
            type="text"
            value={preparedBy}
            onChange={e => setPreparedBy(e.target.value)}
            className={`w-full rounded-xl p-2.5 ${styles.inputStyle}`}
          />
        </div>
      </div>

      <div>
        <label className={`block mb-1 ${styles.labelStyle}`}>Lưu ý in trên bản gửi khách hàng</label>
        <textarea
          rows={3}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          className={`w-full rounded-xl p-2.5 leading-relaxed ${styles.inputStyle}`}
        />
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          Bản gửi khách hàng được dựng riêng: chỉ gồm thông tin khoản vay, bảng lịch, lưu ý và phần ký — không kèm thông số nội bộ.
        </span>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportDoc}
            disabled={disabled}
            className="flex items-center space-x-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất bản gửi KH (.xls)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintDoc}
            disabled={disabled}
            className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In bản gửi KH (PDF)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
