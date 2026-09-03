import React from 'react';
import { Download, Printer } from 'lucide-react';
import type { UiClasses } from '../../lib/uiClasses';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { downloadBytes } from '../../lib/xlsExport';
import { htmlToDocx, MIME_DOCX } from '../../lib/docxWriter';
import { Toast, useToast } from '../Toast';

function exportToWordDocx(filename: string, docHtml: string) {
  downloadBytes(htmlToDocx(docHtml), `${filename}.docx`, MIME_DOCX);
}

function exportToPDFOnly(filename: string, docHtml: string): boolean {
  const pdfHtml = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <title>${filename}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 20mm 15mm 20mm 25mm; /* Chuẩn văn bản: Trên 20mm, Dưới 20mm, Phải 15mm, Trái 25mm */
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 13pt;
          line-height: 1.3;
          color: #000000;
          margin: 0;
          padding: 0;
          background: #ffffff;
          text-align: justify;
        }
        h1 { 
          text-align: center; 
          font-size: 15pt; 
          font-weight: bold; 
          text-transform: uppercase; 
          margin-top: 10pt; 
          margin-bottom: 8pt; 
          page-break-after: avoid;
        }
        h2 { 
          text-align: left; 
          font-size: 13pt; 
          font-weight: bold; 
          text-transform: uppercase; 
          margin-top: 10pt; 
          margin-bottom: 4pt; 
          page-break-after: avoid;
        }
        h3 {
          font-size: 13pt;
          font-weight: bold;
          margin-top: 8pt;
          margin-bottom: 4pt;
          page-break-after: avoid;
        }
        p {
          margin-top: 2pt;
          margin-bottom: 3.5pt;
          text-align: justify;
          line-height: 1.3;
        }
        p.clause-p { 
          margin-top: 2pt; 
          margin-bottom: 3.5pt; 
          text-align: justify; 
          text-indent: 0; 
          line-height: 1.3; 
        }
        .no-indent,
        p.no-indent,
        p.clause-p.no-indent,
        div.no-indent {
          text-indent: 0 !important;
        }
        p.item-p { 
          text-indent: 0; 
          margin: 2pt 0; 
          text-align: justify; 
          line-height: 1.3; 
        }
        .text-center, .text-center p, .text-center div { text-align: center !important; }
        .text-right, p.text-right, p.clause-p.text-right, div.text-right { text-align: right !important; text-indent: 0 !important; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .italic { font-style: italic; }
        .table-doc { 
          border-collapse: collapse; 
          width: 100%; 
          margin-top: 8pt; 
          margin-bottom: 8pt; 
          page-break-inside: auto;
        }
        .table-doc th, .table-doc td { 
          border: 1px solid #000; 
          padding: 5pt 7pt; 
          font-size: 12pt; 
        }
        .table-doc tr {
          page-break-inside: avoid;
        }
        .sig-table { 
          width: 100% !important; 
          table-layout: fixed !important;
          margin-top: 20pt; 
          border-collapse: collapse; 
          border: none; 
          page-break-inside: avoid;
        }
        .sig-table td { 
          text-align: center; 
          vertical-align: top; 
          border: none; 
          padding: 0; 
          line-height: 1.25; 
        }
        .sig-space { height: 90px; line-height: 1.25; }

        .bm04-sheet {
          page-break-before: always;
          font-family: 'Arial Unicode MS', 'Arial', sans-serif;
          font-size: 10pt;
          line-height: 1.25;
        }
        .bm04-sheet p { margin: 0 0 3pt 0; text-indent: 0; text-align: justify; line-height: 1.25; }
        .bm04-name { }
        .bm04-fill { }
        .bm04-fill .doc-tab {
          display: inline-block;
          min-width: 40pt;
          border-bottom: 1px dotted #000;
          margin: 0 4pt;
        }
        .bm04-bullet { padding-left: 36pt; text-indent: -18pt; }
        .bm04-bullet::before { content: '-'; padding-right: 9pt; }
        .bm04-sig {
          width: 100%;
          margin-top: 12pt;
          border-collapse: collapse;
          border: none;
          page-break-inside: avoid;
        }
        .bm04-sig td {
          width: 50%;
          vertical-align: top;
          border: none;
          padding: 0;
        }
        .bm04-footer {
          border-top: 1px solid #000000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20pt;
          padding-top: 4pt;
          font-size: 9.5pt;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      ${docHtml}
    </body>
    </html>
  `;

  return printHtmlDoc(pdfHtml, filename);
}

export interface DocumentAttachment {
  title: string;
  filename: string;
  html: string;
}

interface DocumentPreviewProps {
  styles: UiClasses;
  docTitle: string;
  docFilename: string;
  docHtml: string;
  attachment?: DocumentAttachment;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  styles: _styles,
  docTitle,
  docFilename,
  docHtml,
  attachment,
}) => {
  const { toast, show, dismiss } = useToast();

  return (
    <div className="flex flex-col h-full overflow-hidden font-app">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className="p-3.5 sm:p-4 border-b border-line/60 bg-surface/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-ink-faint tracking-wider block mb-0.5">XEM TRƯỚC VĂN BẢN</span>
          <h2 className="font-bold text-sm sm:text-base text-accent tracking-tight">{docTitle}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportToWordDocx(docFilename, docHtml)}
            className="flex items-center space-x-1.5 bg-accent hover:opacity-90 text-accent-ink font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-md shadow-accent/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải Word (.docx)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!exportToPDFOnly(docFilename, docHtml)) {
                show('error', 'Không mở được bản in. Tải lại trang rồi thử lại.');
              }
            }}
            className="flex items-center space-x-1.5 bg-neg hover:opacity-90 text-accent-ink font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>In / Xuất PDF</span>
          </button>
          {attachment && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-line/60">
              <span className="text-ink-faint text-[10px] uppercase font-bold tracking-wider mr-1">Kèm:</span>
              <button
                type="button"
                onClick={() => exportToWordDocx(attachment.filename, attachment.html)}
                className="flex items-center space-x-1.5 bg-surface border border-accent/60 text-accent font-bold text-xs px-3 py-2 rounded-xl transition-all hover:bg-accent-soft shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{attachment.title} (.docx)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!exportToPDFOnly(attachment.filename, attachment.html)) {
                    show('error', 'Không mở được bản in. Tải lại trang rồi thử lại.');
                  }
                }}
                className="flex items-center space-x-1.5 bg-surface border border-line/70 text-ink-muted font-bold text-xs px-3 py-2 rounded-xl transition-all hover:border-accent hover:text-accent shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-surface/30 p-0 sm:p-2.5 flex justify-center">

        <style>{`
          .a4-sheet-container {
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 13pt !important;
            line-height: 1.3 !important;
            color: #000000 !important;
            background-color: #ffffff !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 297mm;
            padding: 20px 16px !important;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1) !important;
            box-sizing: border-box;
          }
          @media (min-width: 640px) {
            .a4-sheet-container {
              padding: 20mm 15mm 20mm 25mm !important;
            }
          }
          .a4-sheet-container h1 {
            text-align: center !important;
            font-size: 15pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            margin-top: 10pt !important;
            margin-bottom: 8pt !important;
            line-height: 1.3 !important;
            letter-spacing: normal !important;
          }
          .a4-sheet-container h2 {
            font-size: 13pt !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            margin-top: 10pt !important;
            margin-bottom: 4pt !important;
            text-align: left !important;
          }
          .a4-sheet-container p {
            margin-top: 2pt !important;
            margin-bottom: 3.5pt !important;
            text-align: justify !important;
            line-height: 1.3 !important;
          }
          .a4-sheet-container p.item-p {
            text-indent: 0 !important;
            margin: 2pt 0 !important;
            text-align: justify !important;
            line-height: 1.3 !important;
          }
          .a4-sheet-container p.clause-p {
            margin-top: 2pt !important;
            margin-bottom: 3.5pt !important;
            text-align: justify !important;
            text-indent: 0 !important;
            line-height: 1.3 !important;
          }
          .a4-sheet-container .bm04-sheet {
            font-family: 'Arial Unicode MS', 'Arial', sans-serif !important;
            font-size: 10pt !important;
            line-height: 1.25 !important;
          }
          .a4-sheet-container .bm04-sheet p {
            margin: 0 0 3pt 0 !important;
            text-indent: 0 !important;
            line-height: 1.25 !important;
          }
          .a4-sheet-container .bm04-footer {
            border-top: 1px solid #000000;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20pt;
            padding-top: 4pt;
            font-size: 9.5pt;
            font-style: italic;
          }
          .a4-sheet-container .no-indent,
          .a4-sheet-container p.no-indent,
          .a4-sheet-container p.clause-p.no-indent,
          .a4-sheet-container div.no-indent {
            text-indent: 0 !important;
          }
          .a4-sheet-container .text-center,
          .a4-sheet-container .text-center p,
          .a4-sheet-container .text-center div {
            text-align: center !important;
          }
          .a4-sheet-container .text-right,
          .a4-sheet-container p.text-right,
          .a4-sheet-container p.clause-p.text-right,
          .a4-sheet-container div.text-right {
            text-align: right !important;
            text-indent: 0 !important;
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
            margin-top: 8pt !important;
            margin-bottom: 8pt !important;
          }
          .a4-sheet-container .table-doc th,
          .a4-sheet-container .table-doc td {
            border: 1px solid #000000 !important;
            padding: 5pt 7pt !important;
            font-size: 12pt !important;
          }
          .a4-sheet-container .sig-table {
            width: 100% !important;
            table-layout: fixed !important;
            margin-top: 20pt !important;
            border-collapse: collapse !important;
            border: none !important;
          }
          .a4-sheet-container .sig-space {
            height: 90px !important;
            line-height: 1.25 !important;
          }
          .a4-sheet-container .sig-table td {
            line-height: 1.25 !important;
            text-align: center !important;
            vertical-align: top !important;
            border: none !important;
            padding: 4px 6px !important;
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
