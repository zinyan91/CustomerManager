import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Customer, Collateral, LoanContract } from '../../types';
import { DollarSign, Users, Building2, CreditCard, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export const DashboardView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resCus, resCol, resCon] = await Promise.all([
        supabase.from('Customers').select('*'),
        supabase.from('Collaterals').select('*'),
        supabase.from('LoanContracts').select('*'),
      ]);

      if (resCus.data) setCustomers(resCus.data);
      if (resCol.data) setCollaterals(resCol.data);
      if (resCon.data) setContracts(resCon.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalDebt = contracts.reduce((acc, c) => acc + (c.ContractAmount || 0), 0);
  const totalLimit = contracts.reduce((acc, c) => acc + (c.ContractAmount || 0), 0);
  const totalCollateralVal = collaterals.reduce((acc, c) => acc + (c.AppraisedValue || c.Value || 0), 0);
  const weightedLtv = totalCollateralVal > 0 ? (totalDebt / totalCollateralVal) * 100 : 0;

  const collateralTypeData = [
    { name: 'Loại 1 (80%)', value: collaterals.filter(c => c.AssetType === 'Loại 1').reduce((a, b) => a + (b.AppraisedValue || b.Value || 0), 0) },
    { name: 'Loại 2 (70%)', value: collaterals.filter(c => c.AssetType === 'Loại 2').reduce((a, b) => a + (b.AppraisedValue || b.Value || 0), 0) },
    { name: 'Loại 3 (60%)', value: collaterals.filter(c => c.AssetType === 'Loại 3').reduce((a, b) => a + (b.AppraisedValue || b.Value || 0), 0) },
    { name: 'Loại 4 (55%)', value: collaterals.filter(c => c.AssetType === 'Loại 4').reduce((a, b) => a + (b.AppraisedValue || b.Value || 0), 0) },
  ].filter(d => d.value > 0);

  const COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#f87171'];

  const formatMoney = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Tỷ';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + ' Trđ';
    return val.toLocaleString('vi-VN') + ' VNĐ';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">BÁO CÁO TỔNG QUAN TÍN DỤNG</h2>
          <p className="text-xs text-slate-400">Theo dõi KPI Dư nợ, Tỷ lệ LTV và Danh mục Tài sản Bảo đảm</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-lg border border-slate-700 flex items-center space-x-2"
        >
          <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase">TỔNG DƯ NỢ CẤP</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-400">{formatMoney(totalDebt)}</div>
          <div className="text-xs text-slate-500 mt-1">Hạn mức cấp: {formatMoney(totalLimit)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase">GIÁ TRỊ TSĐB</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{formatMoney(totalCollateralVal)}</div>
          <div className="text-xs text-slate-500 mt-1">Tổng số: {collaterals.length} Tài sản bảo đảm</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase">LTV TRUNG BÌNH</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">{weightedLtv.toFixed(2)}%</div>
          <div className="text-xs text-slate-500 mt-1">Ngưỡng an toàn tối đa: 80%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase">KHÁCH HÀNG QUẢN LÝ</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400">{customers.length} KH</div>
          <div className="text-xs text-slate-500 mt-1">Số HĐTD đang vay: {contracts.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>PHÂN BỔ GIÁ TRỊ TSĐB THEO XẾP LOẠI</span>
          </h3>
          <div className="h-64">
            {collateralTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collateralTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {collateralTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Chưa có dữ liệu phân bổ TSĐB
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>DANH MỤC KHÁCH HÀNG VAY HÀNG ĐẦU</span>
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {customers.slice(0, 5).map((cus) => {
              const cusDebt = contracts
                .filter(c => c.CustomerId === cus.Id)
                .reduce((a, b) => a + (b.ContractAmount || 0), 0);

              return (
                <div key={cus.Id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{cus.FullName}</div>
                    <div className="text-xs text-slate-400">CIF: {cus.CifKh} | CCCD: {cus.NationalId || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sky-400 text-sm">{formatMoney(cusDebt)}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">{cus.CicStatus || 'Nợ tốt'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
