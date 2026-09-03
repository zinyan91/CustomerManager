import * as XLSX from 'xlsx';
import type {
  CorporateFinancialProfile,
  B01aStatement,
  B02Statement,
  B01bStatement,
  FinancialLineItem,
} from '../types/corporateFinancial';
import {
  createEmptyB01a,
  createEmptyB02,
  createEmptyB01b,
} from './corporateFinancialDefaults';
import {
  computeB01a,
  computeB02,
  computeB01b,
} from './corporateFinancialFormulas';

export interface ImportResult {
  profile: CorporateFinancialProfile;
  sheetCount: number;
  matchedItemsCount: {
    b01a: number;
    b02: number;
    b01b: number;
  };
  warnings: string[];
}

function parseNumberCell(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  const str = String(val).trim();
  if (str === '-' || str === '–' || str === '—') return 0;

  // Handle accounting parentheses: "(1,234)" => -1234
  const isNegative = /^\(.*\)$/.test(str) || str.startsWith('-');
  const cleanStr = str.replace(/[()_]/g, '').trim();

  // If Vietnamese format like "1.234.567" or English "1,234,567"
  let parsed = 0;
  if (cleanStr.includes('.') && cleanStr.includes(',')) {
    // Determine which is thousand separator
    if (cleanStr.lastIndexOf('.') > cleanStr.lastIndexOf(',')) {
      // English: 1,234.56
      parsed = parseFloat(cleanStr.replace(/,/g, ''));
    } else {
      // Vietnamese: 1.234,56
      parsed = parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
    }
  } else if (cleanStr.includes('.')) {
    // Could be 1.200.000 (dots as thousand separators)
    const dotCount = (cleanStr.match(/\./g) || []).length;
    if (dotCount > 1 || /\.\d{3}$/.test(cleanStr)) {
      parsed = parseFloat(cleanStr.replace(/\./g, ''));
    } else {
      parsed = parseFloat(cleanStr);
    }
  } else if (cleanStr.includes(',')) {
    const commaCount = (cleanStr.match(/,/g) || []).length;
    if (commaCount > 1 || /,\d{3}$/.test(cleanStr)) {
      parsed = parseFloat(cleanStr.replace(/,/g, ''));
    } else {
      parsed = parseFloat(cleanStr.replace(',', '.'));
    }
  } else {
    parsed = parseFloat(cleanStr);
  }

  if (isNaN(parsed)) return 0;
  return isNegative && parsed > 0 ? -parsed : parsed;
}

function normalizeCode(raw: any): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  // Pad single digit or two digit if needed, e.g. "1" -> "01" for B02
  if (/^\d$/.test(s)) {
    return `0${s}`;
  }
  return s;
}

interface DetectedColumns {
  nameCol: number;
  codeCol: number;
  currentPeriodCol: number;
  previousPeriodCol: number;
  startRow: number;
}

function detectTableColumns(rows: any[][]): DetectedColumns | null {
  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let codeCol = -1;
    let nameCol = -1;
    let curCol = -1;
    let prevCol = -1;

    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c] || '').toLowerCase().trim();
      if (!cellText) continue;

      if (/mã\s*số|mã\s*chỉ\s*tiêu|^mã$/i.test(cellText)) {
        codeCol = c;
      } else if (/chỉ\s*tiêu|khoản\s*mục|tên\s*chỉ\s*tiêu/i.test(cellText)) {
        nameCol = c;
      } else if (/cuối\s*năm|năm\s*nay|kỳ\s*này|số\s*cuối\s*kỳ|năm\s*20\d\d/i.test(cellText)) {
        if (curCol === -1) {
          curCol = c;
        } else if (prevCol === -1) {
          prevCol = c;
        }
      } else if (/đầu\s*năm|năm\s*trước|kỳ\s*trước|số\s*đầu\s*kỳ/i.test(cellText)) {
        prevCol = c;
      }
    }

    // If we found at least Code column or Name column, and current period column
    if (codeCol !== -1 && curCol !== -1) {
      if (nameCol === -1) nameCol = codeCol === 0 ? 1 : 0;
      if (prevCol === -1 && curCol + 1 < row.length) prevCol = curCol + 1;
      return {
        codeCol,
        nameCol,
        currentPeriodCol: curCol,
        previousPeriodCol: prevCol,
        startRow: r + 1,
      };
    }
  }

  // Fallback heuristic: Common TT 133 layout:
  // Col 0: Chỉ tiêu, Col 1: Mã số, Col 2: Thuyết minh, Col 3: Số cuối năm, Col 4: Số đầu năm
  return {
    nameCol: 0,
    codeCol: 1,
    currentPeriodCol: 3,
    previousPeriodCol: 4,
    startRow: 6,
  };
}

function extractCompanyMetadata(rows: any[][]): {
  companyName?: string;
  taxCode?: string;
  address?: string;
  year?: number;
} {
  let companyName = '';
  let taxCode = '';
  let address = '';
  let year: number | undefined;

  for (let r = 0; r < Math.min(rows.length, 12); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    for (let c = 0; c < row.length; c++) {
      const text = String(row[c] || '').trim();
      if (!text) continue;

      if (/mã\s*số\s*thuế|mst/i.test(text)) {
        const match = text.match(/([0-9]{10}(?:-[0-9]{3})?)/);
        if (match) taxCode = match[1];
      }

      if (/địa\s*chỉ/i.test(text)) {
        const addr = text.replace(/^.*địa\s*chỉ\s*[:：]\s*/i, '').trim();
        if (addr) address = addr;
      }

      if (/năm\s*tài\s*chính|cho\s*năm|năm\s*20\d\d/i.test(text)) {
        const yMatch = text.match(/20\d\d/);
        if (yMatch) year = parseInt(yMatch[0], 10);
      }

      if (
        !companyName &&
        /công\s*ty|doanh\s*nghiệp|tổng\s*công\s*ty|cty|tnhh|cổ\s*phần|cp\b/i.test(text) &&
        !/bộ\s*tài\s*chính|thông\s*tư/i.test(text)
      ) {
        companyName = text;
      }
    }
  }

  return { companyName, taxCode, address, year };
}

function parseSheetItems(
  rows: any[][],
  targetTemplate: FinancialLineItem[]
): { items: FinancialLineItem[]; matchedCount: number } {
  const cols = detectTableColumns(rows);
  if (!cols) {
    return { items: JSON.parse(JSON.stringify(targetTemplate)), matchedCount: 0 };
  }

  // Create lookup dictionary from excel data
  const dataMap = new Map<string, { cur: number; prev: number }>();

  for (let r = cols.startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Check code column
    const rawCode = row[cols.codeCol];
    const code = normalizeCode(rawCode);

    if (code && /^\d{2,3}$/.test(code)) {
      const cur = parseNumberCell(row[cols.currentPeriodCol]);
      const prev = cols.previousPeriodCol !== -1 ? parseNumberCell(row[cols.previousPeriodCol]) : 0;
      dataMap.set(code, { cur, prev });
    }
  }

  // Map into target template
  let matchedCount = 0;
  const items: FinancialLineItem[] = JSON.parse(JSON.stringify(targetTemplate));

  items.forEach(it => {
    if (dataMap.has(it.code)) {
      const val = dataMap.get(it.code)!;
      it.currentPeriod = val.cur;
      it.previousPeriod = val.prev;
      matchedCount++;
    }
  });

  return { items, matchedCount };
}

export function parseCorporateFinancialExcel(fileBuffer: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const warnings: string[] = [];

  if (sheetNames.length === 0) {
    throw new Error('File Excel không có sheet nào.');
  }

  // Identify sheets
  let b01aSheetName = '';
  let b02SheetName = '';
  let b01bSheetName = '';

  sheetNames.forEach(sn => {
    const lower = sn.toLowerCase();
    if (/b01a|thtc|tinh.*hinh.*tai.*chinh/i.test(lower)) {
      b01aSheetName = sn;
    } else if (/b02|kqkd|ket.*qua.*kinh.*doanh/i.test(lower)) {
      b02SheetName = sn;
    } else if (/b01b|cdkt|can.*doi.*ke.*toan/i.test(lower)) {
      b01bSheetName = sn;
    }
  });

  // Fallbacks if not matched by name
  if (!b01aSheetName && sheetNames[0]) b01aSheetName = sheetNames[0];
  if (!b02SheetName && sheetNames[1]) b02SheetName = sheetNames[1];
  if (!b01bSheetName && sheetNames[2]) b01bSheetName = sheetNames[2];

  // Read metadata from the first sheet
  const firstSheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[b01aSheetName], {
    header: 1,
  }) as any[][];
  const meta = extractCompanyMetadata(firstSheetRows);

  const currentYear = meta.year || new Date().getFullYear();
  const companyName = meta.companyName || 'DOANH NGHIỆP NHẬP TỪ EXCEL';
  const taxCode = meta.taxCode || '';
  const address = meta.address || '';

  // Parse B01a
  let b01a: B01aStatement = createEmptyB01a(currentYear);
  b01a.companyName = companyName;
  b01a.taxCode = taxCode;
  b01a.address = address;
  b01a.periodYear = currentYear;

  let matchedB01a = 0;
  if (b01aSheetName && workbook.Sheets[b01aSheetName]) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[b01aSheetName], {
      header: 1,
    }) as any[][];
    const res = parseSheetItems(rows, b01a.items);
    b01a.items = res.items;
    matchedB01a = res.matchedCount;
    b01a = computeB01a(b01a);
  } else {
    warnings.push('Không tìm thấy sheet cho Báo cáo tình hình tài chính (B01a).');
  }

  // Parse B02
  let b02: B02Statement = createEmptyB02(currentYear);
  b02.companyName = companyName;
  b02.taxCode = taxCode;
  b02.address = address;
  b02.periodYear = currentYear;

  let matchedB02 = 0;
  if (b02SheetName && workbook.Sheets[b02SheetName]) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[b02SheetName], {
      header: 1,
    }) as any[][];
    const res = parseSheetItems(rows, b02.items);
    b02.items = res.items;
    matchedB02 = res.matchedCount;
    b02 = computeB02(b02);
  } else {
    warnings.push('Không tìm thấy sheet cho Báo cáo kết quả kinh doanh (B02).');
  }

  // Parse B01b
  let b01b: B01bStatement = createEmptyB01b(currentYear);
  b01b.companyName = companyName;
  b01b.taxCode = taxCode;
  b01b.address = address;
  b01b.periodYear = currentYear;

  let matchedB01b = 0;
  if (b01bSheetName && workbook.Sheets[b01bSheetName]) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[b01bSheetName], {
      header: 1,
    }) as any[][];
    const res = parseSheetItems(rows, b01b.items);
    b01b.items = res.items;
    matchedB01b = res.matchedCount;
    b01b = computeB01b(b01b);
  }

  const profile: CorporateFinancialProfile = {
    id: `corp_${Date.now()}`,
    name: companyName,
    taxCode,
    address,
    year: currentYear,
    updatedAt: new Date().toISOString(),
    b01a,
    b02,
    b01b,
  };

  return {
    profile,
    sheetCount: sheetNames.length,
    matchedItemsCount: {
      b01a: matchedB01a,
      b02: matchedB02,
      b01b: matchedB01b,
    },
    warnings,
  };
}
