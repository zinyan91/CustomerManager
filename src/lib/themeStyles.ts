export interface ThemeStyles {
  containerCardBg: string;
  sectionBoxBg: string;
  inputStyle: string;
  readonlyInputStyle: string;
  tableHeaderStyle: string;
  tableRowHover: string;
  labelStyle: string;
}

export function getThemeStyles(isLight: boolean): ThemeStyles {
  return {
    containerCardBg: isLight
      ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
      : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl',
    sectionBoxBg: isLight
      ? 'bg-slate-50/80 border-slate-200 text-slate-900'
      : 'bg-slate-950 border-slate-800 text-slate-100',
    inputStyle: isLight
      ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20'
      : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-sky-500',
    readonlyInputStyle: isLight
      ? 'bg-slate-100 border-slate-200 text-slate-800 font-bold cursor-default'
      : 'bg-slate-900 border-slate-800 text-slate-100 font-bold cursor-default',
    tableHeaderStyle: isLight
      ? 'bg-slate-100 text-slate-700 border-slate-200 font-bold'
      : 'bg-slate-950 text-slate-400 border-slate-800 font-bold',
    tableRowHover: isLight ? 'hover:bg-sky-50/50' : 'hover:bg-slate-800/30',
    labelStyle: isLight ? 'text-slate-700 font-medium' : 'text-slate-400 font-medium',
  };
}
