import type { ReactNode } from 'react';

interface ConfigCardProps {
  title: string;
  children: ReactNode;
}

export function ConfigCard({ title, children }: ConfigCardProps) {
  return (
    <section className="border-t border-line py-4 space-y-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}
