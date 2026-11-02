/** Hàm của bộ tính theo nhóm như thư viện hàm của Excel; thêm hàm mới vào engine thì phải xếp nhóm ở đây (có test canh). */
export type FunctionGroup = 'financial' | 'logical' | 'text' | 'dateTime' | 'lookup' | 'math' | 'statistical' | 'engineering' | 'information' | 'array';

export const FUNCTION_GROUPS: Record<FunctionGroup, readonly string[]> = {
  financial: [
    'PMT', 'FV', 'PV', 'NPV', 'IRR', 'IPMT', 'PPMT', 'NPER', 'RATE', 'CUMIPMT', 'CUMPRINC', 'ISPMT', 'MIRR', 'XIRR', 'XNPV', 'EFFECT', 'NOMINAL',
    'FVSCHEDULE', 'RRI', 'SLN', 'SYD', 'DB', 'DDB',
  ],
  logical: ['IF', 'IFS', 'IFERROR', 'IFNA', 'SWITCH', 'AND', 'OR', 'NOT', 'XOR', 'TRUE', 'FALSE'],
  text: [
    'CONCATENATE', 'CONCAT', 'TEXTJOIN', 'LEN', 'LEFT', 'RIGHT', 'MID', 'UPPER', 'LOWER', 'PROPER', 'TRIM', 'REPT', 'EXACT', 'SUBSTITUTE',
    'REPLACE', 'FIND', 'SEARCH', 'VALUE', 'TEXT', 'CHAR', 'CODE', 'CLEAN', 'T', 'TEXTBEFORE', 'TEXTAFTER', 'TEXTSPLIT', 'NUMBERVALUE', 'FIXED',
    'DOLLAR', 'UNICHAR', 'UNICODE',
  ],
  dateTime: [
    'TODAY', 'NOW', 'DATE', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'HOUR', 'MINUTE', 'SECOND', 'DAYS', 'EDATE', 'EOMONTH', 'DATEDIF', 'NETWORKDAYS', 'WORKDAY',
    'TIME', 'DATEVALUE', 'TIMEVALUE', 'DAYS360', 'WEEKNUM', 'ISOWEEKNUM', 'YEARFRAC', 'NETWORKDAYS.INTL', 'WORKDAY.INTL',
  ],
  lookup: ['VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'LOOKUP', 'MATCH', 'XMATCH', 'INDEX', 'CHOOSE', 'OFFSET', 'INDIRECT', 'ADDRESS', 'HYPERLINK', 'ROW', 'COLUMN', 'ROWS', 'COLUMNS', 'AREAS'],
  math: [
    'SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'SUMSQ', 'PRODUCT', 'ABS', 'SQRT', 'EXP', 'LN', 'LOG10', 'LOG', 'SIGN', 'INT', 'TRUNC', 'ROUND', 'ROUNDUP',
    'ROUNDDOWN', 'CEILING', 'FLOOR', 'MOD', 'POWER', 'PI', 'RAND', 'RANDBETWEEN', 'GCD', 'LCM', 'FACT', 'COMBIN', 'ISODD', 'ISEVEN',
    'CEILING.MATH', 'CEILING.PRECISE', 'FLOOR.MATH', 'FLOOR.PRECISE', 'MROUND', 'EVEN', 'ODD', 'QUOTIENT', 'FACTDOUBLE', 'COMBINA', 'MULTINOMIAL',
    'SQRTPI', 'SERIESSUM', 'SUMX2MY2', 'SUMX2PY2', 'SUMXMY2', 'MMULT', 'MDETERM', 'MINVERSE', 'MUNIT', 'DEGREES', 'RADIANS', 'SIN', 'COS', 'TAN',
    'ASIN', 'ACOS', 'ATAN', 'ATAN2', 'SINH', 'COSH', 'TANH', 'ASINH', 'ACOSH', 'ATANH', 'SEC', 'CSC', 'COT', 'SECH', 'CSCH', 'COTH', 'ACOT', 'ACOTH',
    'ROMAN', 'ARABIC', 'BASE', 'DECIMAL',
  ],
  statistical: [
    'AVERAGE', 'AVERAGEIF', 'AVERAGEIFS', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'COUNTIFS', 'MIN', 'MAX', 'MINIFS', 'MAXIFS', 'MEDIAN', 'MODE', 'LARGE',
    'SMALL', 'RANK', 'STDEV', 'STDEVP', 'VAR', 'VARP', 'PERCENTILE', 'QUARTILE', 'CORREL', 'SLOPE', 'INTERCEPT', 'FORECAST',
    'AVERAGEA', 'MAXA', 'MINA', 'AVEDEV', 'DEVSQ', 'GEOMEAN', 'HARMEAN', 'TRIMMEAN', 'KURT', 'SKEW', 'STANDARDIZE', 'MODE.SNGL', 'RANK.EQ', 'RANK.AVG',
    'STDEV.S', 'STDEV.P', 'STDEVA', 'STDEVPA', 'VAR.S', 'VAR.P', 'VARA', 'VARPA', 'PERCENTILE.INC', 'PERCENTILE.EXC', 'PERCENTRANK', 'PERCENTRANK.INC',
    'QUARTILE.INC', 'QUARTILE.EXC', 'COVAR', 'COVARIANCE.P', 'COVARIANCE.S', 'RSQ', 'STEYX', 'FORECAST.LINEAR', 'TREND', 'GROWTH', 'LINEST', 'LOGEST',
    'FREQUENCY', 'PERMUT', 'FISHER', 'FISHERINV', 'PHI', 'GAUSS', 'GAMMA', 'GAMMALN', 'GAMMALN.PRECISE', 'NORM.DIST', 'NORM.INV', 'NORM.S.DIST',
    'NORM.S.INV', 'NORMDIST', 'NORMINV', 'NORMSDIST', 'NORMSINV', 'LOGNORM.DIST', 'LOGNORM.INV', 'LOGNORMDIST', 'LOGINV', 'BINOM.DIST', 'BINOMDIST',
    'POISSON', 'POISSON.DIST', 'EXPON.DIST', 'EXPONDIST', 'WEIBULL', 'WEIBULL.DIST', 'GAMMA.DIST', 'GAMMA.INV', 'GAMMADIST', 'GAMMAINV', 'BETA.DIST',
    'BETA.INV', 'BETADIST', 'BETAINV', 'T.DIST', 'T.DIST.2T', 'T.DIST.RT', 'T.INV', 'T.INV.2T', 'TDIST', 'TINV', 'CHISQ.DIST', 'CHISQ.DIST.RT',
    'CHISQ.INV', 'CHISQ.INV.RT', 'CHIDIST', 'CHIINV', 'F.DIST', 'F.DIST.RT', 'F.INV', 'F.INV.RT', 'FDIST', 'FINV', 'CONFIDENCE', 'CONFIDENCE.NORM',
    'CONFIDENCE.T', 'Z.TEST', 'ZTEST',
  ],
  engineering: [
    'BIN2DEC', 'BIN2HEX', 'BIN2OCT', 'DEC2BIN', 'DEC2HEX', 'DEC2OCT', 'HEX2DEC', 'OCT2DEC', 'BITAND', 'BITOR', 'BITXOR', 'BITLSHIFT', 'BITRSHIFT',
    'DELTA', 'GESTEP', 'ERF', 'ERFC',
  ],
  information: ['ISBLANK', 'ISNUMBER', 'ISTEXT', 'ISERROR', 'ISNA', 'ISLOGICAL', 'NA', 'ISERR', 'ISNONTEXT', 'ERROR.TYPE', 'TYPE', 'N'],
  array: [
    'SEQUENCE', 'TRANSPOSE', 'UNIQUE', 'SORT', 'SORTBY', 'FILTER', 'RANDARRAY', 'TAKE', 'DROP', 'EXPAND', 'CHOOSECOLS', 'CHOOSEROWS', 'HSTACK', 'VSTACK',
    'TOCOL', 'TOROW', 'WRAPCOLS', 'WRAPROWS',
  ],
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
