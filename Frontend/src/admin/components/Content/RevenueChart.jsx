import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useAdminMode } from '../../context/AdminModeContext';
import { analyticsService } from '../../../services';

const RevenueChart = () => {
  const { adminMode } = useAdminMode();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [adminMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response =
        adminMode === 'shop'
          ? await analyticsService.getBusinessOverview()
          : await analyticsService.getAdminStats();
      setData(response.monthlyRevenue || []);
    } catch (err) {
      console.error('Error fetching revenue chart data:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const hasData = data.some((d) => d.revenue > 0 || d.profit > 0);

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-4 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Revenue Chart</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Monthly Revenue and Profit (All values in RWF)
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-linear-to-r from-solid to-tertiary rounded-full"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">Revenue</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-linear-to-r from-solidOne to-solidTwo rounded-full"></div>
            <span className="text-xs text-slate-600 dark:text-slate-400">Profit</span>
          </div>
        </div>
      </div>
      <div className="h-64 sm:h-72 md:h-80">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : !hasData ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">No revenue data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value / 1000}k`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  padding: '8px 12px',
                }}
                formatter={(value) => [value.toLocaleString(), '']}
                labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Bar
                dataKey="revenue"
                fill="url(#revenueGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="profit"
                fill="url(#profitGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F3D2E" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0A2A20" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E8552F" stopOpacity={1} />
                  <stop offset="100%" stopColor="#FFC531" stopOpacity={0.6} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RevenueChart;
