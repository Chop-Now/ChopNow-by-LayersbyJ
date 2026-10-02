import React, { useState, useEffect } from 'react';
import { useAdminMode } from '../context/AdminModeContext';
import analyticsService from '../../services/analyticsService';
import {
  TrendingUp,
  TrendingDown,
  Leaf,
  Droplet,
  UtensilsCrossed,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Clock,
  Users,
  ShoppingCart,
  Package,
  Award,
  Car,
  Trees,
  Waves,
  Home,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

// Shop Admin Overview Component
const ShopAdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBusinessData = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getBusinessOverview();
        if (!isMounted) return;
        setBusinessData(response);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching business data:', err);
        setError(err.message || 'Failed to load business data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchBusinessData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format weekly trend data from API response or use placeholder
  const salesTrendData =
    businessData?.weeklyTrend?.length > 0
      ? businessData.weeklyTrend.map((week, index) => ({
          week: `Week ${index + 1}`,
          sales: week.sales || 0,
          orders: week.orders || 0,
        }))
      : [
          { week: 'Week 1', sales: 0, orders: 0 },
          { week: 'Week 2', sales: 0, orders: 0 },
          { week: 'Week 3', sales: 0, orders: 0 },
          { week: 'Week 4', sales: 0, orders: 0 },
        ];

  // Top selling products from API or empty array
  const topProducts =
    businessData?.topProducts?.map((product, index) => ({
      rank: index + 1,
      name: product.name || 'Unknown Product',
      sold: product.sold || 0,
      revenue: `RWF ${(product.revenue || 0).toLocaleString()}`,
      stock: product.stock || 0,
    })) || [];

  // Calculate totals from API data
  const totalRevenue = businessData?.stats?.totalRevenue || 0;
  const totalOrders = businessData?.stats?.totalOrders || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Placeholder percentage changes (would need historical data to calculate)
  const revenueChange = 0;
  const ordersChange = 0;
  const avgOrderChange = 0;

  const currentWeekSales = salesTrendData[salesTrendData.length - 1]?.sales || 0;
  const previousWeekSales = salesTrendData[salesTrendData.length - 2]?.sales || 1;
  const weeklyChange =
    previousWeekSales > 0
      ? (((currentWeekSales - previousWeekSales) / previousWeekSales) * 100).toFixed(1)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading business data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-moringa dark:text-white">Shop Overview</h1>
        <p className="text-moringa-muted dark:text-slate-400 mt-1">
          View your shop's performance metrics and insights
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Total Revenue
              </p>
              <p className="text-2xl font-bold text-moringa dark:text-white mb-2">
                RWF {totalRevenue.toLocaleString()}
              </p>
              <div className="flex items-center space-x-1.5">
                {revenueChange !== 0 ? (
                  revenueChange > 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )
                ) : null}
                <span
                  className={`text-xs font-semibold ${revenueChange > 0 ? 'text-emerald-500' : revenueChange < 0 ? 'text-red-500' : 'text-moringa-muted/70 dark:text-slate-500'}`}
                >
                  {revenueChange !== 0
                    ? `${revenueChange > 0 ? '+' : ''}${revenueChange}%`
                    : 'No comparison data'}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-solid/10 dark:bg-solid/20 group-hover:scale-110 transition-all duration-300">
              <BarChart3 className="w-6 h-6 text-solid" />
            </div>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Total Orders
              </p>
              <p className="text-2xl font-bold text-moringa dark:text-white mb-2">{totalOrders}</p>
              <div className="flex items-center space-x-1.5">
                {ordersChange !== 0 ? (
                  ordersChange > 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )
                ) : null}
                <span
                  className={`text-xs font-semibold ${ordersChange > 0 ? 'text-emerald-500' : ordersChange < 0 ? 'text-red-500' : 'text-moringa-muted/70 dark:text-slate-500'}`}
                >
                  {ordersChange !== 0
                    ? `${ordersChange > 0 ? '+' : ''}${ordersChange}%`
                    : 'No comparison data'}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 group-hover:scale-110 transition-all duration-300">
              <UtensilsCrossed className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Avg Order Value
              </p>
              <p className="text-2xl font-bold text-moringa dark:text-white mb-2">
                RWF {avgOrderValue.toLocaleString()}
              </p>
              <div className="flex items-center space-x-1.5">
                {avgOrderChange !== 0 ? (
                  avgOrderChange > 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )
                ) : null}
                <span
                  className={`text-xs font-semibold ${avgOrderChange > 0 ? 'text-emerald-500' : avgOrderChange < 0 ? 'text-red-500' : 'text-moringa-muted/70 dark:text-slate-500'}`}
                >
                  {avgOrderChange !== 0
                    ? `${avgOrderChange > 0 ? '+' : ''}${avgOrderChange}%`
                    : 'No comparison data'}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-lg font-bold text-moringa dark:text-white">Sales & Orders Trend</h3>
            <p className="text-xs text-moringa-muted dark:text-slate-400">
              Last 30 days breakdown by week
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                {weeklyChange > 0 ? '+' : ''}
                {weeklyChange}% this week
              </span>
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F3D2E" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#0F3D2E" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
              <XAxis
                dataKey="week"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
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
                formatter={(value, name) => {
                  if (name === 'sales') return ['RWF ' + value.toLocaleString(), 'Sales'];
                  if (name === 'orders') return [value + ' orders', 'Orders'];
                }}
                labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="sales"
                stroke="#0F3D2E"
                strokeWidth={2}
                fill="url(#salesGradient)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-moringa dark:text-white">
            Top 5 Selling Products
          </h2>
          <p className="text-sm text-moringa-muted dark:text-slate-400 mt-1">
            Best performing products this month
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Product Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Units Sold
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Revenue
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product) => (
                <tr
                  key={product.rank}
                  className="border-b border-hairline dark:border-slate-800 hover:bg-fufu dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        product.rank === 1
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : product.rank === 2
                            ? 'bg-hairline dark:bg-slate-700 text-moringa dark:text-slate-300'
                            : product.rank === 3
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              : 'bg-fufu-dim dark:bg-slate-800 text-moringa-muted dark:text-slate-400'
                      }`}
                    >
                      {product.rank}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-moringa dark:text-white">
                    {product.name}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-moringa dark:text-white">
                    {product.sold}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-solid">{product.revenue}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.stock > 50
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : product.stock > 20
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {product.stock} left
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Website Admin Overview Component
const WebsiteAdminOverview = () => {
  const [loading, setLoading] = useState(true);
  const [platformData, setPlatformData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlatformData = async () => {
      try {
        setLoading(true);
        const [overviewResponse, leaderboardResponse] = await Promise.all([
          analyticsService.getPlatformOverview(),
          analyticsService.getImpactLeaderboard(),
        ]);
        if (!isMounted) return;
        setPlatformData(overviewResponse);
        // Format leaderboard data
        const formattedLeaderboard = leaderboardResponse.map((vendor, index) => ({
          rank: index + 1,
          name: vendor.name,
          mealsRescued: vendor.stats?.impact?.mealsRescued || 0,
          co2Saved: vendor.stats?.impact?.co2Saved || 0,
          waterSaved: vendor.stats?.impact?.waterSaved || 0,
        }));
        setLeaderboard(formattedLeaderboard);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching platform data:', err);
        setError(err.message || 'Failed to load platform data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchPlatformData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Default values for when data isn't available
  const totalMealsRescued = platformData?.impact?.totalMealsRescued || 0;
  const totalCo2Saved = platformData?.impact?.totalCo2Saved || 0;
  const totalWaterSaved = platformData?.impact?.totalWaterSaved || 0;

  // Real per-week CO2e saved, from the platform's weekly meals-rescued aggregation
  // (no fabricated split of the running total, no invented "target" line - there's
  // no goal-setting system backing a target).
  const co2TrendData = platformData?.weeklyImpact || [];
  const hasCo2TrendData = co2TrendData.some((week) => week.co2Saved > 0);

  // Use fetched leaderboard or show empty state
  const vendorLeaderboard = leaderboard.length > 0 ? leaderboard : [];

  // L10: no historical-comparison endpoint exists yet to compute real
  // month-over-month deltas here, so these are null rather than a fabricated
  // number - the cards below render "No historical data yet" instead of a
  // fake percentage.
  const mealsChange = null;
  const co2Change = null;
  const waterChange = null;

  const currentWeekCo2 = co2TrendData[3]?.co2Saved || 0;
  const previousWeekCo2 = co2TrendData[2]?.co2Saved || 0;
  const weeklyChange =
    previousWeekCo2 > 0
      ? (((currentWeekCo2 - previousWeekCo2) / previousWeekCo2) * 100).toFixed(1)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading platform data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-moringa dark:text-white">Platform Overview</h1>
        <p className="text-moringa-muted dark:text-slate-400 mt-1">
          Monitor overall platform performance and environmental impact
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Meals Rescued */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Total Meals Rescued
              </p>
              <p className="text-2xl font-bold text-moringa dark:text-white mb-2">
                {totalMealsRescued.toLocaleString()}
              </p>
              <div className="flex items-center space-x-1.5">
                {mealsChange === null ? (
                  <span className="text-xs text-moringa-muted/70 dark:text-slate-500 italic">
                    No historical data yet
                  </span>
                ) : (
                  <>
                    {mealsChange > 0 ? (
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-semibold ${mealsChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                      {mealsChange > 0 ? '+' : ''}
                      {mealsChange}%
                    </span>
                    <span className="text-xs text-moringa-muted dark:text-slate-400">
                      vs Last Month
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-solid/10 dark:bg-solid/20 group-hover:scale-110 transition-all duration-300">
              <UtensilsCrossed className="w-6 h-6 text-solid" />
            </div>
          </div>
        </div>

        {/* Total CO2e Saved */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Total CO2e Saved
              </p>
              <p className="text-2xl font-bold text-moringa dark:text-white mb-2">
                {totalCo2Saved.toLocaleString()} kg
              </p>
              <div className="flex items-center space-x-1.5">
                {co2Change === null ? (
                  <span className="text-xs text-moringa-muted/70 dark:text-slate-500 italic">
                    No historical data yet
                  </span>
                ) : (
                  <>
                    {co2Change > 0 ? (
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-semibold ${co2Change > 0 ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                      {co2Change > 0 ? '+' : ''}
                      {co2Change}%
                    </span>
                    <span className="text-xs text-moringa-muted dark:text-slate-400">
                      vs Last Month
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 group-hover:scale-110 transition-all duration-300">
              <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        {/* Total Water Saved */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
                Total Water Saved
              </p>
              <p className="text-2xl font-bold text-moringa dark:text-white mb-2">
                {(totalWaterSaved / 1000).toFixed(1)}k L
              </p>
              <div className="flex items-center space-x-1.5">
                {waterChange === null ? (
                  <span className="text-xs text-moringa-muted/70 dark:text-slate-500 italic">
                    No historical data yet
                  </span>
                ) : (
                  <>
                    {waterChange > 0 ? (
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-semibold ${waterChange > 0 ? 'text-emerald-500' : 'text-red-500'}`}
                    >
                      {waterChange > 0 ? '+' : ''}
                      {waterChange}%
                    </span>
                    <span className="text-xs text-moringa-muted dark:text-slate-400">
                      vs Last Month
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 group-hover:scale-110 transition-all duration-300">
              <Droplet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* CO2e Saved Trend Chart */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-lg font-bold text-moringa dark:text-white">CO2e Saved Trend</h3>
            <p className="text-xs text-moringa-muted dark:text-slate-400">
              Last 30 days breakdown by week
            </p>
          </div>
          {hasCo2TrendData && (
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                  {weeklyChange > 0 ? '+' : ''}
                  {weeklyChange}% this week
                </span>
              </div>
            </div>
          )}
        </div>
        {hasCo2TrendData ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={co2TrendData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="co2Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
                <XAxis
                  dataKey="week"
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
                  formatter={(value) => [value + ' kg', 'CO2e Saved']}
                  labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="co2Saved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#co2Gradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
              No order activity in the last 4 weeks yet
            </p>
          </div>
        )}
      </div>

      {/* Vendor Leaderboard */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-moringa dark:text-white">
            Top 10 Vendor Leaderboard
          </h2>
          <p className="text-sm text-moringa-muted dark:text-slate-400 mt-1">
            Vendors ranked by environmental impact
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Rank
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Vendor Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Meals Rescued
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  CO2e Saved (kg)
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Water Saved (L)
                </th>
              </tr>
            </thead>
            <tbody>
              {vendorLeaderboard.map((vendor) => (
                <tr
                  key={vendor.rank}
                  className="border-b border-hairline dark:border-slate-800 hover:bg-fufu dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        vendor.rank === 1
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : vendor.rank === 2
                            ? 'bg-hairline dark:bg-slate-700 text-moringa dark:text-slate-300'
                            : vendor.rank === 3
                              ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                              : 'bg-fufu-dim dark:bg-slate-800 text-moringa-muted dark:text-slate-400'
                      }`}
                    >
                      {vendor.rank}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-moringa dark:text-white">
                    {vendor.name}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-moringa dark:text-white">
                    {vendor.mealsRescued.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-green-600 dark:text-green-400">
                    {vendor.co2Saved}
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {vendor.waterSaved.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main Overview Component
export const Overview = () => {
  const { adminMode } = useAdminMode();
  return adminMode === 'shop' ? <ShopAdminOverview /> : <WebsiteAdminOverview />;
};

// Shop Admin Reports Component
const SHOP_REPORT_CATEGORY_COLORS = [
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#64748b',
];

const ShopAdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [businessData, setBusinessData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchReportsData = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getBusinessOverview();
        if (!isMounted) return;
        setBusinessData(response);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching shop reports data:', err);
        setError(err.message || 'Failed to load reports data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReportsData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Revenue vs profit, real per-month totals from completed orders.
  const revenueData = (businessData?.monthlyRevenue || []).map((m) => ({
    month: m.month,
    revenue: m.revenue,
    profit: m.profit,
  }));
  const hasRevenueData = revenueData.some((m) => m.revenue > 0 || m.profit > 0);

  // Real revenue-by-category split.
  const categoryData = (businessData?.categoryBreakdown || []).map((c, i) => ({
    name: c.name,
    value: c.percent,
    color: SHOP_REPORT_CATEGORY_COLORS[i % SHOP_REPORT_CATEGORY_COLORS.length],
  }));

  // Real hourly order distribution over the last 30 days.
  const formatHour = (hour) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}${period}`;
  };
  const peakHoursData = (businessData?.peakHours || []).map((h) => ({
    hour: formatHour(h.hour),
    orders: h.orders,
  }));
  const hasPeakHoursData = peakHoursData.some((h) => h.orders > 0);

  // Real order-status split - no "late delivery" status exists anywhere in
  // the Order model, so this reports what's actually tracked.
  const fb = businessData?.fulfillmentBreakdown;
  const fulfillmentMetrics = fb
    ? [
        { status: 'Completed', value: fb.completed.percent, color: '#10b981' },
        { status: 'In Progress', value: fb.inProgress.percent, color: '#3b82f6' },
        { status: 'Cancelled', value: fb.cancelled.percent, color: '#ef4444' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading reports data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-moringa dark:text-white">Shop Reports</h1>
          <p className="text-moringa-muted dark:text-slate-400 mt-1">
            Generate and download detailed shop reports
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-solid hover:bg-tertiary text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:shadow-solid/20">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Revenue vs Cost Chart */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Revenue & Cost Analysis
        </h3>
        {!hasRevenueData ? (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
              No revenue data yet
            </p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
                  width={60}
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    padding: '8px 12px',
                  }}
                  formatter={(value, name) => [
                    'RWF ' + value.toLocaleString(),
                    name === 'revenue' ? 'Revenue' : 'Profit',
                  ]}
                  labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Bar dataKey="revenue" fill="#0F3D2E" radius={[8, 8, 0, 0]} />
                <Bar dataKey="profit" fill="#E8552F" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
          <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">Sales by Category</h3>
          {categoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
                No completed orders yet
              </p>
            </div>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        padding: '8px 12px',
                      }}
                      formatter={(value) => [`${value}%`, 'Share']}
                      labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {categoryData.map((category) => (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-sm text-moringa-muted dark:text-slate-400">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-moringa dark:text-white">
                      {category.value}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
          <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">Peak Sales Hours</h3>
          {!hasPeakHoursData ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
                No orders in the last 30 days
              </p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
                  <XAxis
                    dataKey="hour"
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
                    formatter={(value) => [value + ' orders', 'Orders']}
                    labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                    itemStyle={{ fontSize: '11px' }}
                  />
                  <Bar dataKey="orders" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Order Fulfillment Status */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Order Fulfillment Status
        </h3>
        {fulfillmentMetrics.length === 0 || !fb.total ? (
          <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">No orders yet</p>
        ) : (
          <div className="space-y-4">
            {fulfillmentMetrics.map((metric) => (
              <div key={metric.status}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-moringa dark:text-slate-300">
                    {metric.status}
                  </span>
                  <span className="text-sm font-bold text-moringa dark:text-white">
                    {metric.value}%
                  </span>
                </div>
                <div className="w-full bg-hairline dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${metric.value}%`, backgroundColor: metric.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Website Admin Reports Component
const WebsiteAdminReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchReportsData = async () => {
      try {
        setLoading(true);
        const statsResponse = await analyticsService.getAdminStats();
        if (!isMounted) return;
        setAdminStats(statsResponse);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching reports data:', err);
        setError(err.message || 'Failed to load reports data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReportsData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Use real data or defaults
  const totalOrders = adminStats?.orders?.total || 0;
  const activeVendors = adminStats?.businesses?.active || 0;
  const totalUsers = adminStats?.users?.total || 0;
  const totalRevenue = adminStats?.revenue?.total || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Real revenue comparison from the admin stats endpoint. There's no monthly
  // revenue history or expenses tracking anywhere in the backend, so rather than
  // splitting the running total into six made-up months we show the two real
  // data points we actually have.
  const revenueData = [
    { month: 'Last Month', revenue: adminStats?.revenue?.lastMonth || 0 },
    { month: 'This Month', revenue: adminStats?.revenue?.thisMonth || 0 },
  ];
  const hasRevenueData = revenueData.some((m) => m.revenue > 0);

  // Category distribution - real revenue-by-category split from completed
  // orders platform-wide (same field the SalesChart widget uses).
  const CATEGORY_COLORS = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff8042',
    '#ffbb28',
    '#00c49f',
    '#0088fe',
    '#a4de6c',
  ];
  const categoryData = (adminStats?.categoryBreakdown || []).map((c, i) => ({
    name: c.name,
    value: c.percent,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  // Order fulfillment data using real stats
  const completedOrders = adminStats?.orders?.completed || 0;
  const pendingOrders = adminStats?.orders?.pending || 0;
  const cancelledOrders = totalOrders - completedOrders - pendingOrders;
  const completedPercentage =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const pendingPercentage = totalOrders > 0 ? Math.round((pendingOrders / totalOrders) * 100) : 0;
  const cancelledPercentage = 100 - completedPercentage - pendingPercentage;

  const fulfillmentData = [
    { type: 'Completed', count: completedOrders, percentage: completedPercentage },
    { type: 'Pending', count: pendingOrders, percentage: pendingPercentage },
    {
      type: 'Cancelled',
      count: cancelledOrders > 0 ? cancelledOrders : 0,
      percentage: cancelledPercentage > 0 ? cancelledPercentage : 0,
    },
  ];

  // Real hourly order distribution over the last 30 days
  const formatHour = (hour) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}${period}`;
  };
  const peakHoursData = (adminStats?.peakHours || []).map((h) => ({
    time: formatHour(h.hour),
    orders: h.orders,
  }));
  const hasPeakHoursData = peakHoursData.some((h) => h.orders > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading reports data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-moringa dark:text-white">Platform Reports</h1>
          <p className="text-moringa-muted dark:text-slate-400 mt-1">
            Generate comprehensive platform-wide reports
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-solid hover:bg-tertiary text-white rounded-lg transition-colors font-medium text-sm">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 rounded-xl p-4 border border-hairline dark:border-slate-700/50">
          <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
            Total Orders
          </p>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            {totalOrders.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900/80 rounded-xl p-4 border border-hairline dark:border-slate-700/50">
          <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
            Active Vendors
          </p>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            {activeVendors.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900/80 rounded-xl p-4 border border-hairline dark:border-slate-700/50">
          <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
            Total Users
          </p>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            {totalUsers.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900/80 rounded-xl p-4 border border-hairline dark:border-slate-700/50">
          <p className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
            Avg Order Value
          </p>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            RWF {avgOrderValue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h3 className="text-lg font-bold text-moringa dark:text-white">Revenue</h3>
            <p className="text-xs text-moringa-muted dark:text-slate-400">
              This month vs. last month (All values in RWF)
            </p>
          </div>
          {hasRevenueData && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-solid"></div>
                <span className="text-xs text-moringa-muted dark:text-slate-400">Revenue</span>
              </div>
            </div>
          )}
        </div>
        {hasRevenueData ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
                  width={60}
                  tickFormatter={(value) => `${value / 1000000}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    padding: '8px 12px',
                  }}
                  formatter={(value) => ['RWF ' + value.toLocaleString(), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#0F3D2E" radius={[6, 6, 0, 0]} maxBarSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
              No completed orders yet
            </p>
          </div>
        )}
      </div>

      {/* Category Distribution & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-moringa dark:text-white">Sales by Category</h3>
            <p className="text-xs text-moringa-muted dark:text-slate-400">Product distribution</p>
          </div>
          {categoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
                No completed orders yet
              </p>
            </div>
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
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
                      formatter={(value) => [value + '%', '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4">
                {categoryData.map((item, index) => (
                  <div className="flex items-center justify-between" key={index}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-moringa-muted dark:text-slate-400">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-moringa dark:text-white">
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-moringa dark:text-white">Peak Order Hours</h3>
            <p className="text-xs text-moringa-muted dark:text-slate-400">
              Orders by hour of day (last 30 days)
            </p>
          </div>
          {hasPeakHoursData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value) => [value + ' orders', '']}
                  />
                  <Bar dataKey="orders" fill="#0F3D2E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
                No orders in the last 30 days yet
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Order Fulfillment Status */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Order Fulfillment Status
        </h3>
        <div className="space-y-4">
          {fulfillmentData.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-moringa dark:text-slate-300">
                  {item.type}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-moringa dark:text-white">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-xs text-moringa-muted dark:text-slate-400">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-hairline dark:bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    item.type === 'Completed'
                      ? 'bg-solid'
                      : item.type === 'Pending'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Reports Component
export const Reports = () => {
  const { adminMode } = useAdminMode();
  return adminMode === 'shop' ? <ShopAdminReports /> : <WebsiteAdminReports />;
};

// Shop Admin Insights Component
const ShopAdminInsights = () => {
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInsightsData = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getBusinessOverview();
        if (!isMounted) return;
        setBusinessData(response);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching insights data:', err);
        setError(err.message || 'Failed to load insights data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInsightsData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Peak Sales Time - derived from real hourly order distribution
  const peakHours = businessData?.peakHours || [];
  const busiestHour = peakHours.reduce((max, h) => (h.orders > (max?.orders || 0) ? h : max), null);
  const formatHour12 = (hour) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}${period}`;
  };
  const totalPeakOrders = peakHours.reduce((sum, h) => sum + h.orders, 0);

  // Avg Cart Value - derived from real completed-order revenue
  const avgOrderValue = businessData?.avgOrderValue || 0;
  const hasAvgOrderValue = avgOrderValue > 0;

  // Customer Retention - derived from real repeat-customer rate
  const returningCustomerRate = businessData?.returningCustomerRate;
  const hasRetentionData = returningCustomerRate !== null && returningCustomerRate !== undefined;

  // Key insights cards - each is real data from the business overview endpoint,
  // or an honest "not available" state when the backend has nothing to back it.
  const insights = [
    {
      title: 'Peak Sales Time',
      value: busiestHour ? formatHour12(busiestHour.hour) : null,
      description:
        busiestHour && totalPeakOrders > 0
          ? `${Math.round((busiestHour.orders / totalPeakOrders) * 100)}% of orders in the last 30 days land in this hour`
          : 'Not enough order history yet',
      icon: Clock,
      color: 'blue',
      trend: busiestHour ? 'Schedule promotions during peak hours' : null,
    },
    {
      title: 'Customer Retention',
      value: hasRetentionData ? `${returningCustomerRate}%` : null,
      description: hasRetentionData
        ? 'Share of customers with more than one completed order'
        : 'Not enough completed orders yet',
      icon: Users,
      color: 'green',
      trend: hasRetentionData ? 'Focus on loyalty programs' : null,
    },
    {
      title: 'Avg. Cart Value',
      value: hasAvgOrderValue ? `RWF ${avgOrderValue.toLocaleString()}` : null,
      description: hasAvgOrderValue
        ? 'Average value of completed orders'
        : 'Not enough completed orders yet',
      icon: ShoppingCart,
      color: 'orange',
      trend: null,
    },
    {
      title: 'Best Category',
      value: null,
      description: 'Category-level sales tracking is not available yet',
      icon: Package,
      color: 'purple',
      trend: null,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading insights data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-moringa dark:text-white">Shop Insights</h1>
        <p className="text-moringa-muted dark:text-slate-400 mt-1">
          Discover insights to grow your business
        </p>
      </div>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight) => (
          <div
            key={insight.title}
            className="bg-white dark:bg-slate-900/80 rounded-2xl p-4 border border-hairline dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`p-2.5 rounded-xl ${
                  insight.color === 'blue'
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : insight.color === 'green'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : insight.color === 'orange'
                        ? 'bg-orange-50 dark:bg-orange-900/20'
                        : 'bg-purple-50 dark:bg-purple-900/20'
                } group-hover:scale-110 transition-all duration-300`}
              >
                <insight.icon
                  className={`w-5 h-5 ${
                    insight.color === 'blue'
                      ? 'text-blue-600 dark:text-blue-400'
                      : insight.color === 'green'
                        ? 'text-green-600 dark:text-green-400'
                        : insight.color === 'orange'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-purple-600 dark:text-purple-400'
                  }`}
                />
              </div>
            </div>
            <h3 className="text-xs font-medium text-moringa-muted dark:text-slate-400 mb-1">
              {insight.title}
            </h3>
            {insight.value !== null ? (
              <p className="text-2xl font-bold text-moringa dark:text-white mb-2">
                {insight.value}
              </p>
            ) : (
              <p className="text-sm font-medium text-moringa-muted/70 dark:text-slate-500 italic mb-2">
                Not available yet
              </p>
            )}
            <p className="text-xs text-moringa-muted dark:text-slate-400 mb-2">
              {insight.description}
            </p>
            {insight.trend && <p className="text-xs font-semibold text-solid">{insight.trend}</p>}
          </div>
        ))}
      </div>

      {/* Customer Behavior Chart */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Customer Behavior (Last 7 Days)
        </h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
            Day-by-day new vs. returning customer tracking is not available yet
          </p>
        </div>
      </div>

      {/* Product Performance Table */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Product Conversion Funnel
        </h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
            Conversion tracking (views, cart adds, checkouts) is not available yet
          </p>
        </div>
      </div>

      {/* Growth Opportunities */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Growth Opportunities
        </h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
            Personalized growth recommendations are not available yet
          </p>
        </div>
      </div>
    </div>
  );
};

// Website Admin Insights Component
const WebsiteAdminInsights = () => {
  const [loading, setLoading] = useState(true);
  const [adminStats, setAdminStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchInsightsData = async () => {
      try {
        setLoading(true);
        const statsResponse = await analyticsService.getAdminStats();
        if (!isMounted) return;
        setAdminStats(statsResponse);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching insights data:', err);
        setError(err.message || 'Failed to load insights data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchInsightsData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real user-count comparison. There's no month-by-month user-growth
  // history tracked anywhere in the backend (only this-month/last-month
  // totals), so this shows the two real data points rather than fabricating
  // a 6-month trend by multiplying the current total by made-up ratios.
  const userGrowthData = [
    { month: 'Last Month', users: adminStats?.users?.lastMonth || 0 },
    { month: 'This Month', users: adminStats?.users?.thisMonth || 0 },
  ];
  const hasUserGrowthData = userGrowthData.some((m) => m.users > 0);

  // Real per-hour order distribution, for the Peak Performance card below.
  const insightsPeakHours = adminStats?.peakHours || [];
  const insightsBusiestHour = insightsPeakHours.reduce(
    (max, h) => (h.orders > (max?.orders || 0) ? h : max),
    null
  );
  const formatHourLabel = (hour) => {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}${period}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading insights data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-moringa dark:text-white">Platform Insights</h1>
        <p className="text-moringa-muted dark:text-slate-400 mt-1">
          Data-driven insights for platform optimization
        </p>
      </div>

      {/* New Signups Chart */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-moringa dark:text-white">New Signups</h3>
          <p className="text-xs text-moringa-muted dark:text-slate-400">
            New user registrations, last month vs this month
          </p>
        </div>
        {!hasUserGrowthData ? (
          <div className="h-72 flex items-center justify-center">
            <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
              No signups recorded yet
            </p>
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
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
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value) => [value.toLocaleString(), '']}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#0F3D2E"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  name="New Signups"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Vendor Performance Metrics - response time, acceptance rate,
          satisfaction and delivery time are not tracked anywhere in the
          backend yet, so this is an honest placeholder rather than the
          fabricated "12 mins" / "94%" / "4.7/5" figures that were here. */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Vendor Performance Metrics
        </h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-moringa-muted/70 dark:text-slate-500 italic">
            Vendor response time, acceptance rate and delivery time tracking is not available yet
          </p>
        </div>
      </div>

      {/* Regional breakdown and user demographics aren't tracked anywhere in
          the backend - the old cards here fabricated a five-city, multi-
          country breakdown (Kigali/Nairobi/Accra/Lagos/Dar es Salaam) that
          implied an international footprint the platform doesn't have. */}

      {/* Key Insights Cards - each derived from real adminStats fields
          rather than fabricated prose ("Orders peak at 6PM with 320 average
          orders", "growing by 18%", "Lagos shows 32% growth" were all
          invented, and the CO2-per-meal figure even contradicted the app's
          own real constant of 2.5kg used elsewhere - see IMPACT_FACTORS in
          Backend/controllers/analyticsController.js). */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                Peak Performance
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {insightsBusiestHour
                  ? `Orders peak around ${formatHourLabel(insightsBusiestHour.hour)}, with ${insightsBusiestHour.orders} orders in the last 30 days. Consider increasing vendor capacity during this time.`
                  : 'Not enough order history yet to identify a peak hour.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Leaf className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-200 mb-1">
                Sustainability Impact
              </h4>
              <p className="text-xs text-green-700 dark:text-green-300">
                {adminStats?.impact?.mealsRescued
                  ? `${adminStats.impact.mealsRescued.toLocaleString()} meals rescued so far, saving ${adminStats.impact.co2Saved.toLocaleString()}kg of CO2e${
                      adminStats.impact.percentChange
                        ? ` (${adminStats.impact.percentChange > 0 ? '+' : ''}${adminStats.impact.percentChange}% this month)`
                        : ''
                    }.`
                  : 'No completed orders yet to measure impact from.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <BarChart3 className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Vendor Growth
              </h4>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                {adminStats?.businesses?.percentChange
                  ? `Active vendors are ${adminStats.businesses.percentChange > 0 ? 'up' : 'down'} ${Math.abs(adminStats.businesses.percentChange)}% this month (${adminStats.businesses.active} active).`
                  : `${adminStats?.businesses?.active || 0} active vendors on the platform.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Insights Component
export const Insights = () => {
  const { adminMode } = useAdminMode();
  return adminMode === 'shop' ? <ShopAdminInsights /> : <WebsiteAdminInsights />;
};

// Shop Admin Impact Component
const ShopAdminImpact = () => {
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchImpactData = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getBusinessOverview();
        if (!isMounted) return;
        setBusinessData(response);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching impact data:', err);
        setError(err.message || 'Failed to load impact data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchImpactData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real monthly meals/CO2e/water trend for this business
  const monthlyImpactData = businessData?.monthlyImpact || [];

  // Real impact by category, with a percentage-share bar to match the old UI
  const categoryImpact = (businessData?.categoryImpact || []).map((c) => ({
    category: c.name,
    meals: c.meals,
    co2: c.co2,
    water: c.water,
    percentage: c.percent,
  }));

  // Real totals, straight from the business's tracked impact stats
  const totalMeals = businessData?.stats?.impact?.mealsRescued || 0;
  const totalCo2 = businessData?.stats?.impact?.co2Saved || 0; // kg
  const totalWater = businessData?.stats?.impact?.waterSaved || 0; // liters
  const shopRank = businessData?.platformRank || null; // real position among all vendors

  // Environmental equivalents, computed from the real totals above (the
  // conversion factors themselves - kg CO2/car/year, kg CO2/tree/year,
  // liters/Olympic pool - are public reference constants, not fabricated data)
  const equivalents = {
    carsOffRoad: (totalCo2 / 4600).toFixed(1), // avg car produces 4.6 tons CO2/year
    treesPlanted: Math.round(totalCo2 / 21), // 1 tree absorbs 21kg CO2/year
    poolsFilled: (totalWater / 75000).toFixed(2), // Olympic pool = 75,000 liters
    householdsPowered: ((totalMeals * 0.5) / 30).toFixed(1), // Rough estimate
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading impact data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-moringa dark:text-white">Shop Impact</h1>
        <p className="text-moringa-muted dark:text-slate-400 mt-1">
          Track your environmental and social impact
        </p>
      </div>

      {/* Impact Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Meals Rescued */}
        <div className="bg-linear-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-xl hover:shadow-blue-200/30 dark:hover:shadow-blue-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/40 group-hover:scale-110 transition-all duration-300">
              <UtensilsCrossed className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Meals Rescued</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-white mb-2">
            {totalMeals.toLocaleString()}
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400/70 font-medium italic">
            No historical data yet
          </p>
        </div>

        {/* CO2e Saved */}
        <div className="bg-linear-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-2xl p-5 border border-green-200/50 dark:border-green-700/50 hover:shadow-xl hover:shadow-green-200/30 dark:hover:shadow-green-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/40 group-hover:scale-110 transition-all duration-300">
              <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">CO2e Saved</p>
          <p className="text-3xl font-bold text-green-900 dark:text-white mb-2">
            {totalCo2.toLocaleString()} kg
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            Environmental impact
          </p>
        </div>

        {/* Water Saved */}
        <div className="bg-linear-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-800/20 rounded-2xl p-5 border border-cyan-200/50 dark:border-cyan-700/50 hover:shadow-xl hover:shadow-cyan-200/30 dark:hover:shadow-cyan-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/40 group-hover:scale-110 transition-all duration-300">
              <Droplet className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300 mb-1">Water Saved</p>
          <p className="text-3xl font-bold text-cyan-900 dark:text-white mb-2">
            {totalWater.toLocaleString()} L
          </p>
          <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
            Resource conservation
          </p>
        </div>

        {/* Shop Ranking */}
        <div className="bg-linear-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 rounded-2xl p-5 border border-orange-200/50 dark:border-orange-700/50 hover:shadow-xl hover:shadow-orange-200/30 dark:hover:shadow-orange-900/20 transition-all duration-300 group">
          <div className="flex items-start justify-between mb-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900/40 group-hover:scale-110 transition-all duration-300">
              <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">
            Platform Rank
          </p>
          <p className="text-3xl font-bold text-orange-900 dark:text-white mb-2">
            {shopRank !== null ? `#${shopRank}` : '—'}
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
            By meals rescued, among all vendors
          </p>
        </div>
      </div>

      {/* Monthly Impact Trend */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Monthly Impact Trend
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyImpactData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
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
                formatter={(value, name) => {
                  if (name === 'meals') return [value + ' meals', 'Meals Rescued'];
                  if (name === 'co2') return [value + ' kg', 'CO2e Saved'];
                  if (name === 'water') return [(value / 1000).toFixed(1) + 'k L', 'Water Saved'];
                }}
                labelStyle={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="meals"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="co2"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="water"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Impact Table */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">Impact by Category</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Category
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Meals
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  CO2e (kg)
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Water (L)
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryImpact.length > 0 ? (
                categoryImpact.map((item) => (
                  <tr
                    key={item.category}
                    className="border-b border-hairline dark:border-slate-800 hover:bg-fufu dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-moringa dark:text-white">
                      {item.category}
                    </td>
                    <td className="py-3 px-4 text-sm text-moringa dark:text-slate-300">
                      {item.meals}
                    </td>
                    <td className="py-3 px-4 text-sm text-moringa dark:text-slate-300">
                      {item.co2}
                    </td>
                    <td className="py-3 px-4 text-sm text-moringa dark:text-slate-300">
                      {item.water.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[100px] bg-hairline dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-solid h-2 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-moringa dark:text-white">
                          {item.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-moringa-muted/70 dark:text-slate-500 italic"
                  >
                    No completed orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Environmental Equivalents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-5 border border-hairline dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Car className="w-5 h-5 text-moringa-muted dark:text-slate-400" />
            <span className="text-sm font-medium text-moringa dark:text-slate-300">
              Cars Off Road
            </span>
          </div>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            {equivalents.carsOffRoad}
          </p>
          <p className="text-xs text-moringa-muted dark:text-slate-400 mt-1">For a full year</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-5 border border-hairline dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Trees className="w-5 h-5 text-moringa-muted dark:text-slate-400" />
            <span className="text-sm font-medium text-moringa dark:text-slate-300">
              Trees Planted
            </span>
          </div>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            {equivalents.treesPlanted}
          </p>
          <p className="text-xs text-moringa-muted dark:text-slate-400 mt-1">Carbon absorbed</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-5 border border-hairline dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Waves className="w-5 h-5 text-moringa-muted dark:text-slate-400" />
            <span className="text-sm font-medium text-moringa dark:text-slate-300">
              Olympic Pools
            </span>
          </div>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            {equivalents.poolsFilled}
          </p>
          <p className="text-xs text-moringa-muted dark:text-slate-400 mt-1">Water saved</p>
        </div>

        <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-5 border border-hairline dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Home className="w-5 h-5 text-moringa-muted dark:text-slate-400" />
            <span className="text-sm font-medium text-moringa dark:text-slate-300">
              Households Fed
            </span>
          </div>
          <p className="text-2xl font-bold text-moringa dark:text-white">
            {equivalents.householdsPowered}
          </p>
          <p className="text-xs text-moringa-muted dark:text-slate-400 mt-1">For a month</p>
        </div>
      </div>

      {/* Impact Statement Banner */}
      <div className="bg-linear-to-r from-solid/10 via-solid/5 to-tertiary/10 dark:from-solid/20 dark:via-solid/10 dark:to-tertiary/20 rounded-2xl p-6 border border-solid/20 dark:border-solid/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-solid/20 dark:bg-solid/30 rounded-xl">
            <Sparkles className="w-6 h-6 text-solid" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-moringa dark:text-white mb-2">
              Your Impact Matters!
            </h3>
            <p className="text-sm text-moringa dark:text-slate-300 leading-relaxed">
              By rescuing {totalMeals.toLocaleString()} meals, you've saved{' '}
              {totalCo2.toLocaleString()} kg of CO2e from entering the atmosphere and conserved{' '}
              {totalWater.toLocaleString()} liters of water.
              {shopRank !== null && (
                <>
                  {' '}
                  You're ranked <strong>#{shopRank}</strong> among all vendors on ChopNow.
                </>
              )}{' '}
              Keep up the amazing work in fighting food waste and protecting our planet! 🌍
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Website Admin Impact Component
const WebsiteAdminImpact = () => {
  const [loading, setLoading] = useState(true);
  const [platformData, setPlatformData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchImpactData = async () => {
      try {
        setLoading(true);
        const response = await analyticsService.getPlatformOverview();
        if (!isMounted) return;
        setPlatformData(response);
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching impact data:', err);
        setError(err.message || 'Failed to load impact data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchImpactData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real monthly meals/CO2e/water trend, platform-wide
  const monthlyImpactData = platformData?.monthlyImpact || [];

  // Real impact by category, platform-wide - colors are assigned by position
  // since the category itself is the only real, non-fabricated data
  const CATEGORY_COLORS = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#8b5cf6',
    '#ef4444',
    '#6b7280',
    '#06b6d4',
  ];
  const categoryImpactData = (platformData?.categoryImpact || []).map((c, index) => ({
    category: c.name,
    meals: c.meals,
    co2: c.co2,
    water: c.water,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }));
  const maxCategoryMeals = Math.max(1, ...categoryImpactData.map((c) => c.meals));

  // Total cumulative impact - real, from Business.stats.impact summed platform-wide
  const totalImpact = {
    meals: platformData?.impact?.totalMealsRescued || 0,
    co2: platformData?.impact?.totalCo2Saved || 0,
    water: platformData?.impact?.totalWaterSaved || 0,
    wasteReduced: platformData?.impact?.totalFoodWasteSaved || 0, // kg
  };

  // Environmental equivalents, computed from the real totals above (the
  // conversion factors - kg CO2/car/year, kg CO2/tree/year, liters/Olympic
  // pool - are public reference constants, not fabricated data)
  const environmentalEquivalents = [
    {
      title: 'Cars Off Road',
      value: (totalImpact.co2 / 4600).toFixed(1),
      description: 'Equivalent to taking this many cars off the road for a year',
      icon: '🚗',
    },
    {
      title: 'Trees Planted',
      value: Math.round(totalImpact.co2 / 21).toLocaleString(),
      description: 'Equal to planting this many trees annually',
      icon: '🌳',
    },
    {
      title: 'Olympic Pools',
      value: (totalImpact.water / 75000).toFixed(2),
      description: 'Water saved could fill this many Olympic swimming pools',
      icon: '🏊',
    },
    {
      title: 'Households Fed',
      value: ((totalImpact.meals * 0.5) / 30).toFixed(1),
      description: 'Rough estimate of households fed for a month',
      icon: '⚡',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-solid border-t-transparent rounded-full animate-spin"></div>
          <p className="text-moringa-muted dark:text-slate-400">Loading impact data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500 mb-2">Error loading data</p>
          <p className="text-moringa-muted dark:text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-moringa dark:text-white">Platform Impact</h1>
        <p className="text-moringa-muted dark:text-slate-400 mt-1">
          Measure the platform's overall environmental and social impact
        </p>
      </div>

      {/* Total Impact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-solid to-tertiary rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <UtensilsCrossed className="w-8 h-8 opacity-80" />
            <span className="text-3xl">🍽️</span>
          </div>
          <p className="text-sm opacity-90 mb-1">Total Meals Rescued</p>
          <p className="text-3xl font-bold">{totalImpact.meals.toLocaleString()}</p>
          <p className="text-xs opacity-75 mt-2">Since platform launch</p>
        </div>

        <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Leaf className="w-8 h-8 opacity-80" />
            <span className="text-3xl">🌱</span>
          </div>
          <p className="text-sm opacity-90 mb-1">CO2e Emissions Saved</p>
          <p className="text-3xl font-bold">{totalImpact.co2.toLocaleString()} kg</p>
          <p className="text-xs opacity-75 mt-2">Carbon footprint reduced</p>
        </div>

        <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Droplet className="w-8 h-8 opacity-80" />
            <span className="text-3xl">💧</span>
          </div>
          <p className="text-sm opacity-90 mb-1">Water Conserved</p>
          <p className="text-3xl font-bold">{(totalImpact.water / 1000).toFixed(0)}k L</p>
          <p className="text-xs opacity-75 mt-2">Liters saved from waste</p>
        </div>

        <div className="bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-3xl">♻️</span>
            <span className="text-3xl">🗑️</span>
          </div>
          <p className="text-sm opacity-90 mb-1">Waste Reduced</p>
          <p className="text-3xl font-bold">{(totalImpact.wasteReduced / 1000).toFixed(1)}t</p>
          <p className="text-xs opacity-75 mt-2">Tonnes diverted from landfills</p>
        </div>
      </div>

      {/* Monthly Impact Trend */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-hairline dark:border-slate-700/50 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-moringa dark:text-white">Monthly Impact Trend</h3>
          <p className="text-xs text-moringa-muted dark:text-slate-400">
            Environmental impact over time
          </p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyImpactData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#94a3b8" />
              <XAxis
                dataKey="month"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                }}
                formatter={(value, name) => {
                  if (name === 'meals') return [value.toLocaleString() + ' meals', 'Meals Rescued'];
                  if (name === 'co2') return [value.toLocaleString() + ' kg', 'CO2e Saved'];
                  if (name === 'water') return [(value / 1000).toFixed(0) + 'k L', 'Water Saved'];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="meals"
                stroke="#0F3D2E"
                strokeWidth={3}
                dot={{ r: 5 }}
                name="Meals Rescued"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="co2"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5 }}
                name="CO2e Saved (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Impact by Category */}
      <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-hairline dark:border-slate-700/50">
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Impact by Food Category
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hairline dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Category
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Meals Rescued
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  CO2e Saved (kg)
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Water Saved (L)
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-moringa dark:text-slate-300">
                  Impact
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryImpactData.length > 0 ? (
                categoryImpactData.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-hairline dark:border-slate-800 hover:bg-fufu dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm font-medium text-moringa dark:text-white">
                          {item.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-moringa dark:text-white">
                      {item.meals.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-green-600 dark:text-green-400">
                      {item.co2.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {item.water.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-hairline dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${(item.meals / maxCategoryMeals) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-moringa-muted/70 dark:text-slate-500 italic"
                  >
                    No completed orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Environmental Equivalents */}
      <div>
        <h3 className="text-lg font-bold text-moringa dark:text-white mb-4">
          Environmental Equivalents
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {environmentalEquivalents.map((item, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-900/80 rounded-2xl p-5 border border-hairline dark:border-slate-700/50 hover:shadow-xl transition-all duration-300"
            >
              <div className="text-4xl mb-3">{item.icon}</div>
              <p className="text-3xl font-bold text-moringa dark:text-white mb-1">{item.value}</p>
              <p className="text-sm font-semibold text-moringa dark:text-slate-300 mb-2">
                {item.title}
              </p>
              <p className="text-xs text-moringa-muted dark:text-slate-400">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Impact Statement */}
      <div className="bg-linear-to-r from-solid to-tertiary rounded-2xl p-8 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-3">Our Collective Impact</h3>
          <p className="text-lg opacity-90 mb-4">
            Together with our vendors and customers, we've rescued{' '}
            <span className="font-bold">{totalImpact.meals.toLocaleString()} meals</span>, saved{' '}
            <span className="font-bold">{totalImpact.co2.toLocaleString()} kg of CO2e</span>, and
            conserved{' '}
            <span className="font-bold">
              {(totalImpact.water / 1000).toFixed(0)}k liters of water
            </span>
            .
          </p>
          <p className="text-sm opacity-75">
            Every meal rescued is a step towards a more sustainable future. Let's continue making a
            difference together.
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Impact Component
export const Impact = () => {
  const { adminMode } = useAdminMode();
  return adminMode === 'shop' ? <ShopAdminImpact /> : <WebsiteAdminImpact />;
};
