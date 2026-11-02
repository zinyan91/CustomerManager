import React from 'react';
import { useOfficeI18n } from '../../i18n';
import type { CalcController } from '../controller';
import { Popover } from '../../shared/ribbon/controls';
import { LargeBtn } from '../../shared/ribbon/controls';
import { TABLE_STYLE_PRESETS, applyTableStylePreset, type TableStylePreset } from '../utils/tableStyles';

export interface TableStylesGalleryProps {
  controller: CalcController;
  onApply?: () => void;
}

export const TableStylesGallery: React.FC<TableStylesGalleryProps> = ({ controller, onApply }) => {
  const { m } = useOfficeI18n();
  const t = m.calc;

  const lightPresets = TABLE_STYLE_PRESETS.filter((p) => p.category === 'light');
  const mediumPresets = TABLE_STYLE_PRESETS.filter((p) => p.category === 'medium');
  const darkPresets = TABLE_STYLE_PRESETS.filter((p) => p.category === 'dark');

  const handleSelectPreset = (preset: TableStylePreset, close: () => void) => {
    close();
    applyTableStylePreset(controller, preset);
    onApply?.();
  };

  const renderTableThumbnail = (preset: TableStylePreset, onSelect: () => void) => {
    const isDark = preset.category === 'dark';
    const dashColor = isDark || (preset.headerColor === '#fff') ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.55)';
    const bodyDashColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.35)';

    return (
      <button
        key={preset.id}
        type="button"
        className="calc-table-style-thumb"
        title={preset.name}
        aria-label={preset.name}
        style={{ borderColor: preset.borderColor ?? '#d9d9d9' }}
        onClick={onSelect}
      >
        <div
          className="calc-table-thumb-header"
          style={{ background: preset.header }}
        >
          <span className="calc-table-thumb-dash" style={{ background: dashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: dashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: dashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: dashColor }} />
        </div>
        <div
          className="calc-table-thumb-row"
          style={{ background: preset.band }}
        >
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
        </div>
        <div
          className="calc-table-thumb-row"
          style={{ background: preset.bandAlt ?? '#ffffff' }}
        >
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
        </div>
        <div
          className="calc-table-thumb-row"
          style={{ background: preset.band }}
        >
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
          <span className="calc-table-thumb-dash" style={{ background: bodyDashColor }} />
        </div>
      </button>
    );
  };

  return (
    <Popover
      button={({ toggle }) => (
        <LargeBtn
          title={t.cmd.formatAsTable}
          onClick={toggle}
          label={t.cmd.formatTableShort}
          hasDropdown
        >
          <div className="calc-table-icon">
            <div className="calc-table-head" />
            <div className="calc-table-row is-alt" />
            <div className="calc-table-row" />
          </div>
        </LargeBtn>
      )}
    >
      {(close) => (
        <div className="calc-table-styles-dropdown-panel" role="menu">
          <div className="calc-table-style-section">
            <div className="calc-table-style-section-title">{t.cmd.tableLight}</div>
            <div className="calc-table-style-grid">
              {lightPresets.map((preset) =>
                renderTableThumbnail(preset, () => handleSelectPreset(preset, close))
              )}
            </div>
          </div>

          <div className="calc-table-style-section">
            <div className="calc-table-style-section-title">{t.cmd.tableMedium}</div>
            <div className="calc-table-style-grid">
              {mediumPresets.map((preset) =>
                renderTableThumbnail(preset, () => handleSelectPreset(preset, close))
              )}
            </div>
          </div>

          <div className="calc-table-style-section">
            <div className="calc-table-style-section-title">{t.cmd.tableDark}</div>
            <div className="calc-table-style-grid">
              {darkPresets.map((preset) =>
                renderTableThumbnail(preset, () => handleSelectPreset(preset, close))
              )}
            </div>
          </div>

          <div className="calc-menu-sep" style={{ margin: '8px 0 4px 0' }} />

          <button
            type="button"
            className="calc-gallery-action-item"
            onClick={() => {
              close();
              window.dispatchEvent(new Event('calc-open-create-table'));
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="calc-action-item-icon">
              <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="#0078d4" strokeWidth="1.2" fill="none" />
              <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="#0078d4" strokeWidth="1.2" />
              <line x1="5.5" y1="5.5" x2="5.5" y2="14.5" stroke="#0078d4" strokeWidth="1" strokeDasharray="1 1" />
              <path d="M11 9.5V13.5M9 11.5H13" stroke="#107c41" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>{t.cmd.newTableStyle}</span>
          </button>

          <button
            type="button"
            className="calc-gallery-action-item"
            onClick={() => {
              close();
              window.dispatchEvent(new Event('calc-open-create-table'));
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="calc-action-item-icon">
              <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="#5c2d91" strokeWidth="1.2" fill="none" />
              <line x1="1.5" y1="5.5" x2="14.5" y2="5.5" stroke="#5c2d91" strokeWidth="1.2" />
              <line x1="6.5" y1="1.5" x2="6.5" y2="14.5" stroke="#5c2d91" strokeWidth="1.2" />
              <path d="M12 9.5L14 11.5L12 13.5" stroke="#d83b01" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t.cmd.newPivotTableStyle}</span>
          </button>
        </div>
      )}
    </Popover>
  );
};
