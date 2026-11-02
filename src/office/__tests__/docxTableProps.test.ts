import { describe, expect, it } from 'vitest';
import { applyTableProps, tableProps } from '../writer/utils/docxTableProps';

const xml =
  '<w:tbl><w:tr><w:trPr><w:trHeight w:val="600"/></w:trPr><w:tc><w:tcPr><w:vAlign w:val="center"/></w:tcPr></w:tc><w:tc><w:tcPr><w:vMerge w:val="restart"/></w:tcPr></w:tc></w:tr>' +
  '<w:tr><w:tc><w:tcPr><w:vMerge/></w:tcPr></w:tc><w:tc><w:tcPr><w:vAlign w:val="bottom"/></w:tcPr></w:tc></w:tr></w:tbl>';

describe('row heights and vertical alignment of a table in a .docx', () => {
  it('reads them in document order, leaving out a cell that continues a merge', () => {
    expect(tableProps(xml)).toEqual([{ rows: [600, null], cells: ['center', null, 'bottom'] }]);
  });

  it('puts them on the rows and cells of the HTML', () => {
    const html = '<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></tbody></table>';
    expect(applyTableProps(html, xml)).toBe('<table><tbody><tr data-row-height="40"><td data-valign="center">a</td><td>b</td></tr><tr><td data-valign="bottom">c</td></tr></tbody></table>');
  });

  it('leaves the HTML alone when the tables do not match the file', () => {
    const html = '<table><tbody><tr><td>a</td></tr></tbody></table>';
    expect(applyTableProps(html, xml)).toBe(html);
  });
});
