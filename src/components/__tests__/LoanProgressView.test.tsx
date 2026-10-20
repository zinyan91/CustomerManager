// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h=vi.hoisted(()=>({save:vi.fn(),reload:vi.fn()}));
vi.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{id:'owner'},role:'master_admin',isAdmin:true})}));
vi.mock('../../hooks/useTeamWorkspace',()=>({useTeamWorkspace:()=>({
  teams:[{Id:'team',Name:'Team thử',IsActive:true},{Id:'team2',Name:'Team hai',IsActive:true}],teamId:'team',loading:false,error:null,
  permissions:{ownMembership:null},selectTeam:vi.fn(),reload:vi.fn(),
})}));
vi.mock('../../hooks/useLoanProgress',()=>({useLoanProgress:()=>({rows:[],error:null,loading:false,reload:h.reload})}));
vi.mock('../../lib/api/teamApi',()=>({fetchTeamMembers:vi.fn().mockImplementation(async (team:string)=>team==='team' ? [
  {UserId:'member',TeamId:'team',FullName:'Xuân Như',TeamRole:'member'},
] : [{UserId:'other',TeamId:'team2',FullName:'Nhân sự khác',TeamRole:'member'}])}));
vi.mock('../../lib/api/loanProgressApi',()=>({
  fetchProgressCustomers:vi.fn().mockResolvedValue([{Id:1,FullName:'KH hiện hữu',CifKh:'123'}]),
  saveProgress:(...args:unknown[])=>h.save(...args),
}));
import { LoanProgressView } from '../views/LoanProgressView';
afterEach(()=>{cleanup();vi.clearAllMocks();});
describe('progress entry screen',()=>{
  it('clears assignee when team changes and loads the new team members',async()=>{
    render(<LoanProgressView />);
    fireEvent.click(screen.getByRole('button',{name:'Thêm hồ sơ'}));
    await screen.findByRole('option',{name:'Xuân Như'});
    fireEvent.change(screen.getByLabelText('Nhân sự phụ trách'),{target:{value:'member'}});
    fireEvent.change(document.querySelector('#progress-team')!,{target:{value:'team2'}});
    expect((screen.getByLabelText('Nhân sự phụ trách') as HTMLSelectElement).value).toBe('');
    await screen.findByRole('option',{name:'Nhân sự khác'});
    expect(screen.queryByRole('option',{name:'Xuân Như'})).toBeNull();
  });
  it('enters the four agreed metrics and saves a new prospect without creating a customer',async()=>{
    h.save.mockResolvedValue({});
    render(<LoanProgressView />);
    fireEvent.click(screen.getByRole('button',{name:'Thêm hồ sơ'}));
    await screen.findByRole('option',{name:'Xuân Như'});
    fireEvent.change(screen.getByLabelText('Nhân sự phụ trách'),{target:{value:'member'}});
    fireEvent.change(screen.getByLabelText('Họ tên KH'),{target:{value:'Khách mới'}});
    for (const [label,value] of [['Số tiền (VND)','200000000'],['Thẻ (số lượng)','2'],['Phí (VND)','0'],['Bảo hiểm (VND)','5000000']])
      fireEvent.change(screen.getByLabelText(label),{target:{value}});
    expect((screen.getByLabelText('Số tiền (VND)') as HTMLInputElement).value).toBe('200.000.000');
    expect((screen.getByLabelText('Bảo hiểm (VND)') as HTMLInputElement).value).toBe('5.000.000');
    expect(screen.getAllByRole('option').filter(option=>option.textContent==='Đã giải ngân')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button',{name:'Lưu hồ sơ'}));
    await waitFor(()=>expect(h.save).toHaveBeenCalledWith(expect.objectContaining({
      TeamId:'team',AssigneeId:'member',CustomerKind:'new',CustomerId:null,CustomerName:'Khách mới',Amount:200000000,Cards:2,Fees:0,Insurance:5000000,
    }),undefined));
    await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.reload).toHaveBeenCalled();
  });
  it('switches existing customer to picker and exposes server errors',async()=>{
    h.save.mockRejectedValue(new Error('permission denied for table LoanProgressEntries'));
    render(<LoanProgressView />);
    fireEvent.click(screen.getByRole('button',{name:'Thêm hồ sơ'}));
    await screen.findByRole('option',{name:'Xuân Như'});
    fireEvent.change(screen.getByLabelText('Nhân sự phụ trách'),{target:{value:'member'}});
    fireEvent.change(screen.getByLabelText('Loại KH'),{target:{value:'existing'}});
    expect(screen.queryByRole('textbox',{name:'Họ tên KH'})).toBeNull();
    await waitFor(()=>expect(screen.getByRole('button',{name:'Chọn Khách hàng'}).hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getByRole('button',{name:'Chọn Khách hàng'}));
    fireEvent.click(screen.getByText('KH hiện hữu'));
    fireEvent.click(screen.getByRole('button',{name:'Lưu hồ sơ'}));
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('permission denied for table LoanProgressEntries'));
    expect(h.save).toHaveBeenCalledWith(expect.objectContaining({CustomerKind:'existing',CustomerId:1}),undefined);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
