/** Series colours, in order; they repeat after eight. Chosen to read on both a light and a dark page. */
export const CHART_COLORS = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7'];

export const chartColor = (index: number): string => CHART_COLORS[index % CHART_COLORS.length];
