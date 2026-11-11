// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { ReportCenterView } from '../ReportCenterView';
import { loadAlertSnapshot } from '../../../lib/reports/alertLoader';
vi.mock('../../../lib/reports/alertLoader',()=>({loadAlertSnapshot:vi.fn()}));
const fixture={today:'2026-10-20',customers:[],contracts:[],creditContracts:[],collaterals:[],paidPrincipalMap:{},periods:[]};
beforeEach(()=>{vi.mocked(loadAlertSnapshot).mockReset().mockResolvedValue(fixture);});
afterEach(cleanup);

describe('ReportCenterView', () => {
  it('có hai nhóm ngang, bốn cảnh báo và không có sidebar báo cáo lặp', async () => {
    const {container}=render(<ReportCenterView />);
    expect(screen.getByRole('tab',{name:'Theo dõi đến hạn'}).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab',{name:'Danh mục & tổng hợp'})).toBeTruthy();
    for(const label of ['Kỳ due','KUNN đến hạn','HĐTD đến hạn','Định giá TSBĐ']) expect(screen.getByRole('button',{name:new RegExp(label)})).toBeTruthy();
    expect(container.querySelector('nav,aside')).toBeNull();
    await waitFor(()=>expect(screen.queryByRole('status')).toBeNull());
    expect(screen.getByRole('button',{name:'Xuất Excel'}).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button',{name:'In / PDF'}).hasAttribute('disabled')).toBe(true);
  });
  it('tab Danh mục & tổng hợp chỉ còn năm lựa chọn xuất tổng hợp, không còn nút xuất danh mục riêng', () => {
    render(<ReportCenterView />);
    fireEvent.click(screen.getByRole('tab',{name:'Danh mục & tổng hợp'}));
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    fireEvent.click(screen.getByRole('checkbox',{name:'Danh mục đang vay'}));
    expect(screen.getByRole('button',{name:'Xuất Excel tổng hợp'}).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button',{name:'Xuất danh mục đang vay'})).toBeNull();
  });
  it('tab Danh mục đang vay có bảng cố định ba cột đầu, lọc nhóm nợ và các sheet; lọc nhóm thì ẩn Huy động', async () => {
    render(<ReportCenterView />);
    fireEvent.click(screen.getByRole('tab',{name:'Danh mục đang vay'}));
    const sheets = await screen.findByRole('tablist',{name:'Sheet'});
    expect(sheets.textContent).toContain('Huy động');
    const headers = screen.getAllByRole('columnheader');
    expect(headers.slice(0,4).map(h=>h.textContent)).toEqual(['STT','Mã CIF KH','Họ tên KH','Nhóm nợ']);
    expect(headers.slice(0,3).every(h=>(h as HTMLElement).style.position==='sticky')).toBe(true);
    expect((headers[3] as HTMLElement).style.position).toBe('');
    expect(screen.getByText('Không có khoản nào phù hợp bộ lọc.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Nhóm 2–5'}));
    expect(screen.getByRole('button',{name:'Nhóm 2–5'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('tablist',{name:'Sheet'}).textContent).not.toContain('Huy động');
  });
  it('lỗi nạp hiện nguyên văn và không lẫn với trạng thái rỗng',async()=>{
    vi.mocked(loadAlertSnapshot).mockRejectedValueOnce(new Error('Không nạp được lịch trả nợ: permission denied'));
    render(<ReportCenterView />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent','Không nạp được lịch trả nợ: permission denied');
    expect(screen.queryByText('Không có hồ sơ phù hợp bộ lọc.')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Làm mới'}));
    await waitFor(()=>expect(screen.queryByRole('alert')).toBeNull());
  });
});
