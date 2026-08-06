export function downloadXls(html: string, fileName: string): void {
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function xlsShell(title: string, subtitle: string, tableHtml: string, note?: string): string {
  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8"/>
      <style>
        td, th { border: 1px solid #cbd5e1; padding: 6px; font-family: Arial, sans-serif; font-size: 11pt; }
      </style>
    </head>
    <body>
      <h2>${title}</h2>
      <p>${subtitle}</p>
      ${tableHtml}
      <p style="font-size:10pt;color:#475569;">
        ${note || 'Tiền giảm lãi = Số dư × (LSCV theo quy định − LS đề xuất) × Số ngày / 365 (Actual/365).'}
      </p>
    </body>
    </html>
  `;
}
