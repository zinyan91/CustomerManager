export const VHTT_FORM_ATTR = 'data-vhtt-form';

export const VHTT_DOCX_FONT = 'Arial';

export interface VhttDocxMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
  header: number;
  footer: number;
}

export interface VhttDocxProfile {
  bodySize: number;
  tableSize: number;
  titleSize: number;
  margins: VhttDocxMargins;
}

export const VHTT_DOCX_PROFILES: Record<string, VhttDocxProfile> = {
  BM01: { bodySize: 20, tableSize: 20, titleSize: 24, margins: { top: 900, bottom: 720, left: 1440, right: 1440, header: 720, footer: 450 } },
  BM02: { bodySize: 20, tableSize: 18, titleSize: 24, margins: { top: 1134, bottom: 851, left: 1310, right: 1080, header: 720, footer: 504 } },
  BM07: { bodySize: 20, tableSize: 20, titleSize: 24, margins: { top: 900, bottom: 461, left: 1138, right: 1008, header: 900, footer: 864 } },
  BM09: { bodySize: 20, tableSize: 20, titleSize: 24, margins: { top: 1440, bottom: 1440, left: 1440, right: 1440, header: 720, footer: 720 } },
  BM11: { bodySize: 20, tableSize: 20, titleSize: 24, margins: { top: 567, bottom: 709, left: 1310, right: 1077, header: 720, footer: 347 } },
};
