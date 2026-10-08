import React from 'react';
import { Minus, Plus, Search, Sigma } from 'lucide-react';
import { useOfficeI18n } from '../../../i18n';
import {
  MARGIN_PRESETS,
  PAPER_LABELS,
  clampMargins,
  marginPresetOf,
  type Margins,
  type MarginPreset,
  type Orientation,
  type PageSetup,
  type PaperSize,
} from '../../utils/pageSetup';
import { FONT_CHOICES, FONT_SIZES_PT } from '../../../shared/formatOptions';
import { Btn, Group, SelectBox } from '../../../shared/ribbon/controls';

export const LayoutTab: React.FC<{ pageSetup: PageSetup; onChange: (next: PageSetup) => void }> = ({ pageSetup, onChange }) => {
  const { m } = useOfficeI18n();
  const t = m.writer.layout;
  const preset = marginPresetOf(pageSetup.margins);

  const setMargin = (side: keyof Margins, raw: string) => {
    const value = raw.trim() === '' ? 0 : Number(raw.replace(',', '.'));
    if (!Number.isFinite(value)) return;
    onChange({ ...pageSetup, margins: clampMargins({ ...pageSetup.margins, [side]: value }, pageSetup) });
  };

  return (
    <div className="wr-tab-body">
      <Group label={m.writer.groups.paper}>
        <SelectBox
          title={t.paper}
          width={170}
          value={pageSetup.paper}
          onChange={(value) => {
            const next = { ...pageSetup, paper: value as PaperSize };
            onChange({ ...next, margins: clampMargins(next.margins, next) });
          }}
          options={(Object.keys(PAPER_LABELS) as PaperSize[]).map((key) => ({ value: key, label: PAPER_LABELS[key] }))}
        />
        <SelectBox
          title={t.orientation}
          width={90}
          value={pageSetup.orientation}
          onChange={(value) => {
            const next = { ...pageSetup, orientation: value as Orientation };
            onChange({ ...next, margins: clampMargins(next.margins, next) });
          }}
          options={[
            { value: 'portrait', label: t.portrait },
            { value: 'landscape', label: t.landscape },
          ]}
        />
      </Group>

      <Group label={m.writer.groups.margins}>
        <SelectBox
          title={t.margins}
          width={170}
          value={preset}
          onChange={(value) => {
            if (value !== 'custom') onChange({ ...pageSetup, margins: { ...MARGIN_PRESETS[value as Exclude<MarginPreset, 'custom'>] } });
          }}
          options={[
            { value: 'normal', label: t.marginPresets.normal },
            { value: 'narrow', label: t.marginPresets.narrow },
            { value: 'wide', label: t.marginPresets.wide },
            { value: 'custom', label: t.marginPresets.custom },
          ]}
        />
        {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
          <label key={side} className="wr-field">
            <span>{t[side]}</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={Math.round(pageSetup.margins[side] * 10) / 10}
              onChange={(event) => setMargin(side, event.target.value)}
            />
          </label>
        ))}
      </Group>

      <Group label={m.writer.groups.defaultText}>
        <SelectBox
          title={t.baseFont}
          width={150}
          value={pageSetup.baseFont || FONT_CHOICES[0].label}
          onChange={(label) => onChange({ ...pageSetup, baseFont: label === FONT_CHOICES[0].label ? '' : label })}
          options={
            FONT_CHOICES.some((c) => c.label === pageSetup.baseFont) || !pageSetup.baseFont
              ? FONT_CHOICES.map((c) => ({ value: c.label, label: c.label }))
              : [{ value: pageSetup.baseFont, label: pageSetup.baseFont }, ...FONT_CHOICES.map((c) => ({ value: c.label, label: c.label }))]
          }
        />
        <SelectBox
          title={t.baseSize}
          width={64}
          value={String(pageSetup.baseSize)}
          onChange={(value) => onChange({ ...pageSetup, baseSize: Number(value) })}
          options={([...FONT_SIZES_PT] as number[])
            .concat(FONT_SIZES_PT.includes(pageSetup.baseSize as never) ? [] : [pageSetup.baseSize])
            .sort((a, b) => a - b)
            .map((pt) => ({ value: String(pt), label: String(pt) }))}
        />
      </Group>

      <Group label={m.writer.groups.headerFooter}>
        <label className="wr-field wr-field-wide">
          <span>{t.header}</span>
          <input
            type="text"
            value={pageSetup.headerText}
            placeholder={t.headerPlaceholder}
            onChange={(event) => onChange({ ...pageSetup, headerText: event.target.value })}
          />
        </label>
        <label className="wr-field wr-field-wide">
          <span>{t.footer}</span>
          <input
            type="text"
            value={pageSetup.footerText}
            placeholder={t.footerPlaceholder}
            onChange={(event) => onChange({ ...pageSetup, footerText: event.target.value })}
          />
        </label>
        <label className="wr-check">
          <input
            type="checkbox"
            checked={pageSetup.pageNumbers}
            onChange={(event) => onChange({ ...pageSetup, pageNumbers: event.target.checked })}
          />
          <span>{t.pageNumbers}</span>
        </label>
      </Group>
    </div>
  );
};

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 200;

export const ViewTab: React.FC<{
  zoom: number;
  onZoom: (zoom: number) => void;
  onFind: () => void;
  onStats: () => void;
}> = ({ zoom, onZoom, onFind, onStats }) => {
  const { m } = useOfficeI18n();
  const t = m.writer;
  return (
    <div className="wr-tab-body">
      <Group label={t.groups.zoom}>
        <Btn title={t.cmd.zoomOut} disabled={zoom <= ZOOM_MIN} onClick={() => onZoom(Math.max(ZOOM_MIN, zoom - 10))}>
          <Minus size={16} />
        </Btn>
        <button type="button" className="wr-zoom-value" title={t.cmd.zoomReset} onClick={() => onZoom(100)}>
          {zoom}%
        </button>
        <Btn title={t.cmd.zoomIn} disabled={zoom >= ZOOM_MAX} onClick={() => onZoom(Math.min(ZOOM_MAX, zoom + 10))}>
          <Plus size={16} />
        </Btn>
      </Group>
      <Group label={t.groups.tools}>
        <Btn title={t.cmd.findReplace} onClick={onFind}>
          <Search size={16} />
        </Btn>
        <Btn title={t.cmd.wordCount} onClick={onStats}>
          <Sigma size={16} />
        </Btn>
      </Group>
    </div>
  );
};
