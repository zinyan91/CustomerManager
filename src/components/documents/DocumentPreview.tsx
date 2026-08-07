import React from 'react';
import { Download, Printer } from 'lucide-react';
import type { UiClasses } from '../../lib/uiClasses';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { downloadTextFile, MIME_DOC } from '../../lib/xlsExport';
import { Toast, useToast } from '../Toast';

function exportToWordDoc(filename: string, docHtml: string) {
  const wordDocumentHtml = `
    <html xmlns:v="urn:schemas-microsoft-com:vml"
          xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
          <w:ValidateAgainstSchemas/>
          <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
          <w:IgnoreMixedContent>false</w:IgnoreMixedContent>
          <w:AlwaysShowPlaceholderText>false</w:AlwaysShowPlaceholderText>
          <w:Compatibility>
            <w:BreakWrappedTables/>
            <w:SnapToGridInCell/>
            <w:WrapTextWithPunct/>
            <w:UseAsianBreakRules/>
            <w:UseWord2010TableStyleRules/>
          </w:Compatibility>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: 210mm 297mm;
          margin: 25mm 20mm 20mm 30mm;
          mso-header-margin: 36.0pt;
          mso-footer-margin: 36.0pt;
          mso-paper-source: 0;
        }
        @page WordSection1 {
          size: 210mm 297mm;
          margin: 25mm 20mm 20mm 30mm;
        }
        div.WordSection1 { page: WordSection1; }
        body, p, td, th, div, span {
          font-family: 'Times New Roman', Times, serif !important;
          font-size: 13.0pt;
          line-height: 1.35;
          color: #000000;
        }
        h1 {
          text-align: center !important;
          font-size: 16.0pt !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          margin-top: 14.0pt !important;
          margin-bottom: 12.0pt !important;
          font-family: 'Times New Roman', Times, serif !important;
        }
        h2 {
          font-size: 13.0pt !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          margin-top: 12.0pt !important;
          margin-bottom: 6.0pt !important;
          text-align: left !important;
          font-family: 'Times New Roman', Times, serif !important;
        }
        p {
          margin-top: 3.0pt;
          margin-bottom: 6.0pt;
          line-height: 1.35;
        }
        p.clause-p {
          margin-top: 4.0pt !important;
          margin-bottom: 6.0pt !important;
          text-align: justify !important;
          text-indent: 36.0pt !important;
          line-height: 1.35 !important;
        }
        .no-indent { text-indent: 0pt !important; }
        p.item-p {
          text-indent: 0pt !important;
          margin-top: 2.0pt !important;
          margin-bottom: 2.0pt !important;
          margin-left: 14.0pt !important;
          text-align: justify !important;
          line-height: 1.5 !important;
        }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .font-bold { font-weight: bold !important; }
        .font-italic { font-style: italic !important; }
        table {
          border-collapse: collapse !important;
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
        }
        table.table-doc {
          width: 100% !important;
          margin-top: 10.0pt !important;
          margin-bottom: 10.0pt !important;
          border-collapse: collapse !important;
        }
        table.table-doc th, table.table-doc td {
          border: 1.0pt solid #000000 !important;
          padding: 4.0pt 6.0pt !important;
          font-size: 11.0pt !important;
          vertical-align: middle !important;
        }
        table.sig-table {
          width: 100% !important;
          margin-top: 20.0pt !important;
          border-collapse: collapse !important;
          border: none !important;
        }
        div.sig-space {
          line-height: 1.25 !important;
          mso-line-height-rule: exactly;
        }
        table.sig-table td {
          line-height: 1.25 !important;
          width: 50% !important;
          text-align: center !important;
          vertical-align: top !important;
          border: none !important;
          padding: 4.0pt !important;
        }
      </style>
    </head>
    <body>
      <div class="WordSection1">
        ${docHtml}
      </div>
    </body>
    </html>
  `;

  downloadTextFile('\uFEFF' + wordDocumentHtml, `${filename}.doc`, MIME_DOC);
}

function exportToPDFOnly(filename: string, docHtml: string): boolean {
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
        h2 { text-align: left; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 6pt; }
        p.clause-p { margin-top: 3pt; margin-bottom: 6pt; text-align: justify; text-indent: 1.27cm; line-height: 1.5; }
        .no-indent { text-indent: 0 !important; }
        p.item-p { text-indent: 0; margin: 2pt 0 2pt 14pt; text-align: justify; line-height: 1.5; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .table-doc { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
        .table-doc th, .table-doc td { border: 1px solid #000; padding: 6pt 8pt; font-size: 12pt; }
        .sig-table { width: 100%; margin-top: 30pt; border-collapse: collapse; border: none; }
        .sig-table td { width: 50%; text-align: center; vertical-align: top; border: none; padding: 0; line-height: 1.25; }
        .sig-space { height: 100px; line-height: 1.25; }
      </style>
    </head>
    <body>
      ${docHtml}
    </body>
    </html>
  `;

  return printHtmlDoc(pdfHtml, filename);
}

interface DocumentPreviewProps {
  styles: UiClasses;
  docTitle: string;
  docFilename: string;
  docHtml: string;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  styles,
  docTitle,
  docFilename,
  docHtml,
}) => {
  const { toast, show, dismiss } = useToast();

  return (
    <div className={`${styles.containerCardBg} rounded-lg border overflow-hidden`}>
      <Toast toast={toast} onDismiss={dismiss} />

      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${'bg-panel-muted border-line'}`}>
        <div>
          <h2 className="font-bold text-sm text-accent tracking-tight">{docTitle}</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => exportToWordDoc(docFilename, docHtml)}
            className="flex items-center space-x-1.5 bg-accent hover:bg-accent text-accent-ink font-bold text-xs px-3.5 py-2 rounded-md transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Tải Word (.doc)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!exportToPDFOnly(docFilename, docHtml)) {
                show('error', 'Không mở được bản in. Tải lại trang rồi thử lại.');
              }
            }}
            className="flex items-center space-x-1.5 bg-neg hover:opacity-90 text-accent-ink font-bold text-xs px-3.5 py-2 rounded-md transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 overflow-x-auto bg-panel-muted flex justify-center">

        <style>{`
          .a4-sheet-container {
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 13pt !important;
            line-height: 1.5 !important;
            color: #000000 !important;
            background-color: #ffffff !important;
            width: 100%;
            max-width: 210mm;
            min-height: 297mm;
            padding: 16mm 14mm;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
            box-sizing: border-box;
          }
          .a4-sheet-container h1 {
            text-align: center !important;
            font-size: 15pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            margin-top: 14pt !important;
            margin-bottom: 12pt !important;
            line-height: 1.3 !important;
            letter-spacing: normal !important;
          }
          .a4-sheet-container h2 {
            font-size: 13pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            margin-top: 12pt !important;
            margin-bottom: 6pt !important;
            text-align: left !important;
          }
          .a4-sheet-container p {
            margin-top: 3pt !important;
            margin-bottom: 6pt !important;
            line-height: 1.5 !important;
          }
          .a4-sheet-container p.item-p {
            text-indent: 0 !important;
            margin: 2pt 0 2pt 14pt !important;
            text-align: justify !important;
            line-height: 1.5 !important;
          }
          .a4-sheet-container p.clause-p {
            margin-top: 4pt !important;
            margin-bottom: 6pt !important;
            text-align: justify !important;
            text-indent: 1.27cm !important;
            line-height: 1.5 !important;
          }
          .a4-sheet-container .no-indent {
            text-indent: 0 !important;
          }
          .a4-sheet-container .text-center {
            text-align: center !important;
          }
          .a4-sheet-container .text-right {
            text-align: right !important;
          }
          .a4-sheet-container .font-bold {
            font-weight: bold !important;
          }
          .a4-sheet-container .font-italic {
            font-style: italic !important;
          }
          .a4-sheet-container .table-doc {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 10pt !important;
            margin-bottom: 10pt !important;
          }
          .a4-sheet-container .table-doc th,
          .a4-sheet-container .table-doc td {
            border: 1px solid #000000 !important;
            padding: 6pt 8pt !important;
            font-size: 12pt !important;
          }
          .a4-sheet-container .sig-table {
            width: 100% !important;
            margin-top: 24pt !important;
            border-collapse: collapse !important;
            border: none !important;
          }
          .a4-sheet-container .sig-space {
            height: 100px !important;
            line-height: 1.25 !important;
          }
          .a4-sheet-container .sig-table td {
            line-height: 1.25 !important;
            width: 50% !important;
            text-align: center !important;
            vertical-align: top !important;
            border: none !important;
            padding: 4px !important;
          }
        `}</style>
        <div
          className="a4-sheet-container"
          dangerouslySetInnerHTML={{ __html: docHtml }}
        />
      </div>
    </div>
  );
};
