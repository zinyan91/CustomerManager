import type { XlsxSheet } from '../xlsxWriter';
import type { DueBucketFilter } from './dueBucket';
import type { ReportDef, ReportId, ReportLoadContext } from './types';

export async function gatherSheets(
  defs: ReportDef[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): Promise<{ sheets: XlsxSheet[]; failed: ReportId[] }> {
  const ketQua = await Promise.all(
    defs.map(async def => {
      try {
        const data = await def.load(ctx);
        const sheet = def.buildSheet(data, def.supportsDueFilter ? filter : 'all', ctx);
        return { id: def.id, sheet };
      } catch (err) {
        console.error(`gatherSheets error (${def.id}):`, err);
        return { id: def.id, sheet: null };
      }
    })
  );

  const sheets: XlsxSheet[] = [];
  const failed: ReportId[] = [];
  for (const r of ketQua) {
    if (r.sheet) sheets.push(r.sheet);
    else failed.push(r.id);
  }
  return { sheets, failed };
}
