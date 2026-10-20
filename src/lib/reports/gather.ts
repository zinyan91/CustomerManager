import type { XlsxSheet } from '../xlsxWriter';
import type { DueBucketFilter } from './dueBucket';
import type { ReportDef, ReportId, ReportLoadContext } from './types';
import { reportErrorMessage } from './errorMessage';
import { runWithTimeout } from '../asyncTimeout';

export async function gatherSheets(
  defs: ReportDef[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): Promise<{ sheets: XlsxSheet[]; failed: ReportId[]; errors: string[] }> {
  const ketQua = await Promise.all(
    defs.map(async def => {
      try {
        const data = await runWithTimeout(()=>def.load(ctx),60_000,`Nạp báo cáo ${def.name} quá thời gian chờ.`);
        const sheet = def.buildSheet(data, def.supportsDueFilter ? filter : 'all', ctx);
        return { id: def.id, sheet };
      } catch (err) {
        console.error(`gatherSheets error (${def.id}):`, err);
        return { id: def.id, sheet: null, error: reportErrorMessage(err) };
      }
    })
  );

  const sheets: XlsxSheet[] = [];
  const failed: ReportId[] = [];
  const errors: string[] = [];
  for (const r of ketQua) {
    if (r.sheet) sheets.push(r.sheet);
    else { failed.push(r.id); errors.push(r.error ?? 'Lỗi không xác định'); }
  }
  return { sheets, failed, errors };
}
