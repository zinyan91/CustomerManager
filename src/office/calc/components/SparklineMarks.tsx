import React from 'react';

/** The marks of a sparkline in a 100 by 30 box: a polyline, or one bar per value (a missing value leaves a gap). */
export function sparklineMarks(values: ReadonlyArray<number | null>, type: 'line' | 'column' | 'winLoss'): React.ReactNode {
  const numbers = values.filter((v): v is number => v !== null);
  if (numbers.length === 0) return null;
  if (type === 'winLoss') {
    const width = 100 / values.length;
    return values.map((v, i) => {
      if (v === null || v === 0) return null;
      const isWin = v > 0;
      const x = i * width + width * 0.1;
      const y = isWin ? 3 : 16;
      const barHeight = 11;
      const fill = isWin ? '#376092' : '#c0504d';
      return <rect key={i} x={x} y={y} width={width * 0.8} height={barHeight} fill={fill} rx={1} />;
    });
  }
  const min = Math.min(...numbers, type === 'column' ? 0 : Infinity);
  const max = Math.max(...numbers, type === 'column' ? 0 : -Infinity);
  const span = max === min ? 1 : max - min;
  const y = (v: number) => 28 - ((v - min) / span) * 26;
  const step = values.length > 1 ? 100 / (values.length - 1) : 0;
  if (type === 'line') {
    let path = '';
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      path += `${pen ? 'L' : 'M'}${values.length > 1 ? i * step : 50},${y(v)}`;
      pen = true;
    });
    return <path d={path} fill="none" stroke="#376092" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />;
  }
  const width = 100 / values.length;
  const zero = y(0);
  return values.map((v, i) =>
    v === null ? null : <rect key={i} x={i * width + width * 0.1} y={Math.min(zero, y(v))} width={width * 0.8} height={Math.max(1, Math.abs(zero - y(v)))} fill={v < 0 ? '#c0504d' : '#376092'} />,
  );
}
