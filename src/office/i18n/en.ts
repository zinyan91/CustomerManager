import { calcEn } from './calcEn';
import { ribbonEn } from './ribbonEn';
import type { OfficeMessages } from './vi';

export const en: OfficeMessages = {
  calc: calcEn,
  ribbon: ribbonEn,
  app: {
    title: 'Reports',
    loading: 'Loading…',
    backToApp: 'Back to the app',
    home: 'Reports home',
  },
  home: {
    title: 'Reports',
    spreadsheet: 'Spreadsheet',
    spreadsheetNew: 'Blank spreadsheet',
    spreadsheetOpen: 'Open a spreadsheet',
    spreadsheetOpenHint: 'XLSX or CSV from this computer',
    recent: 'Recent',
    noRecent: 'No documents yet.',
    open: 'Open',
    delete: 'Delete draft',
    confirmDelete: (name: string) => `Delete the draft "${name}"? This cannot be undone.`,
    updated: (when: string) => `Edited ${when}`,
    draftsNote: 'Drafts live in this browser and are not tied to your account. Download a file to share it.',
  },
  writer: {
    saving: 'Saving…',
    saved: 'Draft saved',
    saveFailed: 'Could not save the draft in this browser',
    errors: {
      imageFailed: 'Could not read this image.',
      draftMissing: 'This draft was not found; it may have been deleted.',
    },
  },
};
