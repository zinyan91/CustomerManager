import { describe, expect, it } from 'vitest';
import { buildKpiDashboard, formatKpiAmount } from '../kpiDashboard';
import type { KpiDashboardSource } from '../../types/kpiDashboard';
import type { TeamMember } from '../../types/team';

const definitions = [
  { Code:'net_loan', Name:'Tăng ròng cho vay', Unit:'VND', Aggregation:'flow', SortOrder:1 },
  { Code:'loan_balance', Name:'Quy mô dư nợ quản lý', Unit:'VND', Aggregation:'stock', SortOrder:2 },
] as KpiDashboardSource['definitions'];
const members: TeamMember[] = ['one','two'].map(id => ({
  MembershipId:id, TeamId:'team', UserId:id, TeamRole:'member', FullName:id,
  EffectiveFrom:'2025-01-01T00:00:00Z', EffectiveTo:null,
}));
const empty: KpiDashboardSource = {
  definitions, periods:[],batches:[],observations:[],
  memberships:members,teamTargets:[],memberTargets:[],
};
const source: KpiDashboardSource = {
  ...empty,
  periods:[{ Id:'jan',TeamId:'team',Month:'2026-01-01',Status:'open' },{ Id:'feb',TeamId:'team',Month:'2026-02-01',Status:'open' }],
  batches:['jan','feb'].map((id,index) => ({ Id:id,PeriodId:id,Revision:1,DataAsOf:`2026-0${index+1}-20`,SourceName:'file',Rows:4,PublishedAt:'' })),
  observations:[
    { BatchId:'jan',UserId:'one',MetricCode:'net_loan',Amount:10 },
    { BatchId:'jan',UserId:'two',MetricCode:'net_loan',Amount:20 },
    { BatchId:'feb',UserId:'one',MetricCode:'net_loan',Amount:-5 },
    { BatchId:'feb',UserId:'two',MetricCode:'net_loan',Amount:15 },
    { BatchId:'jan',UserId:'one',MetricCode:'loan_balance',Amount:100 },
    { BatchId:'jan',UserId:'two',MetricCode:'loan_balance',Amount:200 },
    { BatchId:'feb',UserId:'one',MetricCode:'loan_balance',Amount:110 },
    { BatchId:'feb',UserId:'two',MetricCode:'loan_balance',Amount:210 },
  ],
  teamTargets:['jan','feb'].flatMap(id => definitions.map(def => ({ PeriodId:id,MetricCode:def.Code,Amount:40,Version:1 }))),
  memberTargets:['jan','feb'].flatMap(id => members.map(member => ({ PeriodId:id,MetricCode:'net_loan',UserId:member.UserId,Amount:20,Version:1 }))),
};

describe('KPI reporting dashboard', () => {
  it('preserves cards and report structure when the team has no period yet', () => {
    const model = buildKpiDashboard(empty,members,'2026-02','month',null);
    expect(model.cards).toHaveLength(2);
    expect(model.cards[0]).toMatchObject({ actual:null,target:null,completion:null });
    expect(model.months).toHaveLength(2);
    expect(model.monthlyReports.net_loan).toEqual([]);
  });
  it('uses the same team values in cards, charts and monthly report', () => {
    const model = buildKpiDashboard(source,members,'2026-02','month',null);
    expect(model.cards[0]).toMatchObject({ actual:10,target:40,completion:25 });
    expect(model.trends.net_loan.at(-1)?.actual).toBe(10);
    expect(model.months.at(-1)?.values.net_loan).toBe(10);
    expect(model.comparisons.net_loan.map(row => row.actual)).toEqual([-5,15]);
  });
  it('sums YTD flows and keeps only the last stock value', () => {
    const model = buildKpiDashboard(source,members,'2026-02','ytd',null);
    expect(model.cards[0]).toMatchObject({ actual:40,target:80,completion:50 });
    expect(model.cards[1].actual).toBe(320);
    expect(model.trends.net_loan[0].actual).toBe(30);
  });
  it('never invents a full team result when one member is missing', () => {
    const partial = { ...source,observations:source.observations.filter(row => !(row.BatchId==='feb'&&row.UserId==='two'&&row.MetricCode==='net_loan')) };
    expect(buildKpiDashboard(partial,members,'2026-02','month',null).cards[0].actual).toBeNull();
    expect(buildKpiDashboard(partial,members,'2026-02','ytd',null).cards[0].actual).toBeNull();
  });
  it('does not reveal another member when rendering the personal role', () => {
    const model = buildKpiDashboard(source,members,'2026-02','month','one');
    expect(model.cards[0]).toMatchObject({ actual:-5,target:20,completion:-25 });
    expect(model.comparisons.net_loan).toEqual([]);
  });
  it('formats signed money and counts with explicit units, without changing missing to zero', () => {
    expect(formatKpiAmount(null,'VND')).toEqual({ value:'—',unit:'' });
    expect(formatKpiAmount(-1500000000,'VND')).toEqual({ value:'-1,5',unit:'tỷ' });
    expect(formatKpiAmount(0,'count')).toEqual({ value:'0',unit:'' });
  });
});
