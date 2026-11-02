import React from 'react';
import { useOfficeI18n } from '../../../i18n';
import type { CalcController } from '../../controller';
import { LargeBtn, Popover } from '../../../shared/ribbon/controls';
import type { CfStyle } from '../../engine/conditional';
import {
  RibbonCfIcon,
  HighlightRulesIcon,
  TopBottomRulesIcon,
  DataBarsIcon,
  ColorScalesIcon,
  IconSetsIcon,
  NewRuleIcon,
  ClearRulesIcon,
  ManageRulesIcon,
  GreaterThanIcon,
  LessThanIcon,
  BetweenIcon,
  EqualToIcon,
  TextContainsIcon,
  DateOccurringIcon,
  DuplicateValuesIcon,
  Top10ItemsIcon,
  Top10PercentIcon,
  Bottom10ItemsIcon,
  Bottom10PercentIcon,
  AboveAverageIcon,
  BelowAverageIcon,
  IconSetPreview,
} from './CfIcons';

export interface ConditionalFormattingMenuProps {
  controller: CalcController;
  onApply?: () => void;
  onMessage?: (msg: string) => void;
}

const DEFAULT_STYLE: CfStyle = { fill: '#ffc7ce', color: '#9c0006' };

interface BarColorDef {
  id: string;
  color: string;
  name: string;
}

const DATA_BAR_COLORS: BarColorDef[] = [
  { id: 'blue', color: '#0078d4', name: 'Blue' },
  { id: 'green', color: '#107c41', name: 'Green' },
  { id: 'red', color: '#d83b01', name: 'Red' },
  { id: 'orange', color: '#ff8c00', name: 'Orange' },
  { id: 'lightBlue', color: '#00bcf2', name: 'Light Blue' },
  { id: 'purple', color: '#881798', name: 'Purple' },
];

interface ColorScaleDef {
  id: string;
  name: string;
  colors: [string, string, string, string];
  rule: { low: string; mid?: string; high: string };
}

const COLOR_SCALES: ColorScaleDef[] = [
  // Row 1
  {
    id: 'gyr',
    name: 'Green - Yellow - Red',
    colors: ['#63be7b', '#a9d18e', '#ffeb84', '#f8696b'],
    rule: { low: '#f8696b', mid: '#ffeb84', high: '#63be7b' },
  },
  {
    id: 'ryg',
    name: 'Red - Yellow - Green',
    colors: ['#f8696b', '#ffeb84', '#a9d18e', '#63be7b'],
    rule: { low: '#63be7b', mid: '#ffeb84', high: '#f8696b' },
  },
  {
    id: 'gwr',
    name: 'Green - White - Red',
    colors: ['#63be7b', '#a2d6b3', '#fdfdfd', '#f8696b'],
    rule: { low: '#f8696b', mid: '#ffffff', high: '#63be7b' },
  },
  {
    id: 'rwg',
    name: 'Red - White - Green',
    colors: ['#f8696b', '#fca3a5', '#fdfdfd', '#63be7b'],
    rule: { low: '#63be7b', mid: '#ffffff', high: '#f8696b' },
  },
  // Row 2
  {
    id: 'bwr',
    name: 'Blue - White - Red',
    colors: ['#5a8ac6', '#98b8de', '#fdfdfd', '#f8696b'],
    rule: { low: '#f8696b', mid: '#ffffff', high: '#5a8ac6' },
  },
  {
    id: 'rwb',
    name: 'Red - White - Blue',
    colors: ['#f8696b', '#fca3a5', '#fdfdfd', '#5a8ac6'],
    rule: { low: '#5a8ac6', mid: '#ffffff', high: '#f8696b' },
  },
  {
    id: 'wr',
    name: 'White - Red',
    colors: ['#ffffff', '#fca3a5', '#fa8386', '#f8696b'],
    rule: { low: '#ffffff', high: '#f8696b' },
  },
  {
    id: 'rw',
    name: 'Red - White',
    colors: ['#f8696b', '#fa8386', '#fca3a5', '#ffffff'],
    rule: { low: '#f8696b', high: '#ffffff' },
  },
  // Row 3
  {
    id: 'gw',
    name: 'Green - White',
    colors: ['#63be7b', '#89d09c', '#b5e3c2', '#ffffff'],
    rule: { low: '#ffffff', high: '#63be7b' },
  },
  {
    id: 'wg',
    name: 'White - Green',
    colors: ['#ffffff', '#b5e3c2', '#89d09c', '#63be7b'],
    rule: { low: '#63be7b', high: '#ffffff' },
  },
  {
    id: 'gy',
    name: 'Green - Yellow',
    colors: ['#63be7b', '#92cd80', '#cbe584', '#ffeb84'],
    rule: { low: '#ffeb84', high: '#63be7b' },
  },
  {
    id: 'yg',
    name: 'Yellow - Green',
    colors: ['#ffeb84', '#cbe584', '#92cd80', '#63be7b'],
    rule: { low: '#63be7b', high: '#ffeb84' },
  },
];

const SubmenuArrow: React.FC = () => (
  <svg width="6" height="9" viewBox="0 0 6 9" fill="none" className="calc-cf-arrow">
    <path d="M1 1.5L4.5 4.5L1 7.5" stroke="#444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ConditionalFormattingMenu: React.FC<ConditionalFormattingMenuProps> = ({ controller, onApply, onMessage }) => {
  const { m } = useOfficeI18n();
  const t = m.calc;

  const askNumber = (message: string, defaultVal = '10'): number | null => {
    const answer = window.prompt(message, defaultVal);
    if (answer === null) return null;
    const n = Number(answer.replace(',', '.'));
    return answer.trim() !== '' && Number.isFinite(n) ? n : null;
  };

  const applyRule = (rule: Parameters<CalcController['addConditionalRule']>[0], close: () => void) => {
    controller.addConditionalRule(rule);
    onApply?.();
    close();
  };

  const renderDataBarThumb = (color: string, gradient: boolean, onClick: () => void) => (
    <button
      key={`${color}-${gradient ? 'grad' : 'sol'}`}
      type="button"
      className="calc-cf-bar-thumb"
      onClick={onClick}
    >
      <div className="calc-cf-thumb-row">
        <span
          className="calc-cf-thumb-bar"
          style={{
            width: '85%',
            background: gradient ? `linear-gradient(90deg, ${color}, rgba(255,255,255,0.2))` : color,
          }}
        />
      </div>
      <div className="calc-cf-thumb-row">
        <span
          className="calc-cf-thumb-bar"
          style={{
            width: '60%',
            background: gradient ? `linear-gradient(90deg, ${color}, rgba(255,255,255,0.2))` : color,
          }}
        />
      </div>
      <div className="calc-cf-thumb-row">
        <span
          className="calc-cf-thumb-bar"
          style={{
            width: '40%',
            background: gradient ? `linear-gradient(90deg, ${color}, rgba(255,255,255,0.2))` : color,
          }}
        />
      </div>
      <div className="calc-cf-thumb-row">
        <span
          className="calc-cf-thumb-bar"
          style={{
            width: '20%',
            background: gradient ? `linear-gradient(90deg, ${color}, rgba(255,255,255,0.2))` : color,
          }}
        />
      </div>
    </button>
  );

  const renderColorScaleThumb = (scale: ColorScaleDef, onClick: () => void) => (
    <button
      key={scale.id}
      type="button"
      className="calc-cf-scale-thumb"
      title={scale.name}
      onClick={onClick}
    >
      {scale.colors.map((c, i) => (
        <div key={i} className="calc-cf-scale-row" style={{ background: c }} />
      ))}
    </button>
  );

  return (
    <Popover
      button={({ toggle }) => (
        <LargeBtn
          title={t.cf.title}
          onClick={toggle}
          label={t.cmd.conditionalFormatting ?? 'Conditional Formatting'}
          hasDropdown
        >
          <RibbonCfIcon />
        </LargeBtn>
      )}
    >
      {(close) => (
        <div className="calc-cf-dropdown-menu">
          {/* 1. Highlight Cells Rules */}
          <div className="calc-menu-item-with-submenu">
            <button type="button" className="calc-cf-menu-btn">
              <span className="calc-cf-menu-icon"><HighlightRulesIcon /></span>
              <span className="calc-cf-menu-label"><u>H</u>ighlight Cells Rules</span>
              <SubmenuArrow />
            </button>
            <div className="calc-submenu calc-cf-submenu">
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const val = askNumber(t.cf.prompt.value);
                  if (val !== null) applyRule({ kind: 'cell', op: 'gt', a: val, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><GreaterThanIcon /></span>
                <span className="calc-cf-menu-label"><u>G</u>reater Than…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const val = askNumber(t.cf.prompt.value);
                  if (val !== null) applyRule({ kind: 'cell', op: 'lt', a: val, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><LessThanIcon /></span>
                <span className="calc-cf-menu-label"><u>L</u>ess Than…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const a = askNumber(t.cf.prompt.value);
                  const b = a === null ? null : askNumber(t.cf.prompt.value2);
                  if (a !== null && b !== null) applyRule({ kind: 'cell', op: 'between', a, b, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><BetweenIcon /></span>
                <span className="calc-cf-menu-label"><u>B</u>etween…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const val = askNumber(t.cf.prompt.value);
                  if (val !== null) applyRule({ kind: 'cell', op: 'eq', a: val, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><EqualToIcon /></span>
                <span className="calc-cf-menu-label"><u>E</u>qual To…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const text = window.prompt(t.cf.prompt.text);
                  if (text) applyRule({ kind: 'text', op: 'contains', text, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><TextContainsIcon /></span>
                <span className="calc-cf-menu-label"><u>T</u>ext that Contains…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const text = window.prompt(t.cf.prompt.text ?? 'Format cells containing date:', new Date().toLocaleDateString());
                  if (text) applyRule({ kind: 'text', op: 'contains', text, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><DateOccurringIcon /></span>
                <span className="calc-cf-menu-label"><u>A</u> Date Occurring…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => applyRule({ kind: 'duplicate', style: DEFAULT_STYLE }, close)}
              >
                <span className="calc-cf-menu-icon"><DuplicateValuesIcon /></span>
                <span className="calc-cf-menu-label"><u>D</u>uplicate Values…</span>
              </button>
              <div className="calc-menu-sep" />
              <button
                type="button"
                className="calc-cf-menu-btn is-more"
                onClick={() => applyRule({ kind: 'cell', op: 'gt', a: 0, style: DEFAULT_STYLE }, close)}
              >
                <span className="calc-cf-menu-label"><u>M</u>ore Rules…</span>
              </button>
            </div>
          </div>

          {/* 2. Top/Bottom Rules */}
          <div className="calc-menu-item-with-submenu">
            <button type="button" className="calc-cf-menu-btn">
              <span className="calc-cf-menu-icon"><TopBottomRulesIcon /></span>
              <span className="calc-cf-menu-label"><u>T</u>op/Bottom Rules</span>
              <SubmenuArrow />
            </button>
            <div className="calc-submenu calc-cf-submenu">
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const n = askNumber(t.cf.prompt.count, '10');
                  if (n !== null && n >= 1) applyRule({ kind: 'top', n: Math.round(n), bottom: false, percent: false, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><Top10ItemsIcon /></span>
                <span className="calc-cf-menu-label"><u>T</u>op 10 Items…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const n = askNumber(t.cf.prompt.percent ?? 'Percent (1–100):', '10');
                  if (n !== null && n >= 1) applyRule({ kind: 'top', n: Math.round(n), bottom: false, percent: true, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><Top10PercentIcon /></span>
                <span className="calc-cf-menu-label">T<u>o</u>p 10 %…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const n = askNumber(t.cf.prompt.count, '10');
                  if (n !== null && n >= 1) applyRule({ kind: 'top', n: Math.round(n), bottom: true, percent: false, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><Bottom10ItemsIcon /></span>
                <span className="calc-cf-menu-label"><u>B</u>ottom 10 Items…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  const n = askNumber(t.cf.prompt.percent ?? 'Percent (1–100):', '10');
                  if (n !== null && n >= 1) applyRule({ kind: 'top', n: Math.round(n), bottom: true, percent: true, style: DEFAULT_STYLE }, close);
                }}
              >
                <span className="calc-cf-menu-icon"><Bottom10PercentIcon /></span>
                <span className="calc-cf-menu-label">B<u>o</u>ttom 10 %…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => applyRule({ kind: 'aboveAverage', below: false, style: DEFAULT_STYLE }, close)}
              >
                <span className="calc-cf-menu-icon"><AboveAverageIcon /></span>
                <span className="calc-cf-menu-label"><u>A</u>bove Average…</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => applyRule({ kind: 'aboveAverage', below: true, style: DEFAULT_STYLE }, close)}
              >
                <span className="calc-cf-menu-icon"><BelowAverageIcon /></span>
                <span className="calc-cf-menu-label"><u>B</u>elow Average…</span>
              </button>
              <div className="calc-menu-sep" />
              <button
                type="button"
                className="calc-cf-menu-btn is-more"
                onClick={() => applyRule({ kind: 'aboveAverage', below: false, style: DEFAULT_STYLE }, close)}
              >
                <span className="calc-cf-menu-label"><u>M</u>ore Rules…</span>
              </button>
            </div>
          </div>

          {/* 3. Data Bars */}
          <div className="calc-menu-item-with-submenu">
            <button type="button" className="calc-cf-menu-btn">
              <span className="calc-cf-menu-icon"><DataBarsIcon /></span>
              <span className="calc-cf-menu-label"><u>D</u>ata Bars</span>
              <SubmenuArrow />
            </button>
            <div className="calc-submenu calc-cf-gallery-submenu">
              <div className="calc-cf-gallery-title">{t.cf.gradientFill ?? 'Gradient Fill'}</div>
              <div className="calc-cf-grid-bars">
                {DATA_BAR_COLORS.map((b) =>
                  renderDataBarThumb(b.color, true, () =>
                    applyRule({ kind: 'bar', color: b.color, gradient: true }, close),
                  ),
                )}
              </div>
              <div className="calc-cf-gallery-title">{t.cf.solidFill ?? 'Solid Fill'}</div>
              <div className="calc-cf-grid-bars">
                {DATA_BAR_COLORS.map((b) =>
                  renderDataBarThumb(b.color, false, () =>
                    applyRule({ kind: 'bar', color: b.color, gradient: false }, close),
                  ),
                )}
              </div>
              <div className="calc-menu-sep" />
              <button
                type="button"
                className="calc-cf-menu-btn is-more"
                onClick={() => applyRule({ kind: 'bar', color: '#0078d4', gradient: true }, close)}
              >
                <span className="calc-cf-menu-label"><u>M</u>ore Rules…</span>
              </button>
            </div>
          </div>

          {/* 4. Color Scales */}
          <div className="calc-menu-item-with-submenu">
            <button type="button" className="calc-cf-menu-btn">
              <span className="calc-cf-menu-icon"><ColorScalesIcon /></span>
              <span className="calc-cf-menu-label">Color <u>S</u>cales</span>
              <SubmenuArrow />
            </button>
            <div className="calc-submenu calc-cf-gallery-submenu">
              <div className="calc-cf-grid-scales">
                {COLOR_SCALES.map((scale) =>
                  renderColorScaleThumb(scale, () =>
                    applyRule({ kind: 'scale', ...scale.rule }, close),
                  ),
                )}
              </div>
              <div className="calc-menu-sep" />
              <button
                type="button"
                className="calc-cf-menu-btn is-more"
                onClick={() => applyRule({ kind: 'scale', ...COLOR_SCALES[0].rule }, close)}
              >
                <span className="calc-cf-menu-label"><u>M</u>ore Rules…</span>
              </button>
            </div>
          </div>

          {/* 5. Icon Sets */}
          <div className="calc-menu-item-with-submenu">
            <button type="button" className="calc-cf-menu-btn">
              <span className="calc-cf-menu-icon"><IconSetsIcon /></span>
              <span className="calc-cf-menu-label"><u>I</u>con Sets</span>
              <SubmenuArrow />
            </button>
            <div className="calc-submenu calc-cf-iconsets-submenu">
              {/* Directional */}
              <div className="calc-cf-gallery-title">Directional</div>
              <div className="calc-cf-iconsets-grid">
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Arrows (Colored)"
                  onClick={() => applyRule({ kind: 'icons', set: 'arrows' }, close)}
                >
                  <IconSetPreview set="arrows" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Arrows (Gray)"
                  onClick={() => applyRule({ kind: 'icons', set: 'arrowsGray' }, close)}
                >
                  <IconSetPreview set="arrowsGray" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Triangles"
                  onClick={() => applyRule({ kind: 'icons', set: 'triangles' }, close)}
                >
                  <IconSetPreview set="triangles" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="4 Arrows (Gray)"
                  onClick={() => applyRule({ kind: 'icons', set: 'arrows4Gray' }, close)}
                >
                  <IconSetPreview set="arrows4Gray" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="4 Arrows (Colored)"
                  onClick={() => applyRule({ kind: 'icons', set: 'arrows4' }, close)}
                >
                  <IconSetPreview set="arrows4" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="5 Arrows (Gray)"
                  onClick={() => applyRule({ kind: 'icons', set: 'arrows5Gray' }, close)}
                >
                  <IconSetPreview set="arrows5Gray" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="5 Arrows (Colored)"
                  onClick={() => applyRule({ kind: 'icons', set: 'arrows5' }, close)}
                >
                  <IconSetPreview set="arrows5" />
                </button>
              </div>

              {/* Shapes */}
              <div className="calc-cf-gallery-title">Shapes</div>
              <div className="calc-cf-iconsets-grid">
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Traffic Lights (Unrimmed)"
                  onClick={() => applyRule({ kind: 'icons', set: 'lights' }, close)}
                >
                  <IconSetPreview set="lights" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Traffic Lights (Rimmed)"
                  onClick={() => applyRule({ kind: 'icons', set: 'lightsRim' }, close)}
                >
                  <IconSetPreview set="lightsRim" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Signs"
                  onClick={() => applyRule({ kind: 'icons', set: 'signs' }, close)}
                >
                  <IconSetPreview set="signs" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="4 Traffic Lights"
                  onClick={() => applyRule({ kind: 'icons', set: 'lights4' }, close)}
                >
                  <IconSetPreview set="lights4" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="4 Colored Dots"
                  onClick={() => applyRule({ kind: 'icons', set: 'dots4' }, close)}
                >
                  <IconSetPreview set="dots4" />
                </button>
              </div>

              {/* Indicators */}
              <div className="calc-cf-gallery-title">Indicators</div>
              <div className="calc-cf-iconsets-grid">
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Symbols (Circled)"
                  onClick={() => applyRule({ kind: 'icons', set: 'symbolsCircled' }, close)}
                >
                  <IconSetPreview set="symbolsCircled" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Symbols (Uncircled)"
                  onClick={() => applyRule({ kind: 'icons', set: 'symbols' }, close)}
                >
                  <IconSetPreview set="symbols" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Flags"
                  onClick={() => applyRule({ kind: 'icons', set: 'flags' }, close)}
                >
                  <IconSetPreview set="flags" />
                </button>
              </div>

              {/* Ratings */}
              <div className="calc-cf-gallery-title">Ratings</div>
              <div className="calc-cf-iconsets-grid">
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="3 Stars"
                  onClick={() => applyRule({ kind: 'icons', set: 'stars' }, close)}
                >
                  <IconSetPreview set="stars" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="4 Ratings"
                  onClick={() => applyRule({ kind: 'icons', set: 'bars4' }, close)}
                >
                  <IconSetPreview set="bars4" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="5 Quarters"
                  onClick={() => applyRule({ kind: 'icons', set: 'pies' }, close)}
                >
                  <IconSetPreview set="pies" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="5 Ratings"
                  onClick={() => applyRule({ kind: 'icons', set: 'bars5' }, close)}
                >
                  <IconSetPreview set="bars5" />
                </button>
                <button
                  type="button"
                  className="calc-cf-icon-set-btn"
                  title="5 Boxes"
                  onClick={() => applyRule({ kind: 'icons', set: 'boxes' }, close)}
                >
                  <IconSetPreview set="boxes" />
                </button>
              </div>

              <div className="calc-menu-sep" />
              <button
                type="button"
                className="calc-cf-menu-btn is-more"
                onClick={() => applyRule({ kind: 'icons', set: 'arrows' }, close)}
              >
                <span className="calc-cf-menu-label"><u>M</u>ore Rules…</span>
              </button>
            </div>
          </div>

          <div className="calc-menu-sep" />

          {/* 6. New Rule... */}
          <button
            type="button"
            className="calc-cf-menu-btn"
            onClick={() => {
              const val = askNumber(t.cf.prompt.value);
              if (val !== null) applyRule({ kind: 'cell', op: 'gt', a: val, style: DEFAULT_STYLE }, close);
            }}
          >
            <span className="calc-cf-menu-icon"><NewRuleIcon /></span>
            <span className="calc-cf-menu-label"><u>N</u>ew Rule…</span>
          </button>

          {/* 7. Clear Rules */}
          <div className="calc-menu-item-with-submenu">
            <button type="button" className="calc-cf-menu-btn">
              <span className="calc-cf-menu-icon"><ClearRulesIcon /></span>
              <span className="calc-cf-menu-label"><u>C</u>lear Rules</span>
              <SubmenuArrow />
            </button>
            <div className="calc-submenu calc-cf-submenu">
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  controller.clearConditional('selection');
                  onApply?.();
                  close();
                }}
              >
                <span className="calc-cf-menu-label">Clear Rules from <u>S</u>elected Cells</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn"
                onClick={() => {
                  controller.clearConditional('sheet');
                  onApply?.();
                  close();
                }}
              >
                <span className="calc-cf-menu-label">Clear Rules from <u>E</u>ntire Sheet</span>
              </button>
              <button
                type="button"
                className={`calc-cf-menu-btn${controller.isTableActive() ? '' : ' is-disabled'}`}
                disabled={!controller.isTableActive()}
                onClick={() => {
                  if (controller.isTableActive()) {
                    controller.clearConditional('table');
                    onApply?.();
                    close();
                  }
                }}
              >
                <span className="calc-cf-menu-label">Clear Rules from <u>T</u>his Table</span>
              </button>
              <button
                type="button"
                className="calc-cf-menu-btn is-disabled"
                disabled
              >
                <span className="calc-cf-menu-label">Clear Rules from This <u>P</u>ivotTable</span>
              </button>
            </div>
          </div>

          {/* 8. Manage Rules... */}
          <button
            type="button"
            className="calc-cf-menu-btn"
            onClick={() => {
              close();
              onMessage?.('Conditional Formatting Rules Manager');
            }}
          >
            <span className="calc-cf-menu-icon"><ManageRulesIcon /></span>
            <span className="calc-cf-menu-label">Manage <u>R</u>ules…</span>
          </button>
        </div>
      )}
    </Popover>
  );
};
