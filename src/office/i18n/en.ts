import { calcEn } from './calcEn';
import { ribbonEn } from './ribbonEn';
import { writerEn } from './writerEn';
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
    sharedTitle: 'Shared documents',
    sharedEmpty: 'No shared documents yet.',
    sharedBy: (name: string) => (name ? `by ${name}` : ''),
    document: 'Documents',
    documentNew: 'Blank document',
    documentOpen: 'Open a document',
    documentOpenHint: 'DOCX, TXT or HTML from this device',
    spreadsheetOpenHint: 'XLSX or CSV from this computer',
    recent: 'Recent',
    noRecent: 'No documents yet.',
    open: 'Open',
    delete: 'Delete draft',
    confirmDelete: (name: string) => `Delete the draft "${name}"? This cannot be undone.`,
    updated: (when: string) => `Edited ${when}`,
    draftsNote: 'Drafts live in this browser and are not tied to your account.',
  },
  writer: writerEn,
};
