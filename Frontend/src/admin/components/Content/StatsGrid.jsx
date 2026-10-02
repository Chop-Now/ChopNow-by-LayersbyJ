import {
  ArrowDownRight,
  ArrowUpRight,
  ShoppingBasket,
  Store,
  Users,
  Wallet,
  Loader2,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAdminMode } from '../../context/AdminModeContext';
import { analyticsService } from '../../../services';

const StatsGrid = () => {
  const { adminMode } = useAdminMode();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, [adminMode]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use getAdminStats for website mode as it has historical comparison data
      // Use getBusinessOverview for shop mode
      const response =
        adminMode === 'shop'
          ? await analyticsService.getBusinessOverview()
          : await analyticsService.getAdminStats();
      setStats(response);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load stats');
      // Set default values on error
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return 'RWF 0';
    return `RWF ${Number(value).toLocaleString()}`;
  };

  // Format number with K/M suffix
  const formatNumber = (value) => {
    if (value === undefined || value === null) return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  // No historical-comparison endpoint exists for a single business's stats
  // (only the platform-wide admin stats compute real month-over-month deltas
  // - see the websiteAdminStats block below). Report that honestly instead
  // of fabricating a percentage.
  const NO_HISTORY = { value: null, trend: 'up' };

  const shopAdminStats = stats
    ? [
        {
          title: 'Total Revenue',
          value: formatCurrency(stats.revenue || 0),
          change: NO_HISTORY.value,
          trend: NO_HISTORY.trend,
          icon: <Wallet className="w-6 h-6" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-black dark:text-white',
        },
        {
          title: 'Total Orders',
          value: formatNumber(stats.stats?.totalOrders || 0),
          change: NO_HISTORY.value,
          trend: NO_HISTORY.trend,
          icon: <ShoppingBasket className="w-6 h-6" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-grey-200 dark:text-white',
        },
        {
          title: 'CO2e Saved',
          value: `${formatNumber(stats.stats?.impact?.co2Saved || 0)} kg`,
          change: NO_HISTORY.value,
          trend: NO_HISTORY.trend,
          icon: (
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L4 7V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 8V12L14 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-black dark:text-white',
        },
        {
          title: 'Average Rating',
          value: `${(stats.stats?.averageRating || 0).toFixed(1)}/5`,
          change: NO_HISTORY.value,
          trend: NO_HISTORY.trend,
          icon: (
            <svg
              className="w-6 h-6"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ),
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-black dark:text-white',
        },
      ]
    : [];

  const websiteAdminStats = stats
    ? [
        {
          title: 'Total Revenue',
          value: formatCurrency(stats.revenue?.total || 0),
          change:
            stats.revenue?.percentChange !== undefined
              ? `${stats.revenue.percentChange >= 0 ? '+' : ''}${stats.revenue.percentChange}%`
              : '+0%',
          trend: stats.revenue?.trend || 'up',
          icon: <Wallet className="w-6 h-6" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-black dark:text-white',
        },
        {
          title: 'Total Orders',
          value: formatNumber(stats.orders?.total || 0),
          change:
            stats.orders?.percentChange !== undefined
              ? `${stats.orders.percentChange >= 0 ? '+' : ''}${stats.orders.percentChange}%`
              : '+0%',
          trend: stats.orders?.trend || 'up',
          icon: <ShoppingBasket className="w-6 h-6" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-grey-200 dark:text-white',
        },
        {
          title: 'Total Vendors',
          value: formatNumber(stats.businesses?.active || 0),
          change:
            stats.businesses?.percentChange !== undefined
              ? `${stats.businesses.percentChange >= 0 ? '+' : ''}${stats.businesses.percentChange}%`
              : '+0%',
          trend: stats.businesses?.trend || 'up',
          icon: <Store className="w-6 h-6" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-black dark:text-white',
        },
        {
          title: 'Total Users',
          value: formatNumber(stats.users?.total || 0),
          change:
            stats.users?.percentChange !== undefined
              ? `${stats.users.percentChange >= 0 ? '+' : ''}${stats.users.percentChange}%`
              : '+0%',
          trend: stats.users?.trend || 'up',
          icon: <Users className="w-6 h-6" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
          textColor: 'text-black dark:text-white',
        },
      ]
    : [];

  const displayStats = adminMode === 'shop' ? shopAdminStats : websiteAdminStats;

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((_, index) => (
          <div
            key={index}
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 animate-pulse"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </div>
              <div className="w-11 h-11 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state - show placeholder stats
  if (error || !stats) {
    const placeholderStats =
      adminMode === 'shop'
        ? [
            {
              title: 'Total Revenue',
              value: 'RWF 0',
              change: '+0%',
              trend: 'up',
              icon: <Wallet className="w-6 h-6" />,
            },
            {
              title: 'Total Orders',
              value: '0',
              change: '+0%',
              trend: 'up',
              icon: <ShoppingBasket className="w-6 h-6" />,
            },
            {
              title: 'CO2e Saved',
              value: '0 kg',
              change: '+0%',
              trend: 'up',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L4 7V12C4 16.55 7.16 20.74 12 22C16.84 20.74 20 16.55 20 12V7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ),
            },
            {
              title: 'Average Rating',
              value: '0/5',
              change: '+0%',
              trend: 'up',
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              ),
            },
          ]
        : [
            {
              title: 'Total Revenue',
              value: 'RWF 0',
              change: '+0%',
              trend: 'up',
              icon: <Wallet className="w-6 h-6" />,
            },
            {
              title: 'Total Orders',
              value: '0',
              change: '+0%',
              trend: 'up',
              icon: <ShoppingBasket className="w-6 h-6" />,
            },
            {
              title: 'Total Vendors',
              value: '0',
              change: '+0%',
              trend: 'up',
              icon: <Store className="w-6 h-6" />,
            },
            {
              title: 'Total Users',
              value: '0',
              change: '+0%',
              trend: 'up',
              icon: <Users className="w-6 h-6" />,
            },
          ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {placeholderStats.map((stat, index) => (
          <div
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50"
            key={index}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  {stat.value}
                </p>
                <div className="flex items-center space-x-1.5">
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-500">{stat.change}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    vs Last Month
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                <div className="text-black dark:text-white">{stat.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {displayStats.map((stat, index) => {
        return (
          <div
            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 transition-all duration-300 group"
            key={index}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {stat.title}
                </p>
                <p className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                  {stat.value}
                </p>
                <div className="flex items-center space-x-1.5">
                  {stat.change === null ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                      No historical data yet
                    </span>
                  ) : (
                    <>
                      {stat.trend === 'up' ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-red-500" />
                      )}
                      <span
                        className={`text-xs font-semibold ${stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        vs Last Month
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div
                className={`p-2.5 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-all duration-300`}
              >
                <div className={stat.textColor}>{stat.icon}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsGrid;
