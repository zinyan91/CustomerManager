import React, { useEffect, useState } from 'react';
import { fetchCustomersAPI, fetchCollateralsAPI, fetchContractsAPI } from '../../lib/api';
import type { Customer, Collateral, LoanContract } from '../../types';
import { DollarSign, Users, Building2, CreditCard, RefreshCw } from 'lucide-react';
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
        fetchCustomersAPI(),
        fetchCollateralsAPI(),
        fetchContractsAPI(),
      ]);

      setCustomers(resCus);
      setCollaterals(resCol);
      setContracts(resCon);
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

  const COLORS = ['#0284c7', '#059669', '#d97706', '#dc2626'];

  const formatMoney = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Tỷ';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + ' Trđ';
    return val.toLocaleString('vi-VN') + ' VNĐ';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[350px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight">TỔNG QUAN TÍN DỤNG</h2>
          <p className="text-xs text-slate-400">KPI Dư nợ, Tỷ lệ LTV và Phân bổ Tài sản Bảo đảm</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 flex items-center space-x-1.5 font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>TỔNG DƯ NỢ CẤP</span>
            <DollarSign className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">{formatMoney(totalDebt)}</div>
          <div className="text-xs text-slate-400 mt-1">Hạn mức: {formatMoney(totalLimit)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>GIÁ TRỊ TSĐB</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">{formatMoney(totalCollateralVal)}</div>
          <div className="text-xs text-slate-400 mt-1">Tổng số: {collaterals.length} Tài sản</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>LTV TRUNG BÌNH</span>
            <span className="text-amber-400 font-bold text-xs">80% Max</span>
          </div>
          <div className="text-xl font-bold text-amber-400">{weightedLtv.toFixed(2)}%</div>
          <div className="text-xs text-slate-400 mt-1">Tỷ lệ an toàn khoản vay</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>KHÁCH HÀNG</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-slate-100">{customers.length} KH</div>
          <div className="text-xs text-slate-400 mt-1">Số HĐTD: {contracts.length}</div>
        </div>
      </div>

      {/* Grid 2 Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase mb-3 flex items-center space-x-2">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span>PHÂN BỔ GIÁ TRỊ TSĐB THEO XẾP LOẠI</span>
          </h3>
          <div className="h-56">
            {collateralTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collateralTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {collateralTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatMoney(Number(val))} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Chưa có dữ liệu phân bổ TSĐB
              </div>
            )}
          </div>
        </div>

        {/* Top Customers List */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <h3 className="text-xs font-bold text-slate-300 uppercase mb-3 flex items-center space-x-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>DANH SÁCH KHÁCH HÀNG MỚI NHẤT</span>
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {customers.slice(0, 5).map((cus) => {
              const cusDebt = contracts
                .filter(c => c.CustomerId === cus.Id)
                .reduce((a, b) => a + (b.ContractAmount || 0), 0);

              return (
                <div key={cus.Id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-200">{cus.FullName}</div>
                    <div className="text-[11px] text-slate-400">CIF: {cus.CifKh} | CCCD: {cus.NationalId || 'Chưa khai báo'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sky-400">{formatMoney(cusDebt)}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{cus.MaritalStatus}</div>
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
