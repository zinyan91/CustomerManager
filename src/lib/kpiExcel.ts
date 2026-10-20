import type { KpiDefinition } from '../types/kpi';
import { KPI_FEE_FIELDS } from '../types/kpi';
import type { TeamMember } from '../types/team';

export async function readKpiExcel(file: File): Promise<Record<string, unknown>[]> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Tệp Excel vượt quá 5 MB.');
  const xlsx = await import('xlsx');
  const workbook = xlsx.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets.KPI;
  if (!sheet) throw new Error('Không tìm thấy sheet KPI trong tệp.');
  if (!sheet['!ref']) throw new Error('Sheet KPI không có dữ liệu.');
  const range = xlsx.utils.decode_range(sheet['!ref']);
  if (range.e.r > 10000 || range.e.c > 30) throw new Error('Sheet KPI vượt giới hạn 10000 dòng hoặc 31 cột.');
  for (const cell of Object.values(sheet)) {
    if (cell && typeof cell === 'object' && 'f' in cell) throw new Error('Sheet KPI phải chứa giá trị, không chứa công thức.');
  }
  return xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
}

export async function downloadKpiTemplate(definitions: KpiDefinition[], members: TeamMember[]) {
  const xlsx = await import('xlsx');
  const workbook = xlsx.utils.book_new();
  const headers = ['UserId', 'FullName', 'MetricCode', 'MetricName', 'Basis', 'Amount', ...KPI_FEE_FIELDS];
  const values = members.flatMap(member => definitions.map(definition => ({
    UserId: member.UserId, FullName: member.FullName, MetricCode: definition.Code, MetricName: definition.Name,
    Basis: definition.Aggregation === 'stock' ? 'snapshot' : 'month', Amount: null,
  })));
  const sheet = xlsx.utils.json_to_sheet(values, { header: headers });
  sheet['!cols'] = headers.map(header => ({ wch: header === 'UserId' ? 38 : header === 'MetricName' ? 32 : 22 }));
  for (let row = 1; row <= values.length; row++) {
    for (let column = 5; column < headers.length; column++) {
      sheet[xlsx.utils.encode_cell({ r: row, c: column })] = { t: 'z', z: '#,##0;(#,##0);"-"' };
    }
  }
  xlsx.utils.book_append_sheet(workbook, sheet, 'KPI');
  xlsx.writeFile(workbook, 'KPI-team.xlsx');
}
