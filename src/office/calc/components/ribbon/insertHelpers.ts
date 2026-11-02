/**
 * Helper functions to generate SVG graphics for Shapes and Icons.
 */

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface ShapeItem {
  id: string;
  name: string;
  category: 'lines' | 'rectangles' | 'basic' | 'arrows' | 'callouts';
  render: () => { dataUrl: string; width: number; height: number };
}

export const SHAPES_CATALOG: ShapeItem[] = [
  // Rectangles
  {
    id: 'rect',
    name: 'Rectangle',
    category: 'rectangles',
    render: () => ({
      width: 180,
      height: 90,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="90" viewBox="0 0 180 90">
          <rect x="2" y="2" width="176" height="86" rx="0" fill="#4f81bd" stroke="#2b579a" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  {
    id: 'round-rect',
    name: 'Rounded Rectangle',
    category: 'rectangles',
    render: () => ({
      width: 180,
      height: 90,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="90" viewBox="0 0 180 90">
          <rect x="2" y="2" width="176" height="86" rx="14" fill="#4f81bd" stroke="#2b579a" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  // Basic Shapes
  {
    id: 'oval',
    name: 'Oval',
    category: 'basic',
    render: () => ({
      width: 180,
      height: 90,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="90" viewBox="0 0 180 90">
          <ellipse cx="90" cy="45" rx="86" ry="41" fill="#4f81bd" stroke="#2b579a" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  {
    id: 'triangle',
    name: 'Isosceles Triangle',
    category: 'basic',
    render: () => ({
      width: 160,
      height: 100,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100">
          <polygon points="80,6 154,94 6,94" fill="#4f81bd" stroke="#2b579a" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  {
    id: 'diamond',
    name: 'Diamond',
    category: 'basic',
    render: () => ({
      width: 140,
      height: 100,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="100" viewBox="0 0 140 100">
          <polygon points="70,6 134,50 70,94 6,50" fill="#4f81bd" stroke="#2b579a" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  {
    id: 'star',
    name: '5-Point Star',
    category: 'basic',
    render: () => ({
      width: 120,
      height: 120,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
          <polygon points="60,6 74,45 116,45 82,70 95,110 60,86 25,110 38,70 4,45 46,45" fill="#ffc000" stroke="#d59b00" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  {
    id: 'heart',
    name: 'Heart',
    category: 'basic',
    render: () => ({
      width: 120,
      height: 110,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="110" viewBox="0 0 120 110">
          <path d="M60,30 C60,15 45,6 30,6 C14,6 4,18 4,36 C4,62 40,84 60,102 C80,84 116,62 116,36 C116,18 106,6 90,6 C75,6 60,15 60,30 Z" fill="#c0504d" stroke="#943634" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  // Lines
  {
    id: 'line',
    name: 'Line',
    category: 'lines',
    render: () => ({
      width: 180,
      height: 20,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20" viewBox="0 0 180 20">
          <line x1="4" y1="10" x2="176" y2="10" stroke="#2b579a" stroke-width="3" stroke-linecap="round"/>
        </svg>`,
      ),
    }),
  },
  {
    id: 'arrow-line',
    name: 'Arrow',
    category: 'lines',
    render: () => ({
      width: 180,
      height: 30,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="30" viewBox="0 0 180 30">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#2b579a"/>
            </marker>
          </defs>
          <line x1="6" y1="15" x2="168" y2="15" stroke="#2b579a" stroke-width="3" marker-end="url(#arrow)"/>
        </svg>`,
      ),
    }),
  },
  // Block Arrows
  {
    id: 'right-arrow',
    name: 'Right Arrow',
    category: 'arrows',
    render: () => ({
      width: 180,
      height: 70,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="70" viewBox="0 0 180 70">
          <polygon points="4,24 110,24 110,8 174,35 110,62 110,46 4,46" fill="#4f81bd" stroke="#2b579a" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  {
    id: 'left-arrow',
    name: 'Left Arrow',
    category: 'arrows',
    render: () => ({
      width: 180,
      height: 70,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="70" viewBox="0 0 180 70">
          <polygon points="174,24 70,24 70,8 6,35 70,62 70,46 174,46" fill="#4f81bd" stroke="#2b579a" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
  // Callouts
  {
    id: 'callout',
    name: 'Callout',
    category: 'callouts',
    render: () => ({
      width: 180,
      height: 90,
      dataUrl: svgToDataUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="90" viewBox="0 0 180 90">
          <path d="M6,6 L174,6 A4,4 0 0 1 178,10 L178,64 A4,4 0 0 1 174,68 L80,68 L50,86 L60,68 L6,68 A4,4 0 0 1 2,64 L2,10 A4,4 0 0 1 6,6 Z" fill="#ffffcc" stroke="#d59b00" stroke-width="2"/>
        </svg>`,
      ),
    }),
  },
];

export interface IconItem {
  id: string;
  name: string;
  svgPath: string;
  fill?: string;
}

export const ICONS_CATALOG: IconItem[] = [
  { id: 'check', name: 'Check', svgPath: '<polyline points="20 6 9 17 4 12" fill="none" stroke="#107c41" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'star', name: 'Star', svgPath: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#ffb900" stroke="#d59b00" stroke-width="1.5"/>' },
  { id: 'heart', name: 'Heart', svgPath: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#d83b01" stroke="#a80000" stroke-width="1.5"/>' },
  { id: 'alert', name: 'Warning', svgPath: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" fill="#ffb900" stroke="#d59b00" stroke-width="1.5"/><line x1="12" y1="9" x2="12" y2="13" stroke="#242424" stroke-width="2"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="#242424" stroke-width="2"/>' },
  { id: 'user', name: 'User', svgPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="#0078d4" stroke-width="2"/><circle cx="12" cy="7" r="4" fill="none" stroke="#0078d4" stroke-width="2"/>' },
  { id: 'calendar', name: 'Calendar', svgPath: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="#0078d4" stroke-width="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="#0078d4" stroke-width="2"/><line x1="8" y1="2" x2="8" y2="6" stroke="#0078d4" stroke-width="2"/><line x1="3" y1="10" x2="21" y2="10" stroke="#0078d4" stroke-width="2"/>' },
  { id: 'file', name: 'Document', svgPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="#107c41" stroke-width="2"/><polyline points="14 2 14 8 20 8" fill="none" stroke="#107c41" stroke-width="2"/>' },
  { id: 'mail', name: 'Mail', svgPath: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="#0078d4" stroke-width="2"/><polyline points="22,6 12,13 2,6" fill="none" stroke="#0078d4" stroke-width="2"/>' },
  { id: 'cart', name: 'Shopping Cart', svgPath: '<circle cx="9" cy="21" r="1" fill="#242424"/><circle cx="20" cy="21" r="1" fill="#242424"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="#242424" stroke-width="2"/>' },
  { id: 'lock', name: 'Lock', svgPath: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="#d83b01" stroke-width="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" fill="none" stroke="#d83b01" stroke-width="2"/>' },
  { id: 'globe', name: 'Globe', svgPath: '<circle cx="12" cy="12" r="10" fill="none" stroke="#0078d4" stroke-width="2"/><line x1="2" y1="12" x2="22" y2="12" stroke="#0078d4" stroke-width="2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="#0078d4" stroke-width="2"/>' },
  { id: 'bell', name: 'Notification', svgPath: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="#ffb900" stroke-width="2"/><path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="#ffb900" stroke-width="2"/>' },
];

export function renderIconSvg(icon: IconItem): { dataUrl: string; width: number; height: number } {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24">${icon.svgPath}</svg>`;
  return {
    width: 80,
    height: 80,
    dataUrl: svgToDataUrl(svg),
  };
}

export const MATH_EQUATIONS = [
  { symbol: '∑', label: 'Sum (∑)' },
  { symbol: '∫', label: 'Integral (∫)' },
  { symbol: '√', label: 'Square Root (√)' },
  { symbol: 'π', label: 'Pi (π)' },
  { symbol: '∞', label: 'Infinity (∞)' },
  { symbol: '±', label: 'Plus-Minus (±)' },
  { symbol: '≈', label: 'Approximately (≈)' },
  { symbol: '≠', label: 'Not Equal (≠)' },
  { symbol: '≤', label: 'Less Than Equal (≤)' },
  { symbol: '≥', label: 'Greater Than Equal (≥)' },
  { symbol: '×', label: 'Multiply (×)' },
  { symbol: '÷', label: 'Divide (÷)' },
  { symbol: '∆', label: 'Delta (∆)' },
  { symbol: 'θ', label: 'Theta (θ)' },
  { symbol: 'λ', label: 'Lambda (λ)' },
  { symbol: 'μ', label: 'Micro (μ)' },
  { symbol: 'α', label: 'Alpha (α)' },
  { symbol: 'β', label: 'Beta (β)' },
];
