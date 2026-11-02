import React, { useMemo, useState } from 'react';
import { useOfficeI18n } from '../../../i18n';
import { FORMAT_PRESETS, formatValue } from '../../engine/numberFormat';
import type { Scalar } from '../../engine/values';
import type { FormatCellsDraft } from './types';

export interface NumberTabProps {
  draft: FormatCellsDraft;
  onChange: (patch: Partial<FormatCellsDraft>) => void;
  sampleValue: Scalar;
}

type CategoryKey = 'general' | 'number' | 'currency' | 'date' | 'time' | 'percentage' | 'fraction' | 'scientific' | 'text' | 'custom';

const EXTRA_CODES = ['#,##0.00', '0.0', '0.0%', 'dd/mm/yyyy', 'dd/mm/yyyy hh:mm', 'd mmmm yyyy', 'hh:mm', '[h]:mm', '# ?/?', '0.00E+00', '0000', '#,##0 "₫"', '#,##0;[Red]-#,##0'];

export const NumberTab: React.FC<NumberTabProps> = ({ draft, onChange, sampleValue }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.formatCells.number;
  const currentCode = draft.numFmt ?? 'General';

  const [category, setCategory] = useState<CategoryKey>(() => {
    if (!draft.numFmt || draft.numFmt === 'General') return 'general';
    if (draft.numFmt.includes('%')) return 'percentage';
    if (draft.numFmt.includes('₫') || draft.numFmt.includes('$')) return 'currency';
    if (draft.numFmt.includes('yy') || draft.numFmt.includes('mm/dd')) return 'date';
    if (draft.numFmt.includes('hh') || draft.numFmt.includes('ss')) return 'time';
    if (draft.numFmt.includes('E+')) return 'scientific';
    if (draft.numFmt.includes('?/?')) return 'fraction';
    if (draft.numFmt === '@') return 'text';
    if (draft.numFmt.startsWith('0') || draft.numFmt.startsWith('#,##0')) return 'number';
    return 'custom';
  });

  const [decimals, setDecimals] = useState<number>(() => {
    const dot = currentCode.indexOf('.');
    if (dot < 0) return 0;
    const zeros = currentCode.slice(dot + 1).match(/^0+/);
    return zeros ? zeros[0].length : 2;
  });

  const [thousands, setThousands] = useState<boolean>(() => currentCode.includes('#,##0'));

  const shown = useMemo(() => {
    try {
      return formatValue(sampleValue, currentCode.trim() === '' || currentCode === 'General' ? undefined : currentCode);
    } catch {
      return '';
    }
  }, [sampleValue, currentCode]);

  const updateNumberCode = (nextDecimals: number, nextThousands: boolean) => {
    setDecimals(nextDecimals);
    setThousands(nextThousands);
    const decStr = nextDecimals > 0 ? `.${'0'.repeat(nextDecimals)}` : '';
    const base = nextThousands ? '#,##0' : '0';
    onChange({ numFmt: `${base}${decStr}` });
  };

  const handleCategorySelect = (cat: CategoryKey) => {
    setCategory(cat);
    switch (cat) {
      case 'general':
        onChange({ numFmt: 'General' });
        break;
      case 'number':
        updateNumberCode(decimals, thousands);
        break;
      case 'currency':
        onChange({ numFmt: '#,##0 "₫"' });
        break;
      case 'date':
        onChange({ numFmt: 'dd/mm/yyyy' });
        break;
      case 'time':
        onChange({ numFmt: 'hh:mm:ss' });
        break;
      case 'percentage':
        onChange({ numFmt: '0.00%' });
        break;
      case 'fraction':
        onChange({ numFmt: '# ?/?' });
        break;
      case 'scientific':
        onChange({ numFmt: '0.00E+00' });
        break;
      case 'text':
        onChange({ numFmt: '@' });
        break;
      case 'custom':
        break;
    }
  };

  const codes = useMemo(
    () => [...Object.values(FORMAT_PRESETS), ...EXTRA_CODES].filter((c, i, all) => all.indexOf(c) === i),
    [],
  );

  return (
    <div className="fc-tab-pane fc-number-pane">
      <div className="fc-columns">
        <div className="fc-categories-col">
          <div className="fc-label">{t.category}</div>
          <div className="fc-list-box" role="listbox" aria-label={t.category}>
            {(Object.keys(t.categories) as CategoryKey[]).map((cat) => (
              <button
                key={cat}
                type="button"
                role="option"
                aria-selected={category === cat}
                className={`fc-list-item${category === cat ? ' is-selected' : ''}`}
                onClick={() => handleCategorySelect(cat)}
              >
                {t.categories[cat]}
              </button>
            ))}
          </div>
        </div>

        <div className="fc-detail-col">
          <div className="fc-preview-box">
            <div className="fc-label">{t.sample}</div>
            <div className="fc-sample-result">{shown}</div>
          </div>

          {category === 'number' && (
            <div className="fc-options-box">
              <label className="fc-field-row">
                <span>{t.decimalPlaces}</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={decimals}
                  onChange={(e) => updateNumberCode(Math.max(0, Math.min(10, Number(e.target.value))), thousands)}
                />
              </label>
              <label className="fc-check-row">
                <input
                  type="checkbox"
                  checked={thousands}
                  onChange={(e) => updateNumberCode(decimals, e.target.checked)}
                />
                <span>{t.useThousandSeparator}</span>
              </label>
            </div>
          )}

          {category === 'currency' && (
            <div className="fc-options-box">
              <div className="fc-presets-list">
                {['#,##0 "₫"', '#,##0.00 "₫"', '$#,##0', '$#,##0.00'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`fc-preset-btn${currentCode === code ? ' is-active' : ''}`}
                    onClick={() => onChange({ numFmt: code })}
                  >
                    <span>{code}</span>
                    <strong>{formatValue(sampleValue, code)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'date' && (
            <div className="fc-options-box">
              <div className="fc-presets-list">
                {['dd/mm/yyyy', 'd/m/yyyy', 'dd/mm/yyyy hh:mm', 'd mmmm yyyy', 'yyyy-mm-dd'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`fc-preset-btn${currentCode === code ? ' is-active' : ''}`}
                    onClick={() => onChange({ numFmt: code })}
                  >
                    <span>{code}</span>
                    <strong>{formatValue(sampleValue, code)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'time' && (
            <div className="fc-options-box">
              <div className="fc-presets-list">
                {['hh:mm', 'hh:mm:ss', '[h]:mm:ss', 'mm:ss.0'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`fc-preset-btn${currentCode === code ? ' is-active' : ''}`}
                    onClick={() => onChange({ numFmt: code })}
                  >
                    <span>{code}</span>
                    <strong>{formatValue(sampleValue, code)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'percentage' && (
            <div className="fc-options-box">
              <div className="fc-presets-list">
                {['0%', '0.0%', '0.00%'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`fc-preset-btn${currentCode === code ? ' is-active' : ''}`}
                    onClick={() => onChange({ numFmt: code })}
                  >
                    <span>{code}</span>
                    <strong>{formatValue(sampleValue, code)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {category === 'custom' && (
            <div className="fc-options-box">
              <label className="fc-field-row">
                <span>{t.customCode}</span>
                <input
                  type="text"
                  value={draft.numFmt ?? ''}
                  onChange={(e) => onChange({ numFmt: e.target.value })}
                  spellCheck={false}
                />
              </label>
              <div className="fc-presets-list is-scrollable">
                {codes.map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`fc-preset-btn${currentCode === code ? ' is-active' : ''}`}
                    onClick={() => onChange({ numFmt: code })}
                  >
                    <span>{code}</span>
                    <strong>{formatValue(sampleValue, code)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
