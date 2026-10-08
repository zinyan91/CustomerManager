/** Hàm của bộ tính theo nhóm như thư viện hàm của Excel; thêm hàm mới vào engine thì phải xếp nhóm ở đây (có test canh). */
export type FunctionGroup = 'financial' | 'logical' | 'text' | 'dateTime' | 'lookup' | 'math' | 'statistical' | 'information' | 'array';

export const FUNCTION_GROUPS: Record<FunctionGroup, readonly string[]> = {
  financial: ['PMT', 'FV', 'PV', 'NPV', 'IRR'],
  logical: ['IF', 'IFS', 'IFERROR', 'IFNA', 'SWITCH', 'AND', 'OR', 'NOT', 'XOR', 'TRUE', 'FALSE'],
  text: [
    'CONCATENATE', 'CONCAT', 'TEXTJOIN', 'LEN', 'LEFT', 'RIGHT', 'MID', 'UPPER', 'LOWER', 'PROPER', 'TRIM', 'REPT', 'EXACT', 'SUBSTITUTE',
    'REPLACE', 'FIND', 'SEARCH', 'VALUE', 'TEXT', 'CHAR', 'CODE', 'CLEAN', 'T', 'TEXTBEFORE', 'TEXTAFTER',
  ],
  dateTime: ['TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'HOUR', 'MINUTE', 'SECOND', 'DAYS', 'EDATE', 'EOMONTH', 'DATEDIF', 'NETWORKDAYS', 'WORKDAY'],
  lookup: ['VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'LOOKUP', 'MATCH', 'XMATCH', 'INDEX', 'CHOOSE', 'OFFSET', 'INDIRECT', 'ADDRESS', 'HYPERLINK', 'ROW', 'COLUMN', 'ROWS', 'COLUMNS'],
  math: [
    'SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'SUMSQ', 'PRODUCT', 'ABS', 'SQRT', 'EXP', 'LN', 'LOG10', 'LOG', 'SIGN', 'INT', 'TRUNC', 'ROUND', 'ROUNDUP',
    'ROUNDDOWN', 'CEILING', 'FLOOR', 'MOD', 'POWER', 'PI', 'RAND', 'RANDBETWEEN', 'GCD', 'LCM', 'FACT', 'COMBIN', 'ISODD', 'ISEVEN',
  ],
  statistical: [
    'AVERAGE', 'AVERAGEIF', 'AVERAGEIFS', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'COUNTIFS', 'MIN', 'MAX', 'MINIFS', 'MAXIFS', 'MEDIAN', 'MODE', 'LARGE',
    'SMALL', 'RANK', 'STDEV', 'STDEVP', 'VAR', 'VARP', 'PERCENTILE', 'QUARTILE', 'CORREL', 'SLOPE', 'INTERCEPT', 'FORECAST',
  ],
  information: ['ISBLANK', 'ISNUMBER', 'ISTEXT', 'ISERROR', 'ISNA', 'ISLOGICAL', 'NA'],
  array: ['SEQUENCE', 'TRANSPOSE', 'UNIQUE', 'SORT', 'SORTBY', 'FILTER'],
};

/** Tên hàm kèm nhóm, theo thứ tự chữ cái, để tìm trong hộp Chèn hàm. */
export function allFunctions(): Array<{ name: string; group: FunctionGroup }> {
  return (Object.entries(FUNCTION_GROUPS) as Array<[FunctionGroup, readonly string[]]>)
    .flatMap(([group, names]) => names.map((name) => ({ name, group })))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const NO_ARGUMENTS = new Set(['PI', 'TODAY', 'NOW', 'RAND', 'TRUE', 'FALSE', 'NA']);

/** Phần chèn vào công thức khi chọn một hàm: `NAME(` hoặc `NAME()` cho hàm không có đối số. */
export const functionOpening = (name: string): string => (NO_ARGUMENTS.has(name) ? `${name}()` : `${name}(`);
