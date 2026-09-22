export const VHTT_STYLES = `
<style>
  .vhtt-doc {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 11pt !important;
    line-height: 1.25 !important;
    color: #000000 !important;
    display: flex !important;
    flex-direction: column !important;
    min-height: calc(297mm - 32mm) !important;
    box-sizing: border-box !important;
  }
  .vhtt-doc p {
    margin: 1.5pt 0 !important;
    text-align: justify !important;
    line-height: 1.25 !important;
  }
  .vhtt-doc p.empty-p {
    min-height: 0.4em !important;
    margin: 0.5pt 0 !important;
  }
  .vhtt-doc .p-center, .vhtt-doc p.p-center { text-align: center !important; }
  .vhtt-doc .p-right, .vhtt-doc p.p-right { text-align: right !important; }
  .vhtt-doc .p-left, .vhtt-doc p.p-left { text-align: left !important; }
  .vhtt-doc .p-justify, .vhtt-doc p.p-justify { text-align: justify !important; }
  
  .vhtt-doc h1 {
    font-size: 13pt !important;
    font-weight: bold !important;
    text-transform: uppercase !important;
    text-align: center !important;
    margin-top: 4pt !important;
    margin-bottom: 4pt !important;
    line-height: 1.25 !important;
  }

  .vhtt-doc table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 3pt 0 !important;
  }
  .vhtt-doc table.table-bordered th,
  .vhtt-doc table.table-bordered td {
    border: 1px solid #000000 !important;
    padding: 2.5pt 4pt !important;
    font-size: 10pt !important;
    vertical-align: top !important;
  }
  .vhtt-doc table.table-borderless th,
  .vhtt-doc table.table-borderless td {
    border: none !important;
    padding: 1.5pt 3pt !important;
    vertical-align: top !important;
  }
  
  .vhtt-doc table.table-approval {
    width: 100% !important;
    border-collapse: collapse !important;
    border: 1.5pt solid #000000 !important;
    margin: 6pt 0 8pt 0 !important;
    page-break-inside: avoid !important;
  }
  .vhtt-doc table.table-approval th,
  .vhtt-doc table.table-approval td {
    font-size: 10pt !important;
    vertical-align: top !important;
    padding: 3pt 4pt !important;
  }
  
  .vhtt-doc .sig-table {
    margin-top: 8pt !important;
    page-break-inside: avoid !important;
  }

  .vhtt-doc .vhtt-footer,
  .vhtt-doc table.vhtt-footer-table,
  table.vhtt-footer-table {
    margin-top: auto !important;
    border-top: 0.5pt solid #000000 !important;
    padding-top: 2.5pt !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    font-size: 8.5pt !important;
    font-style: italic !important;
    line-height: 1.2 !important;
    page-break-inside: avoid !important;
    page-break-before: avoid !important;
    width: 100% !important;
  }
  .vhtt-doc table.vhtt-footer-table td,
  table.vhtt-footer-table td {
    padding: 2pt 0 !important;
    border: none !important;
  }

  .vhtt-doc .doc-footnotes {
    margin-top: 10pt !important;
    font-size: 8.5pt !important;
    line-height: 1.2 !important;
    font-style: italic !important;
    color: #222222 !important;
  }
  .vhtt-doc .footnote-separator {
    width: 25% !important;
    text-align: left !important;
    margin: 6pt 0 3pt 0 !important;
    border: none !important;
    border-top: 1px solid #000000 !important;
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 18mm 20mm !important;
    }
    .vhtt-doc {
      font-size: 11pt !important;
      line-height: 1.25 !important;
      display: block !important;
      min-height: 0 !important;
    }
    .vhtt-doc .vhtt-footer,
    .vhtt-doc table.vhtt-footer-table {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      margin-top: 0 !important;
      background: #ffffff !important;
    }
  }
</style>
`;
