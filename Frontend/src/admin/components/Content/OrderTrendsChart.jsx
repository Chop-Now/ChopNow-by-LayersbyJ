import React, { useState, useEffect } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { analyticsService } from '../../../services';
import { useAdminMode } from '../../context/AdminModeContext';

const OrderTrendsChart = () => {
  const { adminMode } = useAdminMode();
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    monthly: [],
    quarterly: [],
    annually: [],
  });

  useEffect(() => {
    fetchChartData();
  }, [adminMode]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      // Vendors use business overview; website admin uses admin stats
      const stats =
        adminMode === 'shop'
          ? await analyticsService.getBusinessOverview()
          : await analyticsService.getAdminStats();

      let monthlyData;
      if (adminMode === 'shop') {
        // Business overview: weeklyTrend is [{ sales, orders }, ...]
        const weekly = stats.weeklyTrend || [];
        monthlyData = weekly.map((w, i) => ({
          name: `Week ${i + 1}`,
          thisMonth: w.orders || 0,
          lastMonth: 0,
        }));
      } else {
        // Admin stats: weeklyTrends already in chart format
        monthlyData = stats.weeklyTrends || [];
      }

      // Quarterly and annually both derive from monthlyRevenue's real
      // per-month order counts (added alongside revenue/profit - see
      // calculateMonthlyRevenue in Backend/controllers/analyticsController.js).
      // Previously these multiplied the running order total by made-up
      // growth-factor constants; there was never a real quarterly/annual
      // comparison behind them.
      const monthly = stats.monthlyRevenue || [];

      // Quarterly: this quarter = the last 3 real months, last quarter = the
      // 3 real months before that, aligned month-by-month within the quarter.
      const last6 = monthly.slice(-6);
      const lastQuarterMonths = last6.slice(0, 3);
      const thisQuarterMonths = last6.slice(3, 6);
      const quarterlyData = [0, 1, 2].map((i) => ({
        name: `Month ${i + 1}`,
        thisQuarter: thisQuarterMonths[i]?.orders || 0,
        lastQuarter: lastQuarterMonths[i]?.orders || 0,
      }));

      // Annually: only 12 real months of history exist (no prior-year data
      // tracked anywhere), so this shows one real trailing-12-month line
      // rather than fabricating a "last year" comparison.
      const annualData = monthly.map((m) => ({
        name: m.month,
        thisYear: m.orders,
      }));

      setChartData({
        monthly: monthlyData,
        quarterly: quarterlyData,
        annually: annualData,
      });
    } catch (err) {
      console.error('Error fetching chart data:', err);
      // Set default empty data
      setChartData({
        monthly: [
          { name: 'Week 1', thisMonth: 0, lastMonth: 0 },
          { name: 'Week 2', thisMonth: 0, lastMonth: 0 },
          { name: 'Week 3', thisMonth: 0, lastMonth: 0 },
          { name: 'Week 4', thisMonth: 0, lastMonth: 0 },
        ],
        quarterly: [
          { name: 'Month 1', thisQuarter: 0, lastQuarter: 0 },
          { name: 'Month 2', thisQuarter: 0, lastQuarter: 0 },
          { name: 'Month 3', thisQuarter: 0, lastQuarter: 0 },
        ],
        annually: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const getData = () => {
    switch (period) {
      case 'monthly':
        return chartData.monthly;
      case 'quarterly':
        return chartData.quarterly;
      case 'annually':
        return chartData.annually;
      default:
        return chartData.monthly;
    }
  };

  const getDataKeys = () => {
    switch (period) {
      case 'monthly':
        return {
          current: 'thisMonth',
          previous: 'lastMonth',
          currentLabel: 'This Month',
          previousLabel: 'Last Month',
        };
      case 'quarterly':
        return {
          current: 'thisQuarter',
          previous: 'lastQuarter',
          currentLabel: 'This Quarter',
          previousLabel: 'Last Quarter',
        };
      case 'annually':
        // No prior-year history is tracked anywhere, so there's no real
        // "Last Year" line to draw - only ever show the real trailing-12-
        // month trend.
        return {
          current: 'thisYear',
          previous: null,
          currentLabel: 'Last 12 Months',
          previousLabel: null,
        };
      default:
        return {
          current: 'thisMonth',
          previous: 'lastMonth',
          currentLabel: 'This Month',
          previousLabel: 'Last Month',
        };
    }
  };

  const dataKeys = getDataKeys();
  const currentData = getData();

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-4 h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-4 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <div>
          <h3 className="text-lg font-bold text-moringa dark:text-white">
            Order Trends Comparison
          </h3>
          <p className="text-xs text-moringa-muted dark:text-slate-400">
            Compare current period with previous period
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-5 py-2.5 text-xs font-medium rounded-md transition-all duration-200 ${
              period === 'monthly'
                ? 'bg-linear-to-r from-solid to-tertiary text-white shadow-md'
                : 'bg-fufu-dim dark:bg-slate-800 text-moringa-muted dark:text-slate-400 hover:bg-mint dark:hover:bg-slate-700 cursor-pointer'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('quarterly')}
            className={`px-5 py-2.5 text-xs font-medium rounded-md transition-all duration-200 ${
              period === 'quarterly'
                ? 'bg-linear-to-r from-solid to-tertiary text-white shadow-md'
                : 'bg-fufu-dim dark:bg-slate-800 text-moringa-muted dark:text-slate-400 hover:bg-mint dark:hover:bg-slate-700 cursor-pointer'
            }`}
          >
            Quarterly
          </button>
          <button
            onClick={() => setPeriod('annually')}
            className={`px-5 py-2.5 text-xs font-medium rounded-md transition-all duration-200 ${
              period === 'annually'
                ? 'bg-linear-to-r from-solid to-tertiary text-white shadow-md'
                : 'bg-fufu-dim dark:bg-slate-800 text-moringa-muted dark:text-slate-400 hover:bg-mint dark:hover:bg-slate-700 cursor-pointer'
            }`}
          >
            Annually
          </button>
        </div>
      </div>

      <div className="flex items-center justify-center space-x-6 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-linear-to-r from-solid to-tertiary rounded-full"></div>
          <span className="text-xs text-moringa-muted dark:text-slate-400">
            {dataKeys.currentLabel}
          </span>
        </div>
        {dataKeys.previousLabel && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-linear-to-r from-solidOne to-solidTwo rounded-full"></div>
            <span className="text-xs text-moringa-muted dark:text-slate-400">
              {dataKeys.previousLabel}
            </span>
          </div>
        )}
      </div>

      {currentData.length === 0 ? (
        <div className="h-64 sm:h-72 md:h-80 flex items-center justify-center">
          <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
            No order data yet
          </p>
        </div>
      ) : (
        <div className="h-64 sm:h-72 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
              <XAxis
                dataKey="name"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  padding: '8px 12px',
                }}
                formatter={(value) => [value.toLocaleString() + ' orders', '']}
                labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey={dataKeys.current}
                stroke="url(#currentGradient)"
                strokeWidth={3}
                dot={{ fill: '#0F3D2E', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              {dataKeys.previous && (
                <Line
                  type="monotone"
                  dataKey={dataKeys.previous}
                  stroke="url(#previousGradient)"
                  strokeWidth={3}
                  dot={{ fill: '#E8552F', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  strokeDasharray="5 5"
                />
              )}
              <defs>
                <linearGradient id="currentGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0F3D2E" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0A2A20" stopOpacity={0.8} />
                </linearGradient>
                <linearGradient id="previousGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#E8552F" stopOpacity={1} />
                  <stop offset="100%" stopColor="#FFC531" stopOpacity={0.8} />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default OrderTrendsChart;
