import { useLang } from '../../context/LanguageContext';
import { loadLang, type Lang } from '../../lib/i18n';
import { en } from './en';
import { vi, type OfficeMessages } from './vi';

export type { OfficeMessages };

const OFFICE_MESSAGES: Record<Lang, OfficeMessages> = { vi, en };

/** Từ điển hiện hành cho mã ngoài React (dịch vụ); không có trình duyệt thì tiếng Việt. */
export function officeMessages(): OfficeMessages {
  const lang = typeof localStorage === 'undefined' ? 'vi' : loadLang();
  return OFFICE_MESSAGES[lang];
}

export function useOfficeI18n(): { lang: Lang; m: OfficeMessages } {
  const { lang } = useLang();
  return { lang, m: OFFICE_MESSAGES[lang] };
}
