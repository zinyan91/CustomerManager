import React from 'react';
import { BringToFront, FileX2, Frame, MoveDown, MoveUp, RectangleHorizontal, RectangleVertical, ScanLine, Scaling, StretchHorizontal } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import type { CalcController } from '../../controller';
import { MARGIN_PRESETS, type PaperSize } from '../../model/workbook';
import { Group } from '../../../shared/ribbon/controls';
import type { ViewOptions } from '../viewOptions';
import { act } from './actions';
import { CheckOption, MenuButton, TextBtn } from './helpers';

const PAPERS: PaperSize[] = ['A3', 'A4', 'A5', 'Letter', 'Legal'];
const SCALES = [50, 75, 100, 125, 150];

export interface PageLayoutTabProps {
  controller: CalcController;
  view: ViewOptions;
  onView: (view: ViewOptions) => void;
}

export const PageLayoutTab: React.FC<PageLayoutTabProps> = ({ controller, view, onView }) => {
  const { m } = useOfficeI18n();
  const t = m.ribbon.pageLayout;
  const setup = controller.pageSetup;
  const marginKey = (Object.keys(MARGIN_PRESETS) as Array<keyof typeof MARGIN_PRESETS>).find((key) => JSON.stringify(MARGIN_PRESETS[key]) === JSON.stringify(setup.margins));
  const object = controller.selectedChart;
  const sheet = controller.wb.sheets[controller.active];
  const hasObject = !!object && (sheet.charts.some((c) => c.id === object) || !!sheet.images?.some((i) => i.id === object));

  const askScale = () => {
    const answer = window.prompt(t.scalePrompt, String(setup.scale));
    const value = Number(answer?.replace(',', '.'));
    if (answer !== null && Number.isFinite(value) && value > 0) controller.setPageSetup({ scale: value });
  };

  return (
    <div className="wr-tab-body">
      <Group label={t.pageSetup}>
        <MenuButton
          label={t.margins}
          icon={<Frame size={18} />}
          items={(Object.keys(MARGIN_PRESETS) as Array<keyof typeof MARGIN_PRESETS>).map((key) => ({
            label: t.marginPresets[key],
            checked: marginKey === key,
            run: () => controller.setPageSetup({ margins: { ...MARGIN_PRESETS[key] } }),
          }))}
        />
        <MenuButton
          label={t.orientation}
          icon={setup.orientation === 'portrait' ? <RectangleVertical size={18} /> : <RectangleHorizontal size={18} />}
          items={[
            { label: t.portrait, checked: setup.orientation === 'portrait', run: () => controller.setPageSetup({ orientation: 'portrait' }) },
            { label: t.landscape, checked: setup.orientation === 'landscape', run: () => controller.setPageSetup({ orientation: 'landscape' }) },
          ]}
        />
        <MenuButton label={t.size} icon={<FileX2 size={18} />} items={PAPERS.map((paper) => ({ label: paper, checked: setup.paper === paper, run: () => controller.setPageSetup({ paper }) }))} />
        <MenuButton
          label={t.printArea}
          icon={<ScanLine size={18} />}
          items={[
            { label: t.setPrintArea, run: () => controller.setPrintArea({ ...controller.selection }) },
            { label: t.clearPrintArea, disabled: !setup.printArea, run: () => controller.setPrintArea(null) },
          ]}
        />
      </Group>
      <Group label={t.scaleToFit}>
        <MenuButton
          label={`${t.scale}: ${setup.scale}%`}
          icon={<Scaling size={18} />}
          items={[
            ...SCALES.map((value) => ({ label: `${value}%`, checked: setup.scale === value, run: () => controller.setPageSetup({ scale: value }) })),
            { label: '…', run: askScale },
          ]}
        />
      </Group>
      <Group label={t.sheetOptions}>
        <div className="wr-option-grid">
          <span className="wr-option-head" />
          <span className="wr-option-head">{t.viewOption}</span>
          <span className="wr-option-head">{t.printOption}</span>
          <span className="wr-option-name">{t.gridlines}</span>
          <CheckOption hideLabel label={`${t.gridlines} · ${t.viewOption}`} checked={view.gridlines} onChange={(gridlines) => onView({ ...view, gridlines })} />
          <CheckOption hideLabel label={`${t.gridlines} · ${t.printOption}`} checked={setup.gridlines} onChange={(gridlines) => controller.setPageSetup({ gridlines })} />
          <span className="wr-option-name">{t.headings}</span>
          <CheckOption hideLabel label={`${t.headings} · ${t.viewOption}`} checked={view.headings} onChange={(headings) => onView({ ...view, headings })} />
          <CheckOption hideLabel label={`${t.headings} · ${t.printOption}`} checked={setup.headings} onChange={(headings) => controller.setPageSetup({ headings })} />
        </div>
      </Group>
      <Group label={t.arrange}>
        <TextBtn label={t.bringToFront} icon={<BringToFront size={18} />} disabled={!hasObject} onClick={act(() => object && controller.arrangeObject(object, 'front'))} />
        <TextBtn label={t.sendToBack} icon={<StretchHorizontal size={18} />} disabled={!hasObject} onClick={act(() => object && controller.arrangeObject(object, 'back'))} />
        <TextBtn label={t.bringForward} icon={<MoveUp size={18} />} disabled={!hasObject} onClick={act(() => object && controller.arrangeObject(object, 'forward'))} />
        <TextBtn label={t.sendBackward} icon={<MoveDown size={18} />} disabled={!hasObject} onClick={act(() => object && controller.arrangeObject(object, 'backward'))} />
      </Group>
    </div>
  );
};
