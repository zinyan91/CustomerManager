import { CARD_FEE_PROFILES, type CardFeeProfile, COMMON_FEE_NOTE } from './cardFeeProfiles';

const STORAGE_KEY = 'customer_manager_card_fee_profiles_v1';
const NOTE_KEY = 'customer_manager_card_fee_common_note_v1';

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {}
  return null;
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {}
}

function removeStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
}

export function loadCardFeeProfiles(): CardFeeProfile[] {
  try {
    const raw = getStorageItem(STORAGE_KEY);
    if (!raw) return CARD_FEE_PROFILES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : CARD_FEE_PROFILES;
  } catch {
    return CARD_FEE_PROFILES;
  }
}

export function saveCardFeeProfiles(items: CardFeeProfile[]): void {
  setStorageItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadCommonFeeNote(): string {
  try {
    const raw = getStorageItem(NOTE_KEY);
    return raw !== null ? raw : COMMON_FEE_NOTE;
  } catch {
    return COMMON_FEE_NOTE;
  }
}

export function saveCommonFeeNote(note: string): void {
  setStorageItem(NOTE_KEY, note);
}

export function addCardFeeProfile(item: Omit<CardFeeProfile, 'id'>): CardFeeProfile[] {
  const current = loadCardFeeProfiles();
  const newProfile: CardFeeProfile = {
    ...item,
    id: `fee-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const updated = [...current, newProfile];
  saveCardFeeProfiles(updated);
  return updated;
}

export function updateCardFeeProfile(id: string, patch: Partial<CardFeeProfile>): CardFeeProfile[] {
  const current = loadCardFeeProfiles();
  const updated = current.map(p => (p.id === id ? { ...p, ...patch } : p));
  saveCardFeeProfiles(updated);
  return updated;
}

export function deleteCardFeeProfile(id: string): CardFeeProfile[] {
  const current = loadCardFeeProfiles();
  const updated = current.filter(p => p.id !== id);
  saveCardFeeProfiles(updated);
  return updated;
}

export function resetCardFeeProfiles(): { profiles: CardFeeProfile[]; note: string } {
  removeStorageItem(STORAGE_KEY);
  removeStorageItem(NOTE_KEY);
  return {
    profiles: CARD_FEE_PROFILES,
    note: COMMON_FEE_NOTE,
  };
}
