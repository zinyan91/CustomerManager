// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { KpiDashboardSource } from '../../types/kpiDashboard';

const h = vi.hoisted(() => ({
  data:null as KpiDashboardSource|null,
  error:null as string|null,
  loading:false,
  read:vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth:() => ({ user:{ id:'leader' },role:'user' }) }));
vi.mock('../../hooks/useLoanProgress', () => ({ useLoanProgress:() => ({ rows:[],error:null,loading:true,reload:vi.fn() }) }));
vi.mock('../../hooks/useTeamWorkspace', () => ({ useTeamWorkspace:() => ({
  teams:[{ Id:'team',Name:'Team Thanh Tùng',IsActive:true }],teamId:'team',members:[],
  loading:false,error:null,reload:vi.fn(),selectTeam:vi.fn(),
  permissions:{ viewMembers:true,manage:false },
}) }));
vi.mock('../../hooks/useTeamKpiDashboard', () => ({ useTeamKpiDashboard:(...args:unknown[]) => {
  h.read(...args);
  return { data:h.data,error:h.error,loading:h.loading,reload:vi.fn() };
} }));
vi.mock('../team/TeamKpiReportCharts', () => ({ TeamKpiReportCharts:() =>
  <section aria-label="Kết quả theo tháng" />,
}));
import { TeamKpiView } from '../views/TeamKpiView';

beforeEach(() => {
  vi.clearAllMocks();
  h.loading=false;
  h.error=null;
  h.data={
    definitions:[
      ['net_loan','Tăng ròng cho vay'],['net_term_deposit','Tăng ròng huy động có kỳ hạn'],
      ['net_casa','Tăng ròng CASA'],['new_customers','Khách hàng mới'],['service_fees','Phí dịch vụ'],
      ['loan_balance','Quy mô dư nợ quản lý'],['credit_cards','Thẻ tín dụng'],
    ].map(([Code,Name],index) => ({
      Code,Name,Unit:Code==='new_customers'||Code==='credit_cards' ? 'count' : 'VND',
      Aggregation:Code==='loan_balance' ? 'stock' : 'flow',SortOrder:index+1,
    })),
    periods:[],batches:[],observations:[],memberships:[],teamTargets:[],memberTargets:[],
  };
});
afterEach(cleanup);

describe('KPI reporting page', () => {
  it('keeps seven report cards and charts even before a period is created', () => {
    const { container }=render(<TeamKpiView />);
    expect(screen.getByRole('heading',{ name:'Báo cáo KPI team' })).toBeTruthy();
    expect(container.querySelectorAll('[data-kpi-hue]')).toHaveLength(7);
    expect(screen.queryByRole('region',{ name:'So sánh thành viên' })).toBeNull();
    expect(screen.getByRole('region',{name:'Báo cáo tiến độ hồ sơ'}).compareDocumentPosition(screen.getByLabelText('Chỉ tiêu phân tích')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('region',{ name:'Kết quả theo tháng' })).toBeTruthy();
    expect(screen.getByRole('region',{ name:'Báo cáo KPI theo tháng' })).toBeTruthy();
    expect(container.querySelector('form')).toBeNull();
    expect(screen.queryByText('Team Thanh Tùng')).toBeNull();
    expect(screen.queryByText('Nhân sự team')).toBeNull();
    expect(screen.queryByText('Hồ sơ team · Chỉ đọc')).toBeNull();
    expect(screen.queryByText('Kế hoạch của tôi')).toBeNull();
    expect(screen.queryByRole('button',{ name:'Tạo kỳ KPI' })).toBeNull();
    expect(screen.queryByLabelText('Tệp Excel')).toBeNull();
  });
  it('changes the report period and year without adding a period-creation form', async () => {
    render(<TeamKpiView />);
    fireEvent.change(screen.getByLabelText('Tháng báo cáo'),{ target:{ value:'2025-09' } });
    expect(h.read).toHaveBeenLastCalledWith('team','2025');
    expect((screen.getByLabelText('Tháng báo cáo') as HTMLInputElement).value).toBe('2025-09');
    await userEvent.click(screen.getByRole('tab',{ name:'Lũy kế năm' }));
    expect(screen.getByRole('tab',{ name:'Lũy kế năm' }).getAttribute('aria-selected')).toBe('true');
  });
  it('surfaces server failures instead of showing empty report data', () => {
    h.data=null;
    h.error='permission denied for table KpiObservations';
    render(<TeamKpiView />);
    expect(screen.getByRole('alert').textContent).toContain(h.error);
    expect(screen.queryByRole('region',{ name:'So sánh thành viên' })).toBeNull();
  });
});
