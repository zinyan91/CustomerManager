import type { ReactNode } from 'react';

interface ConfigCardProps {
  title: string;
  children: ReactNode;
}

/** Một khối của trang cấu hình: đúng một lớp khung ngoài, bên trong chỉ dùng đường kẻ. */
export function ConfigCard({ title, children }: ConfigCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">{title}</h2>
      {children}
    </section>
  );
}
