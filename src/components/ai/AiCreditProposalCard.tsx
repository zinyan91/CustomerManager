import { FileText, Loader2, CheckCircle2, AlertCircle, X, UserCheck, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import type { CreditProposal } from '../../hooks/useAiCreditProposals';
import type { ExtractedCollateral, ExtractedCustomer } from '../../lib/ai/creditExtract';
import { COLLATERAL_ASSET_TYPES, defaultLtvForAssetType } from '../../lib/collateralMath';
import { ownerDiffers, validateCreditIntake } from '../../lib/creditIntake';
import { fmtMoney } from '../../lib/utils';
import { DateInput } from '../DateInput';

interface AiCreditProposalCardProps {
  proposal: CreditProposal;
  onEditCustomer: (id: string, change: Partial<ExtractedCustomer>) => void;
  onEditCollateral: (id: string, index: number, change: Partial<ExtractedCollateral>) => void;
  onRemoveCollateral: (id: string, index: number) => void;
  onLookup: (id: string) => void;
  onRecord: (id: string) => void;
  onDismiss: (id: string) => void;
}

const input =
  'w-full px-2 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 disabled:opacity-60';
const lbl = 'block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5';

/** Thẻ AI đề xuất nhập hồ sơ tín dụng: khách hàng và từng tài sản bảo đảm sửa được, bấm Ghi mới lưu vào hệ thống. */
export function AiCreditProposalCard({ proposal, onEditCustomer, onEditCollateral, onRemoveCollateral, onLookup, onRecord, onDismiss }: AiCreditProposalCardProps) {
  const { id, attachment, status, data, match, saved, summary, error } = proposal;
  const locked = status === 'saving' || status === 'saved';
  const pending = data ? data.collaterals.filter((_, i) => !saved[i]) : [];
  const invalid = data ? validateCreditIntake(data.customer, pending, match.state === 'found') : null;
  const customer = data?.customer;

  return (
    <div className="max-w-3xl mr-auto ml-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-3 text-xs shadow-2xs">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="flex-1 truncate font-semibold text-slate-800 dark:text-slate-200" title={attachment.name}>
          Nhập hồ sơ tín dụng: {attachment.name}
        </span>
        {status !== 'saving' && (
          <button type="button" onClick={() => onDismiss(id)} aria-label="Bỏ đề xuất" className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {status === 'reading' && (
        <div role="status" className="flex items-center gap-2 text-slate-500 py-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          AI đang đọc hồ sơ để trích khách hàng và tài sản bảo đảm...
        </div>
      )}

      {status === 'error' && (
        <div role="alert" className="flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {data && customer && (
        <>
          <section aria-label="Khách hàng">
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">Khách hàng</h4>
              <MatchBadge proposal={proposal} onLookup={() => onLookup(id)} />
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <div>
                <label className={lbl} htmlFor={`${id}-name`}>Họ tên</label>
                <input id={`${id}-name`} disabled={locked} value={customer.fullName} onChange={(e) => onEditCustomer(id, { fullName: e.target.value })} className={input} />
              </div>
              <div>
                <label className={lbl} htmlFor={`${id}-cif`}>Mã CIF</label>
                <input id={`${id}-cif`} disabled={locked} value={customer.cif} onChange={(e) => onEditCustomer(id, { cif: e.target.value })} onBlur={() => onLookup(id)} className={`${input} font-mono`} />
              </div>
              <div>
                <label className={lbl} htmlFor={`${id}-cccd`}>Số CCCD</label>
                <input id={`${id}-cccd`} disabled={locked} value={customer.nationalId} onChange={(e) => onEditCustomer(id, { nationalId: e.target.value.replace(/\D/g, '').slice(0, 12) })} onBlur={() => onLookup(id)} className={`${input} font-mono`} />
              </div>
              <div>
                <label className={lbl} htmlFor={`${id}-phone`}>Số điện thoại</label>
                <input id={`${id}-phone`} disabled={locked} value={customer.phone} onChange={(e) => onEditCustomer(id, { phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`${input} font-mono`} />
              </div>
              <div>
                <label className={lbl} htmlFor={`${id}-issued`}>Ngày cấp CCCD</label>
                <DateInput id={`${id}-issued`} disabled={locked} value={customer.idCardIssueDate} onChange={(iso) => onEditCustomer(id, { idCardIssueDate: iso })} className={input} />
              </div>
              <div>
                <label className={lbl} htmlFor={`${id}-place`}>Nơi cấp</label>
                <input id={`${id}-place`} disabled={locked} value={customer.idCardIssuePlace} onChange={(e) => onEditCustomer(id, { idCardIssuePlace: e.target.value })} className={input} />
              </div>
              <div className="col-span-2">
                <label className={lbl} htmlFor={`${id}-address`}>Địa chỉ</label>
                <input id={`${id}-address`} disabled={locked} value={customer.address} onChange={(e) => onEditCustomer(id, { address: e.target.value })} className={input} />
              </div>
              <div>
                <label className={lbl} htmlFor={`${id}-spouse`}>Vợ / Chồng</label>
                <input id={`${id}-spouse`} disabled={locked} value={customer.spouseName} onChange={(e) => onEditCustomer(id, { spouseName: e.target.value, maritalStatus: e.target.value.trim() ? 'Đã kết hôn' : customer.maritalStatus })} className={input} />
              </div>
              <div>
                <label className={lbl} htmlFor={`${id}-spouse-id`}>CCCD vợ / chồng</label>
                <input id={`${id}-spouse-id`} disabled={locked} value={customer.spouseNationalId} onChange={(e) => onEditCustomer(id, { spouseNationalId: e.target.value.replace(/\D/g, '').slice(0, 12) })} className={`${input} font-mono`} />
              </div>
            </div>
          </section>

          <section aria-label="Tài sản bảo đảm" className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">Tài sản bảo đảm ({data.collaterals.length})</h4>
            {data.collaterals.length === 0 && <div className="text-slate-500">Hồ sơ không nêu tài sản bảo đảm.</div>}

            <ul className="space-y-2">
              {data.collaterals.map((c, i) => {
                const done = saved[i];
                const off = locked || done;
                return (
                  <li key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2" aria-label={`Tài sản ${i + 1}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Tài sản {i + 1}</span>
                      {done && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Đã lưu
                        </span>
                      )}
                      {!done && !locked && (
                        <button type="button" onClick={() => onRemoveCollateral(id, i)} aria-label={`Bỏ tài sản ${i + 1}`} className="ml-auto p-0.5 text-slate-400 hover:text-rose-600 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <label className={lbl} htmlFor={`${id}-t${i}-type`}>Loại tài sản</label>
                        <select
                          id={`${id}-t${i}-type`}
                          disabled={off}
                          value={c.assetType}
                          onChange={(e) => onEditCollateral(id, i, { assetType: e.target.value, ltvPercent: defaultLtvForAssetType(e.target.value) })}
                          className={input}
                        >
                          {COLLATERAL_ASSET_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={lbl} htmlFor={`${id}-t${i}-code`}>Mã chứng thư</label>
                        <input id={`${id}-t${i}-code`} disabled={off} value={c.assetCode} onChange={(e) => onEditCollateral(id, i, { assetCode: e.target.value })} className={`${input} font-mono`} />
                      </div>
                      <div className="col-span-2">
                        <label className={lbl} htmlFor={`${id}-t${i}-addr`}>Địa chỉ / mô tả</label>
                        <input id={`${id}-t${i}-addr`} disabled={off} value={c.address} onChange={(e) => onEditCollateral(id, i, { address: e.target.value })} className={input} />
                      </div>
                      <div>
                        <label className={lbl} htmlFor={`${id}-t${i}-value`}>Giá trị định giá (VNĐ)</label>
                        <input
                          id={`${id}-t${i}-value`}
                          inputMode="numeric"
                          disabled={off}
                          value={c.appraisedValue === null ? '' : String(c.appraisedValue)}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            onEditCollateral(id, i, { appraisedValue: digits ? Number(digits) : null });
                          }}
                          className={`${input} font-mono`}
                        />
                        {c.appraisedValue !== null && <div className="mt-0.5 text-[10px] text-slate-400">{fmtMoney(c.appraisedValue)}</div>}
                      </div>
                      <div>
                        <label className={lbl} htmlFor={`${id}-t${i}-date`}>Ngày định giá</label>
                        <DateInput id={`${id}-t${i}-date`} disabled={off} value={c.appraisalDate} onChange={(iso) => onEditCollateral(id, i, { appraisalDate: iso })} className={input} />
                      </div>
                      <div>
                        <label className={lbl} htmlFor={`${id}-t${i}-tenor`}>Hiệu lực định giá (tháng)</label>
                        <input
                          id={`${id}-t${i}-tenor`}
                          inputMode="numeric"
                          disabled={off}
                          value={String(c.tenorMonths)}
                          onChange={(e) => onEditCollateral(id, i, { tenorMonths: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                          className={`${input} font-mono`}
                        />
                      </div>
                      <div>
                        <label className={lbl} htmlFor={`${id}-t${i}-ltv`}>Tỷ lệ LTV (%)</label>
                        <input
                          id={`${id}-t${i}-ltv`}
                          inputMode="numeric"
                          disabled={off}
                          value={String(c.ltvPercent)}
                          onChange={(e) => onEditCollateral(id, i, { ltvPercent: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                          className={`${input} font-mono`}
                        />
                      </div>
                    </div>
                    {ownerDiffers(c.ownerName, customer.fullName) && (
                      <div role="note" className="mt-1.5 flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Hồ sơ ghi chủ tài sản là {c.ownerName}, khác người vay. Tài sản vẫn gắn với {customer.fullName || 'khách hàng này'}; hãy kiểm tra lại.</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {summary && (
            <div role="status" className="mt-2 flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{summary}</span>
            </div>
          )}
          {error && status !== 'error' && (
            <div role="alert" className="mt-2 flex items-start gap-1.5 text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            {status === 'saved' ? (
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đã ghi vào hệ thống
              </span>
            ) : (
              <>
                {invalid && <span className="text-amber-700 dark:text-amber-300 mr-auto">{invalid}</span>}
                <button
                  type="button"
                  disabled={Boolean(invalid) || status === 'saving' || match.state === 'checking'}
                  onClick={() => onRecord(id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {status === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Ghi vào hệ thống
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MatchBadge({ proposal, onLookup }: { proposal: CreditProposal; onLookup: () => void }) {
  const { match } = proposal;
  if (match.state === 'checking') {
    return (
      <span role="status" className="inline-flex items-center gap-1 text-slate-500">
        <Loader2 className="w-3 h-3 animate-spin" /> Đang tra khách hàng...
      </span>
    );
  }
  if (match.state === 'found' && match.customer) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium" title="Chỉ điền các ô còn trống, không ghi đè thông tin đã có">
        <UserCheck className="w-3.5 h-3.5" />
        Đã có trong hệ thống: {match.customer.FullName}
        {match.by ? (match.by === 'cif' ? ' (theo CIF)' : ' (theo CCCD)') : ''}. Chỉ điền ô còn trống.
      </span>
    );
  }
  if (match.state === 'new') {
    return (
      <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
        <UserPlus className="w-3.5 h-3.5" />
        Chưa có, sẽ tạo khách hàng mới
      </span>
    );
  }
  if (match.state === 'error') {
    return (
      <span role="alert" className="inline-flex items-start gap-1 text-rose-700 dark:text-rose-300">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{match.message}</span>
        <button type="button" onClick={onLookup} aria-label="Tra lại khách hàng" className="p-0.5 hover:text-rose-900 cursor-pointer">
          <RefreshCw className="w-3 h-3" />
        </button>
      </span>
    );
  }
  return null;
}
