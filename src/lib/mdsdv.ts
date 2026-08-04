import rawData from '../data/mdsdv.json';

export interface MdsdvSectorRaw {
  c1: string;
  n1: string;
  c2: string | null;
  n2: string | null;
  c3: string | null;
  n3: string | null;
  c4: string | null;
  n4: string | null;
  c5: string;
  n5: string;
  g: number;
}

export interface MdsdvDataset {
  version: string;
  sectors: MdsdvSectorRaw[];
  purposeGroups: string[][][];
  overdraftCodes: string[];
}

const data = rawData as unknown as MdsdvDataset;

export interface MdsdvEntry {
  code: string;
  fbeName: string;
  detailCode: string;
  purposeName: string;
  level1Code: string;
  level1Name: string;
  level2Code: string | null;
  level2Name: string | null;
  level3Code: string | null;
  level3Name: string | null;
  level4Code: string | null;
  level4Name: string | null;
  level5Code: string;
  level5Name: string;
  allowsOverdraft: boolean;
}

export const MDSDV_VERSION = data.version;

const overdraftCodeSet = new Set(data.overdraftCodes);

export function normalizeVi(value?: string | null): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function buildEntry(sector: MdsdvSectorRaw, detailCode: string, purposeName: string): MdsdvEntry {
  const code = sector.c5 + detailCode;
  return {
    code,
    fbeName: `${code.slice(-8)}-${purposeName}`,
    detailCode,
    purposeName,
    level1Code: sector.c1,
    level1Name: sector.n1,
    level2Code: sector.c2,
    level2Name: sector.n2,
    level3Code: sector.c3,
    level3Name: sector.n3,
    level4Code: sector.c4,
    level4Name: sector.n4,
    level5Code: sector.c5,
    level5Name: sector.n5,
    allowsOverdraft: overdraftCodeSet.has(code),
  };
}

interface SectorIndex {
  sector: MdsdvSectorRaw;
  haystack: string;
}

let sectorIndexCache: SectorIndex[] | null = null;

function getSectorIndex(): SectorIndex[] {
  if (sectorIndexCache) return sectorIndexCache;
  sectorIndexCache = data.sectors.map(sector => ({
    sector,
    haystack: normalizeVi([
      sector.c1, sector.n1,
      sector.c2, sector.n2,
      sector.c3, sector.n3,
      sector.c4, sector.n4,
      sector.c5, sector.n5,
    ].filter(Boolean).join(' ')),
  }));
  return sectorIndexCache;
}

let purposeGroupIndexCache: string[][] | null = null;

function getPurposeGroupIndex(): string[][] {
  if (purposeGroupIndexCache) return purposeGroupIndexCache;
  purposeGroupIndexCache = data.purposeGroups.map(group =>
    group.map(([detailCode, purposeName]) => normalizeVi(`${detailCode} ${purposeName}`))
  );
  return purposeGroupIndexCache;
}

export interface MdsdvSectorOption {
  code: string;
  name: string;
}

let level1OptionsCache: MdsdvSectorOption[] | null = null;

export function getLevel1Options(): MdsdvSectorOption[] {
  if (level1OptionsCache) return level1OptionsCache;
  const seen = new Map<string, string>();
  for (const sector of data.sectors) {
    if (!seen.has(sector.c1)) seen.set(sector.c1, sector.n1);
  }
  level1OptionsCache = Array.from(seen, ([code, name]) => ({ code, name }));
  return level1OptionsCache;
}

export function countMdsdvEntries(): number {
  return data.sectors.reduce((sum, s) => sum + data.purposeGroups[s.g].length, 0);
}

export interface MdsdvSearchOptions {
  query?: string;
  level1Code?: string;
  overdraftOnly?: boolean;
  limit?: number;
}

export interface MdsdvSearchResult {
  items: MdsdvEntry[];
  total: number;
  truncated: boolean;
}

export function searchMdsdv(options: MdsdvSearchOptions = {}): MdsdvSearchResult {
  const limit = options.limit === undefined || options.limit === null || isNaN(options.limit)
    ? 200
    : Math.max(0, Math.trunc(options.limit));
  const terms = normalizeVi(options.query).split(' ').filter(Boolean);
  const level1Code = options.level1Code || '';
  const overdraftOnly = options.overdraftOnly === true;

  const sectors = getSectorIndex();
  const purposeIndex = getPurposeGroupIndex();

  const items: MdsdvEntry[] = [];
  let total = 0;

  for (const { sector, haystack } of sectors) {
    if (level1Code && sector.c1 !== level1Code) continue;

    const group = data.purposeGroups[sector.g];
    const groupHaystacks = purposeIndex[sector.g];

    for (let i = 0; i < group.length; i++) {
      const detailCode = group[i][0];
      const purposeName = group[i][1];
      const code = sector.c5 + detailCode;

      if (overdraftOnly && !overdraftCodeSet.has(code)) continue;

      if (terms.length > 0) {
        const rowHaystack = `${haystack} ${normalizeVi(code)} ${groupHaystacks[i]}`;
        let matchesAll = true;
        for (const term of terms) {
          if (!rowHaystack.includes(term)) { matchesAll = false; break; }
        }
        if (!matchesAll) continue;
      }

      total += 1;
      if (items.length < limit) {
        items.push(buildEntry(sector, detailCode, purposeName));
      }
    }
  }

  return { items, total, truncated: total > items.length };
}

export function findMdsdvByCode(code?: string | null): MdsdvEntry | null {
  const target = (code || '').trim().toUpperCase();
  if (!target) return null;

  for (const sector of data.sectors) {
    if (!target.startsWith(sector.c5)) continue;
    const detailCode = target.slice(sector.c5.length);
    const group = data.purposeGroups[sector.g];
    for (const [candidateDetail, purposeName] of group) {
      if (candidateDetail === detailCode) {
        return buildEntry(sector, candidateDetail, purposeName);
      }
    }
  }
  return null;
}
