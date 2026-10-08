import React from 'react';
import { AppWindow, Minus, PanelTop, Plus, ScanSearch, Search } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { CalcController } from '../../controller';
import { Btn, Group } from '../../../shared/ribbon/controls';
import { clampZoom, MAX_ZOOM, MIN_ZOOM, type ViewOptions } from '../viewOptions';
import { CheckOption, MenuButton, TextBtn } from './helpers';

export interface ViewTabProps {
  controller: CalcController;
  view: ViewOptions;
  onView: (view: ViewOptions) => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  /** Chiều rộng của vùng lưới theo pixel, để phóng vừa vùng chọn. */
  gridSize: () => { width: number; height: number } | null;
  onNewWindow: () => void;
}

export const ViewTab: React.FC<ViewTabProps> = ({ controller, view, onView, zoom, onZoom, gridSize, onNewWindow }) => {
  const { m } = useOfficeI18n();
  const t = m.calc;
  const v = m.ribbon.view;

  const askZoom = () => {
    const answer = window.prompt(v.zoomPrompt, String(zoom));
    const value = Number(answer?.replace(',', '.'));
    if (answer !== null && Number.isFinite(value) && value > 0) onZoom(clampZoom(value));
  };

  const zoomToSelection = () => {
    const box = gridSize();
    if (!box) return;
    const { r1, c1, r2, c2 } = controller.selection;
    const sheet = controller.wb.sheets[controller.active];
    let width = 0;
    for (let c = c1; c <= c2; c += 1) width += sheet.colWidths.get(c) ?? 100;
    let height = 0;
    for (let r = r1; r <= r2; r += 1) height += sheet.rowHeights.get(r) ?? 24;
    if (width <= 0 || height <= 0) return;
    onZoom(clampZoom(Math.min(box.width / width, box.height / height) * 100));
  };

  return (
    <div className="wr-tab-body">
      <Group label={v.show}>
        <div className="wr-option-stack">
          <CheckOption label={t.cmd.gridlines} checked={view.gridlines} onChange={(gridlines) => onView({ ...view, gridlines })} />
          <CheckOption label={v.headings} checked={view.headings} onChange={(headings) => onView({ ...view, headings })} />
          <CheckOption label={v.formulaBar} checked={view.formulaBar} onChange={(formulaBar) => onView({ ...view, formulaBar })} />
        </div>
      </Group>
      <Group label={t.groups.zoom}>
        <Btn title={t.cmd.zoomOut} disabled={zoom <= MIN_ZOOM} onClick={() => onZoom(clampZoom(zoom - 10))}>
          <Minus size={16} />
        </Btn>
        <button type="button" className="wr-zoom-value" title={v.zoomDialog} onClick={askZoom}>
          {zoom}%
        </button>
        <Btn title={t.cmd.zoomIn} disabled={zoom >= MAX_ZOOM} onClick={() => onZoom(clampZoom(zoom + 10))}>
          <Plus size={16} />
        </Btn>
        <TextBtn label={v.zoom100} icon={<Search size={18} />} onClick={() => onZoom(100)} />
        <TextBtn label={v.zoomSelection} icon={<ScanSearch size={18} />} onClick={zoomToSelection} />
      </Group>
      <Group label={t.groups.window}>
        <MenuButton
          label={t.cmd.freeze}
          icon={<PanelTop size={18} />}
          items={[
            { label: t.cmd.freezeCursor, run: () => controller.freezeAtCursor() },
            { label: t.cmd.freezeRow, run: () => controller.setFreeze(1, 0) },
            { label: t.cmd.freezeColumn, run: () => controller.setFreeze(0, 1) },
            { label: t.cmd.unfreeze, run: () => controller.setFreeze(0, 0), disabled: controller.frozen.rows === 0 && controller.frozen.cols === 0 },
          ]}
        />
        <TextBtn label={v.newWindow} icon={<AppWindow size={18} />} onClick={onNewWindow} />
      </Group>
    </div>
  );
};
