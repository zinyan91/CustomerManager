import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { NAMED_STYLES, type NamedStyle } from '../utils/cellStyles';
import { LargeBtn, Popover } from '../../shared/ribbon/controls';
import { RibbonCellStylesIcon } from './ribbon/CellIcons';

export interface CellStylesGalleryProps {
  controller: CalcController;
  onApply?: () => void;
  onOpenFormatCells?: () => void;
}

// 6 items x 2 rows in the ribbon preview (4 shown on >=1460px, all 6 on >=1750px)
const PREVIEW_ROW_1: NamedStyle[] = ['normal', 'bad', 'good', 'neutral', 'calculation', 'input'];
const PREVIEW_ROW_2: NamedStyle[] = ['check', 'explanatory', 'followedHyperlink', 'hyperlink', 'note', 'output'];

interface StyleGroup {
  title: string;
  gridCols?: number;
  styles: NamedStyle[];
}

export const CellStylesGallery: React.FC<CellStylesGalleryProps> = ({
  controller,
  onApply,
  onOpenFormatCells,
}) => {
  const { m } = useOfficeI18n();
  const t = m.calc;

  const groups: StyleGroup[] = [
    {
      title: t.styleCategories.goodBadNeutral,
      gridCols: 4,
      styles: ['normal', 'bad', 'good', 'neutral'],
    },
    {
      title: t.styleCategories.dataModel,
      gridCols: 6,
      styles: [
        'calculation',
        'check',
        'explanatory',
        'followedHyperlink',
        'hyperlink',
        'input',
        'linkedCell',
        'note',
        'output',
        'warning',
      ],
    },
    {
      title: t.styleCategories.titlesHeadings,
      gridCols: 6,
      styles: ['heading1', 'heading2', 'heading3', 'heading4', 'title', 'total'],
    },
    {
      title: t.styleCategories.themedStyles,
      gridCols: 6,
      styles: [
        'accent1_20',
        'accent2_20',
        'accent3_20',
        'accent4_20',
        'accent5_20',
        'accent6_20',
        'accent1_40',
        'accent2_40',
        'accent3_40',
        'accent4_40',
        'accent5_40',
        'accent6_40',
        'accent1_60',
        'accent2_60',
        'accent3_60',
        'accent4_60',
        'accent5_60',
        'accent6_60',
        'accent1',
        'accent2',
        'accent3',
        'accent4',
        'accent5',
        'accent6',
      ],
    },
    {
      title: t.styleCategories.numberFormat,
      gridCols: 5,
      styles: ['comma', 'comma0', 'currency', 'currency0', 'percent'],
    },
  ];

  const applyStyle = (name: NamedStyle) => {
    const s = NAMED_STYLES[name];
    controller.restyle((old) => ({ ...s, numFmt: old.numFmt }));
    onApply?.();
  };

  const getCustomStyle = (name: NamedStyle): React.CSSProperties => {
    const s = NAMED_STYLES[name];
    const base: React.CSSProperties = {
      background: s.fill ?? '#ffffff',
      color: s.color ?? '#242424',
      fontWeight: s.bold ? 600 : 400,
      fontStyle: s.italic ? 'italic' : 'normal',
      textDecoration: s.underline ? 'underline' : 'none',
      border: '1px solid #d4d4d4',
    };

    if (name === 'normal') {
      base.border = '1px solid #7f7f7f';
    } else if (name === 'calculation' || name === 'input' || name === 'note') {
      base.border = '1px solid #7f7f7f';
    } else if (name === 'check') {
      base.border = '1px solid #333333';
    } else if (name === 'linkedCell') {
      base.background = 'transparent';
      base.border = 'none';
      base.borderBottom = '2px solid #fa7d00';
    } else if (name === 'output') {
      base.border = '1px solid #333333';
      base.borderBottom = '3px double #333333';
    } else if (name === 'explanatory' || name === 'followedHyperlink' || name === 'hyperlink' || name === 'warning') {
      base.background = 'transparent';
      base.border = '1px solid transparent';
    } else if (name === 'heading1') {
      base.background = 'transparent';
      base.border = 'none';
      base.borderBottom = '2px solid #1f4e79';
      base.fontSize = '0.88rem';
    } else if (name === 'heading2') {
      base.background = 'transparent';
      base.border = 'none';
      base.borderBottom = '1.5px solid #1f4e79';
      base.fontSize = '0.84rem';
    } else if (name === 'heading3') {
      base.background = 'transparent';
      base.border = 'none';
      base.borderBottom = '1px solid #8ea9db';
      base.fontSize = '0.8rem';
    } else if (name === 'heading4') {
      base.background = 'transparent';
      base.border = 'none';
      base.fontSize = '0.8rem';
    } else if (name === 'title') {
      base.background = 'transparent';
      base.border = 'none';
      base.fontSize = '0.98rem';
    } else if (name === 'total') {
      base.background = 'transparent';
      base.border = 'none';
      base.borderTop = '1px solid #000000';
      base.borderBottom = '3px double #000000';
    } else if (name.startsWith('accent')) {
      base.border = '1px solid transparent';
    } else if (['comma', 'comma0', 'currency', 'currency0', 'percent'].includes(name)) {
      base.background = 'transparent';
      base.border = '1px solid transparent';
    }

    return base;
  };

  const renderChip = (name: NamedStyle, isPreview = false) => {
    const customStyle = getCustomStyle(name);

    return (
      <button
        key={name}
        type="button"
        className={isPreview ? 'calc-gallery-chip' : 'calc-dropdown-chip'}
        style={customStyle}
        title={`${t.cmd.cellStyles}: ${t.styles[name]}`}
        onClick={() => applyStyle(name)}
      >
        <span>{t.styles[name]}</span>
      </button>
    );
  };

  const renderDropdownPanel = (close: () => void) => (
    <div className="calc-styles-dropdown-panel" role="menu">
      {groups.map((grp) => (
        <div key={grp.title} className="calc-styles-category">
          <div className="calc-styles-category-title">{grp.title}</div>
          <div
            className="calc-styles-category-grid"
            style={{
              gridTemplateColumns: `repeat(${grp.gridCols ?? 6}, 1fr)`,
            }}
          >
            {grp.styles.map((name) => {
              const customStyle = getCustomStyle(name);
              return (
                <button
                  key={name}
                  type="button"
                  className="calc-dropdown-chip"
                  style={customStyle}
                  onClick={() => {
                    close();
                    applyStyle(name);
                  }}
                >
                  {t.styles[name]}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="calc-menu-sep" style={{ margin: '8px 0 4px 0' }} />

      <button
        type="button"
        className="calc-gallery-action-item"
        onClick={() => {
          close();
          onOpenFormatCells?.();
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="calc-action-item-icon">
          <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="var(--fl-accent)" strokeWidth="1.2" fill="none" />
          <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="var(--fl-accent)" strokeWidth="1.2" />
          <line x1="5.5" y1="5.5" x2="5.5" y2="14.5" stroke="var(--fl-accent)" strokeWidth="1" strokeDasharray="1 1" />
          <path d="M11 9.5V13.5M9 11.5H13" stroke="var(--fl-accent)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>{t.styleCategories.newCellStyle}</span>
      </button>

    </div>
  );

  return (
    <>
      {/* Compact button (< 1660px or standard desktop screens) */}
      <div className="calc-cell-styles-compact">
        <Popover
          align="end"
          button={({ toggle }) => (
            <LargeBtn title={t.cmd.cellStyles} onClick={toggle} label={t.cmd.cellStyles} hasDropdown>
              <RibbonCellStylesIcon />
            </LargeBtn>
          )}
        >
          {(close) => renderDropdownPanel(close)}
        </Popover>
      </div>

      {/* Expanded gallery preview (>= 1541px on ultra-wide screens) */}
      <div className="calc-cell-styles-box" role="group" aria-label={t.cmd.cellStyles}>
        <div className="calc-cell-styles-grid">
          <div className="calc-gallery-row">
            {PREVIEW_ROW_1.map((name) => renderChip(name, true))}
          </div>
          <div className="calc-gallery-row">
            {PREVIEW_ROW_2.map((name) => renderChip(name, true))}
          </div>
        </div>

        <Popover
          align="end"
          button={({ toggle }) => (
            <button
              type="button"
              className="calc-gallery-more-btn"
              title={t.cmd.cellStyles}
              aria-label={t.cmd.cellStyles}
              onClick={toggle}
            >
              <ChevronDown size={11} />
            </button>
          )}
        >
          {(close) => renderDropdownPanel(close)}
        </Popover>
      </div>
    </>
  );
};
