import React, { useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';
import type { CalcController } from '../controller';
import { Popover } from '../../shared/ribbon/controls';
import { useOfficeI18n } from '../../i18n';

const TAB_COLORS = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];

export const SheetTabs: React.FC<{ controller: CalcController; onMessage: (text: string) => void }> = ({ controller, onMessage }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.sheet;
  const [tabContextMenu, setTabContextMenu] = React.useState<{ index: number; x: number; y: number } | null>(null);
  useSyncExternalStore(controller.subscribe, controller.getVersion);
  const { sheets } = controller.wb;

  React.useEffect(() => {
    const handleClose = () => setTabContextMenu(null);
    window.addEventListener('pointerdown', handleClose);
    return () => window.removeEventListener('pointerdown', handleClose);
  }, []);

  const rename = (index: number) => {
    const name = window.prompt(t.renamePrompt, sheets[index].name);
    if (name === null) return;
    if (!controller.renameSheet(index, name)) onMessage(t.invalidName);
  };

  const renderMenuItems = (index: number, close: () => void) => {
    const sheet = sheets[index];
    return (
      <div className="wr-menu">
        <button
          type="button"
          className="wr-menu-item"
          onClick={() => {
            close();
            rename(index);
          }}
        >
          {t.rename}
        </button>
        <button
          type="button"
          className="wr-menu-item"
          onClick={() => {
            close();
            controller.duplicateSheet(index);
          }}
        >
          {t.duplicate}
        </button>
        <button
          type="button"
          className="wr-menu-item"
          disabled={index === 0}
          onClick={() => {
            close();
            controller.moveSheet(index, -1);
          }}
        >
          {t.moveLeft}
        </button>
        <button
          type="button"
          className="wr-menu-item"
          disabled={index === sheets.length - 1}
          onClick={() => {
            close();
            controller.moveSheet(index, 1);
          }}
        >
          {t.moveRight}
        </button>
        <div className="calc-tab-colors" role="group" aria-label={t.tabColor}>
          {TAB_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="calc-tab-color"
              aria-label={color}
              style={{ background: color }}
              onClick={() => {
                close();
                controller.setTabColor(index, color);
              }}
            />
          ))}
          <button
            type="button"
            className="wr-menu-item"
            onClick={() => {
              close();
              controller.setTabColor(index, null);
            }}
          >
            {t.noTabColor}
          </button>
        </div>
        <button
          type="button"
          className="wr-menu-item"
          disabled={sheets.filter((s) => !s.hidden).length <= 1}
          onClick={() => {
            close();
            controller.setSheetHidden(index, true);
          }}
        >
          {t.hide}
        </button>
        {sheets.map((hiddenSheet, hiddenIndex) =>
          hiddenSheet.hidden ? (
            <button
              key={`show-${hiddenSheet.name}`}
              type="button"
              className="wr-menu-item"
              onClick={() => {
                close();
                controller.setSheetHidden(hiddenIndex, false);
              }}
            >
              {t.unhide(hiddenSheet.name)}
            </button>
          ) : null,
        )}
        <button
          type="button"
          className="wr-menu-item"
          disabled={sheets.length <= 1}
          onClick={() => {
            close();
            if (window.confirm(t.confirmDelete(sheet.name))) controller.deleteSheet(index);
          }}
        >
          {t.delete}
        </button>
      </div>
    );
  };

  return (
    <div className="calc-sheet-tabs" role="tablist">
      <button type="button" className="wr-btn" title={t.add} aria-label={t.add} onClick={() => controller.addSheet()}>
        <Plus size={16} />
      </button>
      <div className="calc-sheet-tab-list">
        {sheets.map((sheet, index) => sheet.hidden ? null : (
          <div
            key={sheet.name}
            className={`calc-sheet-tab${index === controller.active ? ' is-active' : ''}`}
            style={sheet.tabColor ? { boxShadow: `inset 0 -3px 0 ${sheet.tabColor}` } : undefined}
            onContextMenu={(event) => {
              event.preventDefault();
              controller.switchSheet(index);
              setTabContextMenu({ index, x: event.clientX, y: event.clientY });
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={index === controller.active}
              onClick={() => controller.switchSheet(index)}
              onDoubleClick={() => rename(index)}
            >
              {sheet.name}
            </button>
            {index === controller.active && (
              <Popover
                button={({ toggle }) => (
                  <button type="button" className="calc-tab-menu" aria-label={`${sheet.name} …`} onClick={toggle}>
                    ▾
                  </button>
                )}
              >
                {(close) => renderMenuItems(index, close)}
              </Popover>
            )}
          </div>
        ))}
      </div>
      {tabContextMenu && (
        <div
          className="calc-context-menu wr-menu"
          role="menu"
          style={{
            position: 'fixed',
            left: Math.max(4, Math.min(tabContextMenu.x, window.innerWidth - 200)),
            top: Math.max(4, Math.min(tabContextMenu.y - 220, window.innerHeight - 260)),
            zIndex: 100,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {renderMenuItems(tabContextMenu.index, () => setTabContextMenu(null))}
        </div>
      )}
    </div>
  );
};
