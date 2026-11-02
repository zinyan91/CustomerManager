import React from 'react';
import { useOfficeI18n } from '../../../i18n';
import type { FormatCellsDraft } from './types';

export interface AlignmentTabProps {
  draft: FormatCellsDraft;
  onChange: (patch: Partial<FormatCellsDraft>) => void;
}

export const AlignmentTab: React.FC<AlignmentTabProps> = ({ draft, onChange }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.formatCells.alignment;

  return (
    <div className="fc-tab-pane fc-alignment-pane">
      <div className="fc-align-grid">
        <fieldset className="fc-fieldset">
          <legend className="fc-legend">{t.textAlignment}</legend>
          <div className="fc-field-grid">
            <label className="fc-field-row">
              <span>{t.horizontal}</span>
              <select
                value={draft.hAlign ?? ''}
                onChange={(e) => onChange({ hAlign: (e.target.value || undefined) as FormatCellsDraft['hAlign'] })}
              >
                <option value="">{t.hAligns.general}</option>
                <option value="left">{t.hAligns.left}</option>
                <option value="center">{t.hAligns.center}</option>
                <option value="right">{t.hAligns.right}</option>
                <option value="justify">{t.hAligns.justify}</option>
              </select>
            </label>

            <label className="fc-field-row">
              <span>{t.indent}</span>
              <input
                type="number"
                min={0}
                max={15}
                value={draft.indent ?? 0}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(15, Number(e.target.value)));
                  onChange({ indent: val > 0 ? val : undefined });
                }}
              />
            </label>

            <label className="fc-field-row">
              <span>{t.vertical}</span>
              <select
                value={draft.vAlign ?? 'bottom'}
                onChange={(e) => onChange({ vAlign: (e.target.value || undefined) as FormatCellsDraft['vAlign'] })}
              >
                <option value="top">{t.vAligns.top}</option>
                <option value="middle">{t.vAligns.middle}</option>
                <option value="bottom">{t.vAligns.bottom}</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="fc-fieldset fc-orientation-fieldset">
          <legend className="fc-legend">{t.orientation}</legend>
          <div className="fc-orientation-box">
            <label className="fc-field-row">
              <span>{t.degrees}</span>
              <input
                type="number"
                min={-90}
                max={90}
                value={draft.rotation ?? 0}
                onChange={(e) => {
                  const val = Math.max(-90, Math.min(90, Number(e.target.value)));
                  onChange({ rotation: val !== 0 ? val : undefined });
                }}
              />
            </label>
            <div className="fc-rotation-buttons">
              {[0, 45, 90, -45, -90].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  className={`fc-preset-btn${(draft.rotation ?? 0) === deg ? ' is-active' : ''}`}
                  onClick={() => onChange({ rotation: deg !== 0 ? deg : undefined })}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset className="fc-fieldset fc-fullwidth">
          <legend className="fc-legend">{t.textControl}</legend>
          <div className="fc-checks-col">
            <label className="fc-check-row">
              <input
                type="checkbox"
                checked={!!draft.wrap}
                onChange={(e) => onChange({ wrap: e.target.checked ? true : undefined })}
              />
              <span>{t.wrapText}</span>
            </label>
            <label className="fc-check-row">
              <input
                type="checkbox"
                checked={!!draft.shrink}
                onChange={(e) => onChange({ shrink: e.target.checked ? true : undefined })}
              />
              <span>{t.shrinkToFit}</span>
            </label>
          </div>
        </fieldset>
      </div>
    </div>
  );
};
