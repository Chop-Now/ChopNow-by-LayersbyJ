import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useAdminMode } from '../../context/AdminModeContext';
import { analyticsService } from '../../../services';

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#ffbb28',
  '#00c49f',
  '#0088fe',
  '#a4de6c',
];

const SalesChart = () => {
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
      const breakdown = (response.categoryBreakdown || []).map((c, i) => ({
        name: c.name,
        value: c.percent,
        color: COLORS[i % COLORS.length],
      }));
      setData(breakdown);
    } catch (err) {
      console.error('Error fetching sales chart data:', err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 backdrop-blur-xl rounded-b-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
      <div className="mb-6">
        <h3 className="text-lg- font-bold text-slate-800 dark:text-white">Sales by Category</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {adminMode === 'shop' ? 'Sales Distribution' : 'Production Distribution'}
        </p>
      </div>
      <div className="h-48">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">No sales data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value) => [`${value}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4">
          {data.map((item, index) => {
            return (
              <div className="flex items-center justify-between" key={index}>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <div className="text-xs font-semibold text-slate-800 dark:text-white">
                  {item.value}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SalesChart;
