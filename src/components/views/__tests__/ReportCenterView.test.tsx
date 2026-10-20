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
  it('danh mục có nút mẫu hai sheet và giữ đủ năm lựa chọn xuất tổng hợp', async () => {
    render(<ReportCenterView />);
    fireEvent.click(screen.getByRole('tab',{name:'Danh mục & tổng hợp'}));
    expect(screen.getByRole('button',{name:'Xuất danh mục đang vay'})).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    fireEvent.click(screen.getByRole('checkbox',{name:'Danh mục đang vay'}));
    expect(screen.getByRole('button',{name:'Xuất Excel tổng hợp'}).hasAttribute('disabled')).toBe(true);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Xuất danh mục đang vay'}).hasAttribute('disabled')).toBe(false));
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
