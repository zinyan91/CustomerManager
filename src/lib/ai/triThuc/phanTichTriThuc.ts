import { normalizeSearch } from '../../officialDoc/normalize';

export interface ChuDe {
  id: string;
  tieuDe: string;
  moTa: string;
  nhom: string;
  tuKhoa: string[];
  trang: string[];
  nguon: string[];
  noiDung: string;
}

export const GIOI_HAN_TEP = 3584;
export const GIOI_HAN_BAN_DO = 3072;

const TRUONG_BAT_BUOC = ['id', 'tieuDe', 'moTa', 'nhom'] as const;

function tachDanhSach(giaTri: string | undefined): string[] {
  const t = (giaTri ?? '').trim();
  const trong = t.startsWith('[') && t.endsWith(']') ? t.slice(1, -1) : t;
  return trong.split(',').map((s) => s.trim()).filter(Boolean);
}

export function docChuDe(raw: string, tenTep = 'tệp tri thức'): ChuDe {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${tenTep}: thiếu phần đầu --- ... ---`);
  const truong: Record<string, string> = {};
  for (const dong of m[1].split('\n')) {
    const i = dong.indexOf(':');
    if (i > 0) truong[dong.slice(0, i).trim()] = dong.slice(i + 1).trim();
  }
  for (const k of TRUONG_BAT_BUOC) {
    if (!truong[k]) throw new Error(`${tenTep}: thiếu trường ${k}`);
  }
  return {
    id: truong.id,
    tieuDe: truong.tieuDe,
    moTa: truong.moTa,
    nhom: truong.nhom,
    tuKhoa: tachDanhSach(truong.tuKhoa),
    trang: tachDanhSach(truong.trang),
    nguon: tachDanhSach(truong.nguon),
    noiDung: m[2].trim(),
  };
}

const tachTu = (s: string): string[] => s.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const tachTuBoDau = (s: string): string[] => tachTu(normalizeSearch(s));

function coDau(cauHoi: string): boolean {
  return tachTu(cauHoi).join(' ') !== tachTuBoDau(cauHoi).join(' ');
}

function chuaDay(tu: string[], cum: string[]): boolean {
  if (cum.length === 0 || cum.length > tu.length) return false;
  for (let i = 0; i + cum.length <= tu.length; i++) {
    if (cum.every((t, j) => tu[i + j] === t)) return true;
  }
  return false;
}

export function traChuDe(kho: ChuDe[], cauHoi: string, toiDa = 2): ChuDe[] {
  const theoId = kho.find((c) => c.id === cauHoi.trim().toLowerCase());
  if (theoId) return [theoId];
  const tach = coDau(cauHoi) ? tachTu : tachTuBoDau;
  const tu = tach(cauHoi);
  const diem = (c: ChuDe) =>
    [c.tieuDe, ...c.tuKhoa].reduce((tong, cum) => {
      const t = tach(cum);
      return chuaDay(tu, t) ? tong + t.length : tong;
    }, 0);
  return kho
    .map((c) => ({ c, d: diem(c) }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d || a.c.id.localeCompare(b.c.id))
    .slice(0, toiDa)
    .map((x) => x.c);
}

export function danhSachChuDe(kho: ChuDe[]): { id: string; tieuDe: string; moTa: string }[] {
  return kho.map(({ id, tieuDe, moTa }) => ({ id, tieuDe, moTa }));
}

export function dungBanDo(kho: ChuDe[]): string {
  const nhom = new Map<string, ChuDe[]>();
  for (const c of kho) nhom.set(c.nhom, [...(nhom.get(c.nhom) ?? []), c]);
  return [...nhom]
    .map(([ten, ds]) => `- ${ten}: ${ds.map((c) => `${c.id} (${c.tieuDe})`).join('; ')}`)
    .join('\n');
}
