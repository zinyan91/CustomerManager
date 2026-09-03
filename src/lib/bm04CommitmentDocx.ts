import { XML_DECL } from './ooxml';

export const BM04_FONT = 'Arial Unicode MS';
export const BM04_SIZE = 20;
export const BM04_TITLE_SIZE = 28;

const BM04_PAGE_W = 11906;
const BM04_PAGE_H = 16838;
const BM04_MARGIN = 1440;

export const BM04_LOGO_CX = 1511935;
export const BM04_LOGO_CY = 349885;

export const BM04_FOOTER_TEXT = 'BM08_........./2026/QĐ-TGĐ_Giấy cam kết';
export const BM08_FOOTER_TEXT = BM04_FOOTER_TEXT;

const WML = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

export function bm04SectPr(headerRelId: string, footerRelId: string): string {
  return '<w:sectPr>'
    + `<w:headerReference w:type="default" r:id="${headerRelId}"/>`
    + `<w:footerReference w:type="default" r:id="${footerRelId}"/>`
    + `<w:pgSz w:w="${BM04_PAGE_W}" w:h="${BM04_PAGE_H}"/>`
    + `<w:pgMar w:top="${BM04_MARGIN}" w:right="${BM04_MARGIN}"`
    + ` w:bottom="${BM04_MARGIN}" w:left="${BM04_MARGIN}"`
    + ' w:header="720" w:footer="720" w:gutter="0"/>'
    + '</w:sectPr>';
}

export function bm04HeaderXml(imageRelId: string): string {
  const drawing = '<w:drawing>'
    + `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">`
    + `<wp:extent cx="${BM04_LOGO_CX}" cy="${BM04_LOGO_CY}"/>`
    + '<wp:docPr id="3" name="Picture 3"/>'
    + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
    + '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    + '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    + '<pic:nvPicPr><pic:cNvPr id="0" name="Picture 3"/><pic:cNvPicPr/></pic:nvPicPr>'
    + `<pic:blipFill><a:blip r:embed="${imageRelId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
    + '<pic:spPr>'
    + `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${BM04_LOGO_CX}" cy="${BM04_LOGO_CY}"/></a:xfrm>`
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
    + '</pic:spPr>'
    + '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';

  return XML_DECL
    + `<w:hdr xmlns:w="${WML}" xmlns:r="${REL_NS}">`
    + '<w:p><w:pPr><w:jc w:val="right"/></w:pPr>'
    + `<w:r>${drawing}</w:r>`
    + '</w:p>'
    + '</w:hdr>';
}

function bm04Run(text: string, italic: boolean): string {
  return '<w:r><w:rPr>'
    + `<w:rFonts w:ascii="${BM04_FONT}" w:eastAsia="${BM04_FONT}" w:hAnsi="${BM04_FONT}" w:cs="${BM04_FONT}"/>`
    + (italic ? '<w:i/>' : '')
    + `<w:sz w:val="${BM04_SIZE}"/><w:szCs w:val="${BM04_SIZE}"/>`
    + `</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r>`;
}

function pageField(instr: string): string {
  return '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    + `<w:r><w:instrText xml:space="preserve">${instr}</w:instrText></w:r>`
    + '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    + bm04Run('1', false)
    + '<w:r><w:fldChar w:fldCharType="end"/></w:r>';
}

export function bm04FooterXml(): string {
  const pPr = '<w:pPr>'
    + '<w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr>'
    + '<w:tabs><w:tab w:val="right" w:pos="10206"/></w:tabs>'
    + `<w:rPr><w:rFonts w:ascii="${BM04_FONT}" w:eastAsia="${BM04_FONT}" w:hAnsi="${BM04_FONT}" w:cs="${BM04_FONT}"/>`
    + `<w:sz w:val="${BM04_SIZE}"/></w:rPr>`
    + '</w:pPr>';

  return XML_DECL
    + `<w:ftr xmlns:w="${WML}" xmlns:r="${REL_NS}">`
    + '<w:p>' + pPr
    + bm04Run(BM04_FOOTER_TEXT, true)
    + '<w:r><w:tab/></w:r>'
    + bm04Run('Trang ', false)
    + pageField(' PAGE   \\* MERGEFORMAT ')
    + bm04Run('/', false)
    + pageField(' NUMPAGES   \\* MERGEFORMAT ')
    + '</w:p>'
    + '</w:ftr>';
}
