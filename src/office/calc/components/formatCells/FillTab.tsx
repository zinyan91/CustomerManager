import React from 'react';
import { useOfficeI18n } from '../../../i18n';
import type { FormatCellsDraft } from './types';

export interface FillTabProps {
  draft: FormatCellsDraft;
  onChange: (patch: Partial<FormatCellsDraft>) => void;
}

const PALETTE = [
  '#ffffff', '#000000', '#eeece1', '#1f497d', '#4f81bd', '#c0504d', '#9bbb59', '#8064a2', '#4bacc6', '#f79646',
  '#f2f2f2', '#7f7f7f', '#ddd9c3', '#c6d9f0', '#dce6f1', '#f2dcdb', '#ebf1dd', '#e5e0ec', '#dbeef3', '#fdeada',
  '#d8d8d8', '#595959', '#c4bd97', '#8db3e2', '#b8cce4', '#e5b9b7', '#d7e3bc', '#ccc1d9', '#b7dde8', '#fbd5b5',
  '#bfbfbf', '#3f3f3f', '#938953', '#548dd4', '#95b3d7', '#d99694', '#c3d69b', '#b2a2c7', '#92cddc', '#fac08f',
  '#a5a5a5', '#262626', '#494429', '#17365d', '#366092', '#953734', '#76933c', '#60497a', '#31859b', '#e36c09',
  '#7f7f7f', '#0c0c0c', '#1d1b10', '#0f243e', '#244062', '#632423', '#4f6128', '#403151', '#205867', '#974806',
];

export const FillTab: React.FC<FillTabProps> = ({ draft, onChange }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.formatCells.fill;

  const currentFill = draft.fill;

  return (
    <div className="fc-tab-pane fc-fill-pane">
      <div className="fc-fill-layout">
        <div className="fc-fill-header-row">
          <button
            type="button"
            className="fc-preset-btn"
            onClick={() => onChange({ fill: undefined })}
          >
            {t.noColor}
          </button>
          <label className="fc-field-row" style={{ margin: 0 }}>
            <span>Custom:</span>
            <input
              type="color"
              value={currentFill ?? '#ffffff'}
              onChange={(e) => onChange({ fill: e.target.value })}
              className="fc-color-input"
            />
          </label>
        </div>

        <div className="fc-label" style={{ marginTop: '0.6rem' }}>{t.backgroundColor}</div>
        <div className="fc-color-grid" role="grid" aria-label={t.backgroundColor}>
          {PALETTE.map((hex, i) => (
            <button
              key={`${hex}-${i}`}
              type="button"
              className={`fc-color-swatch${currentFill?.toLowerCase() === hex.toLowerCase() ? ' is-selected' : ''}`}
              style={{ backgroundColor: hex }}
              title={hex}
              aria-label={hex}
              onClick={() => onChange({ fill: hex })}
            />
          ))}
        </div>

        <div className="fc-fill-preview-box">
          <div className="fc-label">{t.sample}</div>
          <div
            className="fc-fill-sample-display"
            style={{
              backgroundColor: currentFill ?? 'transparent',
              border: '1px solid var(--border-subtle)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
