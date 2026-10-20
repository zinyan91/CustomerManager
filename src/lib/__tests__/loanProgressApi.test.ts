import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoanProgressEntry } from '../../types/loanProgress';
const h=vi.hoisted(()=>({from:vi.fn(),select:vi.fn(),eq:vi.fn(),insert:vi.fn(),update:vi.fn(),range:vi.fn(),maybeSingle:vi.fn(),query:{} as Record<string,unknown>}));
vi.mock('../supabase',()=>({supabase:{from:h.from}}));
import { fetchProgress, fetchProgressCustomers, saveProgress } from '../api/loanProgressApi';
const entry:LoanProgressEntry={Id:'entry',OwnerId:'owner',Version:4,TeamId:'team',AssigneeId:'member',Month:'2026-10',CustomerKind:'new',CustomerId:null,
  CustomerName:' Khách mới ',Amount:0,Cards:null,Fees:null,Insurance:null,CaseType:'Mới',LoanTerm:'Ngắn hạn',Stage:'Mới nhận hồ sơ',CreatedAt:'date',UpdatedAt:'date'};
beforeEach(()=>{
  vi.clearAllMocks();
  for (const key of ['select','eq','insert','update'] as const) {h.query[key]=h[key];h[key].mockReturnValue(h.query);}
  for (const key of ['in','gte','lte','order']) h.query[key]=vi.fn().mockReturnValue(h.query);
  h.query.range=h.range;h.query.maybeSingle=h.maybeSingle;
  h.from.mockReturnValue(h.query);
  h.maybeSingle.mockResolvedValue({data:entry,error:null});
});
describe('progress repository',()=>{
  it('whitelists editable fields and applies optimistic concurrency',async()=>{
    await saveProgress(entry,entry);
    expect(h.update).toHaveBeenCalledWith({
      TeamId:'team',AssigneeId:'member',Month:'2026-10',CustomerKind:'new',CustomerId:null,CustomerName:'Khách mới',
      Amount:0,Cards:null,Fees:null,Insurance:null,CaseType:'Mới',LoanTerm:'Ngắn hạn',Stage:'Mới nhận hồ sơ',
    });
    expect(h.eq).toHaveBeenCalledWith('Id','entry');
    expect(h.eq).toHaveBeenCalledWith('Version',4);
  });
  it('reports stale writes and server errors',async()=>{
    h.maybeSingle.mockResolvedValue({data:null,error:null});
    await expect(saveProgress(entry,entry)).rejects.toThrow('Hồ sơ đã thay đổi');
    h.maybeSingle.mockResolvedValue({data:null,error:{message:'server says denied'}});
    await expect(saveProgress(entry)).rejects.toThrow('server says denied');
  });
  it('paginates rows and constrains owner and period on the server',async()=>{
    h.range.mockResolvedValueOnce({data:Array(500).fill(entry),error:null}).mockResolvedValueOnce({data:[entry],error:null});
    expect(await fetchProgress('2026-10',['owner'],true)).toHaveLength(501);
    expect(h.query.in).toHaveBeenCalledWith('OwnerId',['owner']);
    expect(h.query.gte).toHaveBeenCalledWith('Month','2026-01');
    expect(h.range).toHaveBeenLastCalledWith(500,999);
  });
  it('loads explicit team entries regardless of creator membership',async()=>{
    h.range.mockResolvedValue({data:[entry],error:null});
    expect(await fetchProgress('2026-10',[],false,'team')).toHaveLength(1);
    expect(h.eq).toHaveBeenCalledWith('TeamId','team');
    expect(h.query.in).not.toHaveBeenCalled();
  });
  it('keeps picker own-only and propagates errors',async()=>{
    h.range.mockResolvedValue({data:null,error:{message:'picker denied'}});
    await expect(fetchProgressCustomers('owner')).rejects.toThrow('picker denied');
    expect(h.eq).toHaveBeenCalledWith('OwnerId','owner');
    expect(await fetchProgress('2026-10',[])).toEqual([]);
  });
});
