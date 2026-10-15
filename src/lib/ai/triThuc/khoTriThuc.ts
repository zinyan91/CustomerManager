import { docChuDe, type ChuDe } from './phanTichTriThuc';

const TEP = import.meta.glob<string>('./noi-dung/*.md', { query: '?raw', import: 'default' });

let dangTai: Promise<ChuDe[]> | null = null;

export function taiKhoTriThuc(): Promise<ChuDe[]> {
  dangTai ??= Promise.all(Object.entries(TEP).map(async ([duongDan, tai]) => docChuDe(await tai(), duongDan)))
    .then((ds) => ds.sort((a, b) => a.id.localeCompare(b.id)))
    .catch((err) => {
      dangTai = null;
      throw err;
    });
  return dangTai;
}
