import type { ReactNode } from 'react';

export function AdminPageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
    <h1 className="text-lg font-semibold text-ink">{title}</h1>
    {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
  </header>;
}
