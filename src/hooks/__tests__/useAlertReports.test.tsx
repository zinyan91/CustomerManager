// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useAlertReports } from '../useAlertReports';
import { loadAlertSnapshot } from '../../lib/reports/alertLoader';
import { downloadBytes } from '../../lib/xlsExport';
import { exportActiveCustomerPortfolioExcel } from '../../lib/customerPortfolioExport';
import { openPrintWindow } from '../../lib/dueList';

vi.mock('../../lib/reports/alertLoader',()=>({loadAlertSnapshot:vi.fn()}));
vi.mock('../../lib/xlsExport',()=>({downloadBytes:vi.fn()}));
vi.mock('../../lib/customerPortfolioExport',()=>({exportActiveCustomerPortfolioExcel:vi.fn()}));
vi.mock('../../lib/dueList',async importOriginal=>({...await importOriginal<object>(),openPrintWindow:vi.fn(()=>true)}));

const fixture={
  today:'2026-10-20',customers:[{Id:1,CifKh:'001',FullName:'Nguyễn An',MaritalStatus:''}],
  contracts:[{Id:1,CustomerId:1,ContractNumber:'GN-1',ContractType:0,LoanAmount:100_000_000,KunnDueDate:'2026-10-21',DebtGroup:1}],
  creditContracts:[],collaterals:[],paidPrincipalMap:{1:20_000_000},
  periods:[{Id:1,ContractId:1,PeriodNumber:1,DueDate:'2026-10-21',TotalAmount:5_000_000,IsPaid:false}],
};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(loadAlertSnapshot).mockResolvedValue(fixture);});
afterEach(()=>{cleanup();vi.useRealTimers();});

describe('useAlertReports',()=>{
  it('xem trước, Excel và PDF dùng cùng dòng sau lọc',async()=>{
    const {result}=renderHook(()=>useAlertReports());
    await waitFor(()=>expect(result.current.loading).toBe(false));
    expect(result.current.rows?.due).toHaveLength(1);
    act(()=>result.current.setSearch('001'));
    act(()=>result.current.exportExcel());
    expect(downloadBytes).toHaveBeenCalledWith(expect.any(Uint8Array),'Bao_Cao_Ky_Due_2026-10-20.xlsx',expect.any(String));
    act(()=>result.current.print());
    expect(openPrintWindow).toHaveBeenCalledWith(expect.stringContaining('Nguyễn An'));
    act(()=>result.current.setSearch('không có'));
    expect(result.current.output?.sheet.rows).toHaveLength(1);
  });
  it('danh mục đầy đủ giữ gốc đã trả và ngày chốt, không bị ảnh hưởng bởi bộ lọc cảnh báo',async()=>{
    const {result}=renderHook(()=>useAlertReports());
    await waitFor(()=>expect(result.current.loading).toBe(false));
    act(()=>result.current.setSearch('không có'));
    act(()=>result.current.exportPortfolio());
    expect(exportActiveCustomerPortfolioExcel).toHaveBeenCalledWith(expect.objectContaining({
      contracts:fixture.contracts,paidPrincipalMap:{1:20_000_000},todayStr:'2026-10-20',
    }));
  });
  it('lỗi nạp hiện nguyên thông điệp, chặn xuất; thử lại được',async()=>{
    vi.mocked(loadAlertSnapshot).mockRejectedValueOnce({message:'Máy chủ từ chối truy vấn lịch',code:'42501'});
    const {result}=renderHook(()=>useAlertReports());
    await waitFor(()=>expect(result.current.error).toBe('Máy chủ từ chối truy vấn lịch'));
    act(()=>{result.current.exportExcel();result.current.print();result.current.exportPortfolio();});
    expect(downloadBytes).not.toHaveBeenCalled();
    expect(openPrintWindow).not.toHaveBeenCalled();
    expect(exportActiveCustomerPortfolioExcel).not.toHaveBeenCalled();
    await act(async()=>{await result.current.reload();});
    expect(result.current.error).toBeNull();
    expect(result.current.rows?.due).toHaveLength(1);
  });
  it('lỗi làm mới không cho xuất snapshot cũ',async()=>{
    const {result}=renderHook(()=>useAlertReports());
    await waitFor(()=>expect(result.current.loading).toBe(false));
    vi.mocked(loadAlertSnapshot).mockRejectedValueOnce(new Error('Đã mất kết nối'));
    await act(async()=>{await result.current.reload();});
    expect(result.current.snapshot).toBeNull();
    expect(result.current.output).toBeNull();
  });
});
