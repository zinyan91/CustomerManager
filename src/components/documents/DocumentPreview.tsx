import React from 'react';
import { Download, Printer } from 'lucide-react';
import type { ThemeStyles } from '../../lib/themeStyles';

function exportToWordDoc(filename: string, docHtml: string) {
  const wordDocumentHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 210mm 297mm;
          margin: 25mm 20mm 20mm 30mm;
        }
        div.WordSection1 { page: WordSection1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; }
        h1 { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-top: 14pt; margin-bottom: 12pt; }
        h2 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 10pt; margin-bottom: 10pt; }
        p.clause-p { margin-top: 3pt; margin-bottom: 6pt; text-align: justify; text-indent: 1.27cm; line-height: 1.5; }
        .no-indent { text-indent: 0 !important; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .table-doc { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
        .table-doc th, .table-doc td { border: 1px solid #000; padding: 6pt 8pt; font-size: 12pt; }
        .sig-table { width: 100%; margin-top: 30pt; border-collapse: collapse; border: none; }
        .sig-table td { width: 50%; text-align: center; vertical-align: top; border: none; padding: 0; }
      </style>
    </head>
    <body>
      <div class="WordSection1">
        ${docHtml}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([wordDocumentHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToPDFOnly(filename: string, docHtml: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${filename}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 25mm 20mm 20mm 30mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 13pt;
          line-height: 1.5;
          color: #000000;
          margin: 0;
          padding: 0;
        }
        h1 { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-top: 14pt; margin-bottom: 12pt; }
        h2 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 10pt; margin-bottom: 10pt; }
        p.clause-p { margin-top: 3pt; margin-bottom: 6pt; text-align: justify; text-indent: 1.27cm; line-height: 1.5; }
        .no-indent { text-indent: 0 !important; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .table-doc { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
        .table-doc th, .table-doc td { border: 1px solid #000; padding: 6pt 8pt; font-size: 12pt; }
        .sig-table { width: 100%; margin-top: 30pt; border-collapse: collapse; border: none; }
        .sig-table td { width: 50%; text-align: center; vertical-align: top; border: none; padding: 0; }
      </style>
    </head>
    <body>
      ${docHtml}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(pdfHtml);
  printWindow.document.close();
}

interface DocumentPreviewProps {
  styles: ThemeStyles;
  isLight: boolean;
  docTitle: string;
  docFilename: string;
  docHtml: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  styles,
  isLight,
  docTitle,
  docFilename,
  docHtml,
}) => {
  return (
    <div className={`${styles.containerCardBg} rounded-2xl border overflow-hidden shadow-xl`}>
      {/* Header Toolbar */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
        <div>
          <h2 className="font-bold text-sm text-sky-600 dark:text-sky-400 uppercase tracking-wider">{docTitle}</h2>
          <span className="text-[11px] text-slate-500">Chuẩn lề Nghị định 30/2020/NĐ-CP (Times New Roman 13pt)</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => exportToWordDoc(docFilename, docHtml)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Tải Word (.doc)</span>
          </button>
          <button
            type="button"
            onClick={() => exportToPDFOnly(docFilename, docHtml)}
            className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Preview Sheet Container (A4 Page simulation) */}
      <div className="p-8 overflow-x-auto bg-slate-200/60 dark:bg-slate-950/80 flex justify-center">
        <div
          className="bg-white text-black p-10 rounded-sm shadow-2xl min-w-[210mm] max-w-[210mm] min-h-[297mm] font-serif leading-relaxed"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
          dangerouslySetInnerHTML={{ __html: docHtml }}
        />
      </div>
    </div>
  );
};
