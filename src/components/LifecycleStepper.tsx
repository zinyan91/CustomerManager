import React, { memo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { screenPathFor } from '../lib/customerRoutes';
import { ChevronRight } from 'lucide-react';

interface Step {
  id: string;
  num: number;
  label: string;
  screenId: string;
  isActive: (pathname: string) => boolean;
}

export const LifecycleStepper: React.FC = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const customerId = useSelectedCustomerId();
  const pathname = location.pathname;

  const isCreditPillar = [
    '/customers',
    '/credit-contracts',
    '/loans',
    '/collaterals',
    '/mortgage-contracts',
    '/credit-cards',
    '/post-loan',
  ].some(p => pathname.startsWith(p));

  if (!isCreditPillar) return null;

  const steps: Step[] = [
    {
      id: 'cif',
      num: 1,
      label: 'Hồ Sơ CIF',
      screenId: 'customers',
      isActive: (p) => p.startsWith('/customers') && !p.includes('/credit-contracts') && !p.includes('/loans') && !p.includes('/collaterals') && !p.includes('/mortgage-contracts') && !p.includes('/credit-cards') && !p.includes('/post-loan'),
    },
    {
      id: 'hdtd',
      num: 2,
      label: 'Hợp Đồng Tín Dụng',
      screenId: 'credit-contracts',
      isActive: (p) => p.includes('/credit-contracts'),
    },
    {
      id: 'tsbd',
      num: 3,
      label: 'Tài Sản & HĐTC',
      screenId: 'collaterals',
      isActive: (p) => p.includes('/collaterals') || p.includes('/mortgage-contracts'),
    },
    {
      id: 'kunn',
      num: 4,
      label: 'Giải Ngân (KUNN)',
      screenId: 'loans',
      isActive: (p) => p.includes('/loans'),
    },
    {
      id: 'cards',
      num: 5,
      label: 'Thẻ Tín Dụng',
      screenId: 'credit-cards',
      isActive: (p) => p.includes('/credit-cards'),
    },
    {
      id: 'postloan',
      num: 6,
      label: 'Kiểm Soát Sau Vay',
      screenId: 'post-loan',
      isActive: (p) => p.includes('/post-loan'),
    },
  ];

  return (
    <div
      className="mb-3.5 bg-panel/90 backdrop-blur-md border border-line/70 rounded-2xl p-2 px-3 flex items-center gap-1.5 overflow-x-auto shadow-xs select-none scrollbar-none"
      aria-label="Quy trình vòng đời tín dụng 6 bước"
    >
      <span className="text-[10px] uppercase font-bold tracking-wider text-ink-faint px-2 shrink-0 hidden sm:inline-block">
        Vòng đời hồ sơ:
      </span>
      <div className="flex items-center gap-1 min-w-max">
        {steps.map((step, idx) => {
          const active = step.isActive(pathname);
          const target = screenPathFor(step.screenId as any, customerId);

          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-line-strong shrink-0 mx-0.5" />
              )}
              <button
                type="button"
                onClick={() => navigate(target)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-accent text-accent-ink font-bold shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-surface/80'
                }`}
                title={`Bước ${step.num}: ${step.label}`}
              >
                <span
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                    active
                      ? 'bg-accent-ink/20 text-accent-ink'
                      : 'bg-surface border border-line text-ink-muted'
                  }`}
                >
                  {step.num}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

LifecycleStepper.displayName = 'LifecycleStepper';
