import { XML_DECL } from './ooxml';

export const PPTX_FONT = 'Times New Roman';

const A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';

const CLR_SCHEME_COLORS: [string, string][] = [
  ['dk1', '000000'],
  ['lt1', 'FFFFFF'],
  ['dk2', '1F3864'],
  ['lt2', 'EEECE1'],
  ['accent1', '2E5C8A'],
  ['accent2', '8EA9DB'],
  ['accent3', 'A5A5A5'],
  ['accent4', 'DCE6F1'],
  ['accent5', '4472C4'],
  ['accent6', '70AD47'],
  ['hlink', '0563C1'],
  ['folHlink', '954F72'],
];

const clrScheme = '<a:clrScheme name="Office">'
  + CLR_SCHEME_COLORS.map(([name, hex]) => (
    name === 'dk1' || name === 'lt1'
      ? `<a:${name}><a:sysClr val="${name === 'dk1' ? 'windowText' : 'window'}" lastClr="${hex}"/></a:${name}>`
      : `<a:${name}><a:srgbClr val="${hex}"/></a:${name}>`
  )).join('')
  + '</a:clrScheme>';

const fontScheme = '<a:fontScheme name="Office">'
  + `<a:majorFont><a:latin typeface="${PPTX_FONT}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>`
  + `<a:minorFont><a:latin typeface="${PPTX_FONT}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>`
  + '</a:fontScheme>';

const solidFill = '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>';

const fmtScheme = '<a:fmtScheme name="Office">'
  + `<a:fillStyleLst>${solidFill}${solidFill}${solidFill}</a:fillStyleLst>`
  + '<a:lnStyleLst>'
  + `<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr">${solidFill}<a:prstDash val="solid"/></a:ln>`
  + `<a:ln w="15875" cap="flat" cmpd="sng" algn="ctr">${solidFill}<a:prstDash val="solid"/></a:ln>`
  + `<a:ln w="25400" cap="flat" cmpd="sng" algn="ctr">${solidFill}<a:prstDash val="solid"/></a:ln>`
  + '</a:lnStyleLst>'
  + '<a:effectStyleLst>'
  + '<a:effectStyle><a:effectLst/></a:effectStyle>'
  + '<a:effectStyle><a:effectLst/></a:effectStyle>'
  + '<a:effectStyle><a:effectLst/></a:effectStyle>'
  + '</a:effectStyleLst>'
  + `<a:bgFillStyleLst>${solidFill}${solidFill}${solidFill}</a:bgFillStyleLst>`
  + '</a:fmtScheme>';

export const THEME_XML = XML_DECL
  + `<a:theme ${A} name="Vietbank">`
  + `<a:themeElements>${clrScheme}${fontScheme}${fmtScheme}</a:themeElements>`
  + '<a:objectDefaults/><a:extraClrSchemeLst/>'
  + '</a:theme>';

const P = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
  + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
  + ' xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

const EMPTY_SP_TREE = '<p:spTree>'
  + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
  + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
  + '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
  + '</p:spTree>';

export const SLIDE_MASTER_XML = XML_DECL
  + `<p:sldMaster ${P}>`
  + `<p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="lt1"/></a:solidFill>`
  + '<a:effectLst/></p:bgPr></p:bg>'
  + EMPTY_SP_TREE
  + '</p:cSld>'
  + '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2"'
  + ' accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6"'
  + ' hlink="hlink" folHlink="folHlink"/>'
  + '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>'
  + '</p:sldMaster>';

export const SLIDE_LAYOUT_XML = XML_DECL
  + `<p:sldLayout ${P} type="blank" preserve="1">`
  + `<p:cSld name="Trắng">${EMPTY_SP_TREE}</p:cSld>`
  + '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>'
  + '</p:sldLayout>';
