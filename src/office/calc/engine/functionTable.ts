import { FUNCTIONS as CORE, type Fn } from './functions';
import { ARRAY_FUNCTIONS } from './functionsArrays';
import { DATE_FUNCTIONS } from './functionsDate';
import { EXTRA_ALIASES, EXTRA_FUNCTIONS } from './functionsExtra';
import { FINANCE_FUNCTIONS } from './functionsFinance';
import { MATH_FUNCTIONS } from './functionsMath';
import { REGRESSION_FUNCTIONS } from './functionsRegression';
import { STATS_FUNCTIONS } from './functionsStats';
import { TEXT_INFO_FUNCTIONS } from './functionsTextInfo';

/** Names Excel gives the same function. */
const ALIASES: Record<string, string> = {
  'STDEV.S': 'STDEV',
  'STDEV.P': 'STDEVP',
  'VAR.S': 'VAR',
  'VAR.P': 'VARP',
  'MODE.SNGL': 'MODE',
  'RANK.EQ': 'RANK',
  'PERCENTILE.INC': 'PERCENTILE',
  'QUARTILE.INC': 'QUARTILE',
  'PERCENTRANK.INC': 'PERCENTRANK',
  'CEILING.PRECISE': 'CEILING.MATH',
  'FLOOR.PRECISE': 'FLOOR.MATH',
  NORMDIST: 'NORM.DIST',
  NORMSDIST: 'NORM.S.DIST',
  NORMINV: 'NORM.INV',
  NORMSINV: 'NORM.S.INV',
  BINOMDIST: 'BINOM.DIST',
  POISSON: 'POISSON.DIST',
  EXPONDIST: 'EXPON.DIST',
  COVAR: 'COVARIANCE.P',
  'FORECAST.LINEAR': 'FORECAST',
};

/** Every function the engine knows, by upper-case name. */
export const FUNCTIONS: Record<string, Fn> = { ...CORE, ...MATH_FUNCTIONS, ...STATS_FUNCTIONS, ...FINANCE_FUNCTIONS, ...DATE_FUNCTIONS, ...TEXT_INFO_FUNCTIONS, ...ARRAY_FUNCTIONS, ...EXTRA_FUNCTIONS, ...REGRESSION_FUNCTIONS };
for (const [alias, name] of Object.entries({ ...ALIASES, ...EXTRA_ALIASES })) FUNCTIONS[alias] = FUNCTIONS[name];
