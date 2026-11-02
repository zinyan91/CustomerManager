import React, { useState } from 'react';
import { useOfficeI18n } from '../../../i18n';
import type { BorderLine, Borders } from '../../model/workbook';
import { borderCss } from '../../utils/borderLines';
import type { BorderLineStyleKey, FormatCellsDraft } from './types';

export interface BorderTabProps {
  draft: FormatCellsDraft;
  onChange: (patch: Partial<FormatCellsDraft>) => void;
}

const LINE_STYLES: Array<'thin' | 'medium' | 'thick' | 'double' | 'dotted' | 'dashed' | 'hair'> = [
  'thin',
  'medium',
  'thick',
  'double',
  'dotted',
  'dashed',
  'hair',
];

export const BorderTab: React.FC<BorderTabProps> = ({ draft, onChange }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.formatCells.border;

  const [activeStyle, setActiveStyle] = useState<BorderLineStyleKey>('thin');
  const [activeColor, setActiveColor] = useState<string>('#000000');

  const currentBorders: Borders = draft.borders ?? {};

  const makeLine = (): BorderLine | true => {
    if (activeColor.toLowerCase() === '#000000' && activeStyle === 'thin') return true;
    return { style: activeStyle as BorderLine['style'], color: activeColor };
  };

  const toggleEdge = (edge: keyof Borders) => {
    const next: Borders = { ...currentBorders };
    if (next[edge]) {
      delete next[edge];
    } else {
      next[edge] = makeLine();
    }
    onChange({ borders: Object.keys(next).length > 0 ? next : undefined });
  };

  const applyPresetNone = () => {
    onChange({ borders: undefined });
  };

  const applyPresetOutline = () => {
    const line = makeLine();
    const next: Borders = {
      ...currentBorders,
      top: line,
      bottom: line,
      left: line,
      right: line,
    };
    onChange({ borders: next });
  };

  const cssFor = (edge?: boolean | BorderLine) => borderCss(edge, '#000000') ?? '1px solid transparent';

  return (
    <div className="fc-tab-pane fc-border-pane">
      <div className="fc-border-layout">
        <div className="fc-border-left-col">
          <fieldset className="fc-fieldset">
            <legend className="fc-legend">{t.line}</legend>
            <div className="fc-label">{t.style}</div>
            <div className="fc-line-styles-list" role="listbox" aria-label={t.style}>
              {LINE_STYLES.map((st) => (
                <button
                  key={st}
                  type="button"
                  role="option"
                  aria-selected={activeStyle === st}
                  className={`fc-line-style-item${activeStyle === st ? ' is-selected' : ''}`}
                  onClick={() => setActiveStyle(st)}
                >
                  <span
                    className="fc-line-sample"
                    style={{
                      borderBottom: borderCss({ style: st as BorderLine['style'], color: activeColor }, '#000000'),
                    }}
                  />
                  <small>{t.styles[st]}</small>
                </button>
              ))}
            </div>

            <label className="fc-field-row" style={{ marginTop: '0.6rem' }}>
              <span>{t.color}</span>
              <input
                type="color"
                value={activeColor}
                onChange={(e) => setActiveColor(e.target.value)}
                className="fc-color-input"
              />
            </label>
          </fieldset>
        </div>

        <div className="fc-border-right-col">
          <div className="fc-presets-row">
            <div className="fc-label">{t.presets}</div>
            <div className="fc-preset-buttons">
              <button type="button" className="fc-preset-btn" onClick={applyPresetNone}>
                {t.none}
              </button>
              <button type="button" className="fc-preset-btn" onClick={applyPresetOutline}>
                {t.outline}
              </button>
            </div>
          </div>

          <div className="fc-interactive-border-box">
            <div className="fc-label">{t.border}</div>
            <div className="fc-border-canvas-wrap">
              <button
                type="button"
                className={`fc-edge-toggle is-top${currentBorders.top ? ' is-active' : ''}`}
                title={t.top}
                aria-label={t.top}
                onClick={() => toggleEdge('top')}
              >
                Top
              </button>

              <div className="fc-border-middle-row">
                <button
                  type="button"
                  className={`fc-edge-toggle is-left${currentBorders.left ? ' is-active' : ''}`}
                  title={t.left}
                  aria-label={t.left}
                  onClick={() => toggleEdge('left')}
                >
                  Left
                </button>

                <div
                  className="fc-border-cell-preview"
                  style={{
                    borderTop: cssFor(currentBorders.top),
                    borderBottom: cssFor(currentBorders.bottom),
                    borderLeft: cssFor(currentBorders.left),
                    borderRight: cssFor(currentBorders.right),
                  }}
                >
                  <div className="fc-preview-center-text">Text</div>
                </div>

                <button
                  type="button"
                  className={`fc-edge-toggle is-right${currentBorders.right ? ' is-active' : ''}`}
                  title={t.right}
                  aria-label={t.right}
                  onClick={() => toggleEdge('right')}
                >
                  Right
                </button>
              </div>

              <button
                type="button"
                className={`fc-edge-toggle is-bottom${currentBorders.bottom ? ' is-active' : ''}`}
                title={t.bottom}
                aria-label={t.bottom}
                onClick={() => toggleEdge('bottom')}
              >
                Bottom
              </button>
            </div>

            <div className="fc-diagonal-toggles">
              <button
                type="button"
                className={`fc-preset-btn${currentBorders.diagonalUp ? ' is-active' : ''}`}
                onClick={() => toggleEdge('diagonalUp')}
              >
                {t.diagonalUp}
              </button>
              <button
                type="button"
                className={`fc-preset-btn${currentBorders.diagonalDown ? ' is-active' : ''}`}
                onClick={() => toggleEdge('diagonalDown')}
              >
                {t.diagonalDown}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
