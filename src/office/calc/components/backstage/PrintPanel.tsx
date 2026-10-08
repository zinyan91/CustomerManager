import React, { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { CalcController } from '../../controller';
import { MARGIN_PRESETS, type PaperSize } from '../../model/workbook';
import { buildPrintHtml, PAPER_MM, printHtml, printRangeOf } from '../../services/printService';

const MM_TO_PX = 96 / 25.4;
const PAPERS = Object.keys(PAPER_MM) as PaperSize[];

/** Thiết lập trang bên trái, xem trước trang in bên phải, nút In. */
export const PrintPanel: React.FC<{ controller: CalcController; onMessage: (text: string) => void }> = ({ controller, onMessage }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.backstage.print;
  const layout = m.ribbon.pageLayout;
  const setup = controller.pageSetup;
  const version = controller.wb.version;
  const empty = !printRangeOf(controller.wb, controller.active);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => buildPrintHtml(controller.wb, controller.active), [controller, controller.active, version]);
  const paper = PAPER_MM[setup.paper];
  const landscape = setup.orientation === 'landscape';
  const width = (landscape ? paper.height : paper.width) * MM_TO_PX;
  const height = (landscape ? paper.width : paper.height) * MM_TO_PX;
  const marginKey = (Object.keys(MARGIN_PRESETS) as Array<keyof typeof MARGIN_PRESETS>).find((key) => JSON.stringify(MARGIN_PRESETS[key]) === JSON.stringify(setup.margins)) ?? 'custom';

  const print = async () => {
    try {
      await printHtml(html);
    } catch {
      onMessage(t.failed);
    }
  };

  return (
    <div className="calc-print">
      <div className="calc-print-settings">
        <button type="button" className="wr-text-btn is-primary calc-print-action" disabled={empty} onClick={() => void print()}>
          <Printer size={16} />
          {t.action}
        </button>
        <div className="calc-print-sheet">{`${t.sheet}: ${controller.wb.sheets[controller.active].name}`}</div>
        <label className="calc-dialog-field">
          <span>{layout.orientation}</span>
          <select value={setup.orientation} onChange={(event) => controller.setPageSetup({ orientation: event.target.value as 'portrait' | 'landscape' })}>
            <option value="portrait">{layout.portrait}</option>
            <option value="landscape">{layout.landscape}</option>
          </select>
        </label>
        <label className="calc-dialog-field">
          <span>{layout.size}</span>
          <select value={setup.paper} onChange={(event) => controller.setPageSetup({ paper: event.target.value as PaperSize })}>
            {PAPERS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>
        <label className="calc-dialog-field">
          <span>{layout.margins}</span>
          <select
            value={marginKey}
            onChange={(event) => {
              const key = event.target.value as keyof typeof MARGIN_PRESETS;
              if (MARGIN_PRESETS[key]) controller.setPageSetup({ margins: { ...MARGIN_PRESETS[key] } });
            }}
          >
            {marginKey === 'custom' && <option value="custom">…</option>}
            {(Object.keys(MARGIN_PRESETS) as Array<keyof typeof MARGIN_PRESETS>).map((key) => (
              <option key={key} value={key}>
                {layout.marginPresets[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="calc-dialog-field">
          <span>{`${layout.scale} (%)`}</span>
          <input type="number" min={10} max={400} value={setup.scale} onChange={(event) => controller.setPageSetup({ scale: Number(event.target.value) || 100 })} />
        </label>
      </div>
      <div className="calc-print-preview">
        {empty ? (
          <p className="calc-dialog-text">{t.empty}</p>
        ) : (
          <iframe title={t.sheet} sandbox="" srcDoc={html} style={{ width, height }} />
        )}
      </div>
    </div>
  );
};
