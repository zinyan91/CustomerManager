import type { XlsxSheet } from '../xlsxWriter';
import type { DueBucketFilter } from './dueBucket';

export type ReportId = 'portfolio' | 'due' | 'kunn' | 'credit' | 'collateral';

export interface ReportLoadContext {
  todayIso: string;
}

export interface ReportRowSet {
  rows: unknown[];
}

export interface ReportDef {
  id: ReportId;
  name: string;
  shortName: string;
  sheetName: string;
  supportsDueFilter: boolean;
  dueFieldLabel: string;
  load(ctx: ReportLoadContext): Promise<ReportRowSet>;
  buildSheet(data: ReportRowSet, filter: DueBucketFilter, ctx: ReportLoadContext): XlsxSheet;
}
