import React from 'react';
import { formatTick, niceScale, type ChartData, type ChartType } from '../engine/chartData';
import { chartColor } from '../utils/chartColors';

export interface ChartViewProps {
  type: ChartType;
  title: string;
  data: ChartData;
  /** Size the drawing is laid out at; the SVG scales to its box. */
  width: number;
  height: number;
}

const INK = 'var(--text-primary)';
const MUTED = 'var(--text-secondary)';
const GRID = 'var(--border-subtle)';

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const point = (angle: number) => [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
  const [x1, y1] = point(from);
  const [x2, y2] = point(to);
  const large = to - from > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
}

/** A chart as SVG: column, bar, line or pie over the data a range holds. */
export const ChartView: React.FC<ChartViewProps> = ({ type, title, data, width, height }) => {
  const { categories, series } = data;
  const empty = series.length === 0 || categories.length === 0;
  const titleH = title ? 30 : 8;
  const showLegend = type === 'pie' ? false : series.length > 1;
  const legendH = showLegend ? 24 : 0;

  const frame = (children: React.ReactNode) => (
    <svg className="calc-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title || type} preserveAspectRatio="none">
      <rect x="0" y="0" width={width} height={height} fill="var(--bg-surface)" />
      {title && (
        <text x={width / 2} y={20} textAnchor="middle" fontSize="14" fontWeight="700" fill={INK}>
          {clip(title, Math.floor(width / 8))}
        </text>
      )}
      {children}
    </svg>
  );

  if (empty) return frame(null);

  const legend = showLegend && (
    <g>
      {(() => {
        let x = 12;
        return series.map((s, i) => {
          const label = clip(s.name, 16);
          const node = (
            <g key={i} transform={`translate(${x},${height - 16})`}>
              <rect width="10" height="10" y="-9" rx="2" fill={chartColor(i)} />
              <text x="14" fontSize="11" fill={MUTED}>
                {label}
              </text>
            </g>
          );
          x += 24 + label.length * 6;
          return node;
        });
      })()}
    </g>
  );

  if (type === 'pie') {
    const values = series[0].values.map((v) => Math.max(0, v ?? 0));
    const total = values.reduce((a, b) => a + b, 0);
    if (total <= 0) return frame(null);
    const legendW = Math.min(160, width * 0.35);
    const cx = (width - legendW) / 2;
    const cy = titleH + (height - titleH) / 2;
    const r = Math.max(10, Math.min((width - legendW) / 2, (height - titleH) / 2) - 12);
    // Where each slice starts: the running total of the ones before it.
    const starts = values.map((_, i) => (values.slice(0, i).reduce((a, b) => a + b, 0) / total) * Math.PI * 2);
    const slices = values.map((v, i) => {
      if (v <= 0) return null;
      const sweep = (v / total) * Math.PI * 2;
      const start = starts[i];
      const mid = start + sweep / 2;
      const path = values.filter((x) => x > 0).length === 1 ? null : arcPath(cx, cy, r, start, start + sweep);
      return (
        <g key={i}>
          {path ? <path d={path} fill={chartColor(i)} stroke="var(--bg-surface)" strokeWidth="1.5" /> : <circle cx={cx} cy={cy} r={r} fill={chartColor(i)} />}
          {v / total > 0.05 && (
            <text x={cx + r * 0.62 * Math.sin(mid)} y={cy - r * 0.62 * Math.cos(mid)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fontWeight="700" fill="#ffffff">
              {Math.round((v / total) * 100)}%
            </text>
          )}
        </g>
      );
    });
    return frame(
      <>
        {slices}
        <g transform={`translate(${width - legendW + 4},${titleH + 8})`}>
          {categories.slice(0, Math.floor((height - titleH - 16) / 18)).map((c, i) => (
            <g key={i} transform={`translate(0,${i * 18})`}>
              <rect width="10" height="10" y="-9" rx="2" fill={chartColor(i)} />
              <text x="14" fontSize="11" fill={MUTED}>
                {clip(c, 18)}
              </text>
            </g>
          ))}
        </g>
      </>,
    );
  }

  const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
  const scale = niceScale(Math.min(...all), Math.max(...all), 5, type !== 'line');
  const horizontal = type === 'bar';
  const left = horizontal ? 74 : 50;
  const right = 14;
  const top = titleH + 4;
  const bottom = (horizontal ? 24 : 34) + legendH;
  const plotW = Math.max(10, width - left - right);
  const plotH = Math.max(10, height - top - bottom);
  const n = categories.length;
  const valuePos = (v: number) => (horizontal ? left + ((v - scale.min) / (scale.max - scale.min)) * plotW : top + plotH - ((v - scale.min) / (scale.max - scale.min)) * plotH);
  const bandSize = (horizontal ? plotH : plotW) / n;
  const labelEvery = Math.max(1, Math.ceil((n * (horizontal ? 16 : 52)) / (horizontal ? plotH : plotW)));

  const grid = scale.ticks.map((tick) => {
    const p = valuePos(tick);
    return horizontal ? (
      <g key={tick}>
        <line x1={p} x2={p} y1={top} y2={top + plotH} stroke={GRID} />
        <text x={p} y={top + plotH + 14} textAnchor="middle" fontSize="10" fill={MUTED}>
          {formatTick(tick)}
        </text>
      </g>
    ) : (
      <g key={tick}>
        <line x1={left} x2={left + plotW} y1={p} y2={p} stroke={GRID} />
        <text x={left - 6} y={p + 3} textAnchor="end" fontSize="10" fill={MUTED}>
          {formatTick(tick)}
        </text>
      </g>
    );
  });

  const categoryLabels = categories.map((c, i) =>
    i % labelEvery !== 0 ? null : horizontal ? (
      <text key={i} x={left - 6} y={top + (i + 0.5) * bandSize + 3} textAnchor="end" fontSize="10" fill={MUTED}>
        {clip(c, 11)}
      </text>
    ) : (
      <text key={i} x={left + (i + 0.5) * bandSize} y={top + plotH + 14} textAnchor="middle" fontSize="10" fill={MUTED}>
        {clip(c, Math.max(4, Math.floor(bandSize / 6)))}
      </text>
    ),
  );

  let marks: React.ReactNode;
  if (type === 'line') {
    marks = series.map((s, si) => {
      const points = s.values.map((v, i) => (v === null ? null : [left + (i + 0.5) * bandSize, valuePos(v)] as const));
      // A missing value lifts the pen: the line breaks there.
      let path = '';
      let pen = false;
      for (const p of points) {
        if (!p) {
          pen = false;
          continue;
        }
        path += `${pen ? 'L' : 'M'}${p[0]},${p[1]}`;
        pen = true;
      }
      return (
        <g key={si}>
          <path d={path} fill="none" stroke={chartColor(si)} strokeWidth="2" strokeLinejoin="round" />
          {points.map((p, i) => p && <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={chartColor(si)} />)}
        </g>
      );
    });
  } else {
    const groupInner = bandSize * 0.72;
    const barSize = groupInner / series.length;
    const zero = valuePos(0);
    marks = series.map((s, si) =>
      s.values.map((v, i) => {
        if (v === null) return null;
        const offset = (bandSize - groupInner) / 2 + si * barSize;
        const p = valuePos(v);
        return horizontal ? (
          <rect key={`${si}-${i}`} x={Math.min(zero, p)} y={top + i * bandSize + offset} width={Math.abs(p - zero)} height={Math.max(1, barSize - 1)} fill={chartColor(si)} />
        ) : (
          <rect key={`${si}-${i}`} x={left + i * bandSize + offset} y={Math.min(zero, p)} width={Math.max(1, barSize - 1)} height={Math.abs(zero - p)} fill={chartColor(si)} />
        );
      }),
    );
  }

  return frame(
    <>
      {grid}
      {categoryLabels}
      {horizontal ? <line x1={left} x2={left} y1={top} y2={top + plotH} stroke={MUTED} /> : <line x1={left} x2={left + plotW} y1={valuePos(Math.max(scale.min, Math.min(0, scale.max)))} y2={valuePos(Math.max(scale.min, Math.min(0, scale.max)))} stroke={MUTED} />}
      {marks}
      {legend}
    </>,
  );
};
