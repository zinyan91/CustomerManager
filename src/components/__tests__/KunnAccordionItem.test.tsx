// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { KunnAccordionItem } from '../creditContract/KunnAccordionItem';
import { summarizeCreditContracts } from '../../lib/creditContract';
import type { CreditContract, LoanContract } from '../../types';

const HOM_NAY = '2026-08-18';

const hdtd = (over: Partial<CreditContract>): CreditContract => ({
  Id: 10,
  CustomerId: 1,
  HdtdNumber: '2002/HĐTD/9632203',
  LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 3_000_000_000,
  ContractStartDate: '2026-03-15',
  ContractEndDate: '2027-03-15',
  IsClosed: false,
  ...over,
} as CreditContract);

const kunn = (over: Partial<LoanContract>): LoanContract => ({
  Id: 100,
  CustomerId: 1,
  CreditContractId: 10,
  ContractNumber: '2002/HĐTD/9632203/GNN-01',
  LoanAmount: 1_000_000_000,
  CurrentBalance: 1_000_000_000,
  ...over,
} as LoanContract);

function dungThe(cc: CreditContract, kunns: LoanContract[], onDisburse = vi.fn()) {
  const summary = summarizeCreditContracts([cc], kunns, { today: HOM_NAY })[0];

  render(
    <KunnAccordionItem
      contractSummary={summary}
      collaterals={[]}
      isExpanded={false}
      onToggleExpand={() => {}}
      getKunnsForContract={() => kunns}
      outstandingOf={k => k.CurrentBalance ?? 0}
      onDisburse={onDisburse}
      onEdit={() => {}}
      onDelete={() => {}}
      today={HOM_NAY}
    />
  );

  const nut = screen.getByRole('button', { name: /giải ngân|đã đóng|hết hiệu lực|chưa hiệu lực|hết khả dụng/i });
  return { summary, nut, onDisburse };
}

afterEach(cleanup);

describe('Nút giải ngân đọc quyết định từ summarizeCreditContracts', () => {
  it('còn trống thì bấm được và gọi đúng HĐTD', () => {
    const cc = hdtd({});
    const { summary, nut, onDisburse } = dungThe(cc, [kunn({})]);

    expect(summary.canDisburse).toBe(true);
    expect(nut).toHaveProperty('disabled', false);

    fireEvent.click(nut);
    expect(onDisburse).toHaveBeenCalledWith(cc);
  });

  it('hết hạn mức: khoá nút và hiện đúng chuỗi blockReason của lib', () => {
    const cc = hdtd({});
    const { summary, nut, onDisburse } = dungThe(cc, [
      kunn({ LoanAmount: 3_000_000_000, CurrentBalance: 3_000_000_000 }),
    ]);

    expect(summary.blockReason).toBe('Đã dùng hết hạn mức');
    expect(nut).toHaveProperty('disabled', true);
    expect(nut.getAttribute('title')).toBe(summary.blockReason);

    fireEvent.click(nut);
    expect(onDisburse).not.toHaveBeenCalled();
  });

  it('HĐTD hết hiệu lực: khoá nút, title là blockReason kèm ngày', () => {
    const cc = hdtd({ ContractEndDate: '2026-08-17' });
    const { summary, nut } = dungThe(cc, []);

    expect(summary.blockReason).toBe('HĐTD hết hiệu lực 17/08/2026');
    expect(nut).toHaveProperty('disabled', true);
    expect(nut.getAttribute('title')).toBe(summary.blockReason);
  });

  it('HĐTD chưa hiệu lực: khoá nút', () => {
    const cc = hdtd({ ContractStartDate: '2026-09-01', ContractEndDate: '2027-09-01' });
    const { summary, nut } = dungThe(cc, []);

    expect(summary.blockReason).toBe('HĐTD có hiệu lực từ 01/09/2026');
    expect(nut).toHaveProperty('disabled', true);
  });

  it('HĐTD đã đóng: khoá nút', () => {
    const { summary, nut } = dungThe(hdtd({ IsClosed: true }), []);

    expect(summary.blockReason).toBe('HĐTD đã đóng');
    expect(nut).toHaveProperty('disabled', true);
  });

  it('sắp hết hạn vẫn giải ngân được — đó là cảnh báo, không phải chặn', () => {
    const cc = hdtd({ ContractEndDate: '2026-08-25' });
    const { summary, nut } = dungThe(cc, [kunn({})]);

    expect(summary.canDisburse).toBe(true);
    expect(nut).toHaveProperty('disabled', false);
  });

  it('đúng ngày cuối hiệu lực vẫn giải ngân được', () => {
    const cc = hdtd({ ContractEndDate: HOM_NAY });
    const { summary, nut } = dungThe(cc, [kunn({})]);

    expect(summary.canDisburse).toBe(true);
    expect(nut).toHaveProperty('disabled', false);
  });
});

describe('Nút Tất toán / Mở lại HĐTD', () => {
  it('hiển thị nút Tất toán khi HĐTD đang mở và gọi callback khi bấm', () => {
    const cc = hdtd({ IsClosed: false });
    const onToggleClose = vi.fn();
    const summary = summarizeCreditContracts([cc], [], { today: HOM_NAY })[0];

    render(
      <KunnAccordionItem
        contractSummary={summary}
        collaterals={[]}
        isExpanded={false}
        onToggleExpand={() => {}}
        getKunnsForContract={() => []}
        outstandingOf={() => 0}
        onDisburse={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleClose={onToggleClose}
        today={HOM_NAY}
      />
    );

    const btn = screen.getByRole('button', { name: /tất toán hđtd/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onToggleClose).toHaveBeenCalledWith(cc);
  });

  it('hiển thị nút Mở lại khi HĐTD đã đóng', () => {
    const cc = hdtd({ IsClosed: true });
    const onToggleClose = vi.fn();
    const summary = summarizeCreditContracts([cc], [], { today: HOM_NAY })[0];

    render(
      <KunnAccordionItem
        contractSummary={summary}
        collaterals={[]}
        isExpanded={false}
        onToggleExpand={() => {}}
        getKunnsForContract={() => []}
        outstandingOf={() => 0}
        onDisburse={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onToggleClose={onToggleClose}
        today={HOM_NAY}
      />
    );

    const btn = screen.getByRole('button', { name: /mở lại hđtd/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onToggleClose).toHaveBeenCalledWith(cc);
  });
});

describe('dòng hợp đồng thế chấp', () => {
  it('HĐTD có HĐTC thì hiện "HĐTC:" kèm số', () => {
    const cc = hdtd({});
    const summary = summarizeCreditContracts([cc], [], { today: HOM_NAY })[0];
    render(
      <KunnAccordionItem
        contractSummary={summary} collaterals={[]} isExpanded={false} onToggleExpand={() => {}}
        getKunnsForContract={() => []} outstandingOf={() => 0}
        onDisburse={() => {}} onEdit={() => {}} onDelete={() => {}} today={HOM_NAY}
        mortgageNumbers={['HĐTC-01', 'HĐTC-02']}
      />
    );
    expect(screen.getByText('HĐTC:')).toBeTruthy();
    expect(screen.getByText('HĐTC-01, HĐTC-02')).toBeTruthy();
  });

  it('không có HĐTC thì không hiện dòng này', () => {
    dungThe(hdtd({}), []);
    expect(screen.queryByText('HĐTC:')).toBeNull();
  });
});
