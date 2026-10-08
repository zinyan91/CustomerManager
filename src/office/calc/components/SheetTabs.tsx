import React, { useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';
import type { CalcController } from '../controller';
import { Popover } from '../../shared/ribbon/controls';
import { useOfficeI18n } from '../../i18n';

export const SheetTabs: React.FC<{ controller: CalcController; onMessage: (text: string) => void }> = ({ controller, onMessage }) => {
  const { m } = useOfficeI18n();
  const t = m.calc.sheet;
  useSyncExternalStore(controller.subscribe, controller.getVersion);
  const { sheets } = controller.wb;

  const rename = (index: number) => {
    const name = window.prompt(t.renamePrompt, sheets[index].name);
    if (name === null) return;
    if (!controller.renameSheet(index, name)) onMessage(t.invalidName);
  };

  return (
    <div className="calc-sheet-tabs" role="tablist">
      <button type="button" className="wr-btn" title={t.add} aria-label={t.add} onClick={() => controller.addSheet()}>
        <Plus size={16} />
      </button>
      <div className="calc-sheet-tab-list">
        {sheets.map((sheet, index) => (
          <div key={sheet.name} className={`calc-sheet-tab${index === controller.active ? ' is-active' : ''}`}>
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
                {(close) => (
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
                      disabled={sheets.length <= 1}
                      onClick={() => {
                        close();
                        if (window.confirm(t.confirmDelete(sheet.name))) controller.deleteSheet(index);
                      }}
                    >
                      {t.delete}
                    </button>
                  </div>
                )}
              </Popover>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
