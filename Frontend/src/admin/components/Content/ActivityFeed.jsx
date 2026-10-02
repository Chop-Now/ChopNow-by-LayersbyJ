import { Clock, Truck, ShoppingCart, User, Store, Star, Loader2, AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { analyticsService } from '../../../services';

const ActivityFeed = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsService.getRecentActivity(10);
      setActivities(response.activities || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp to relative time
  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
  };

  // Get icon and colors based on activity type
  const getActivityConfig = (type) => {
    const configs = {
      user: {
        Icon: User,
        color: 'text-blue-600',
        bgColor: 'bg-blue-500/10 dark:bg-blue-500/20',
      },
      order: {
        Icon: ShoppingCart,
        color: 'text-green-600',
        bgColor: 'bg-green-500/10 dark:bg-green-500/20',
      },
      delivery: {
        Icon: Truck,
        color: 'text-purple-600',
        bgColor: 'bg-purple-500/10 dark:bg-purple-500/20',
      },
      business: {
        Icon: Store,
        color: 'text-orange-600',
        bgColor: 'bg-orange-500/10 dark:bg-orange-500/20',
      },
      review: {
        Icon: Star,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500/10 dark:bg-yellow-500/20',
      },
    };
    return configs[type] || configs.user;
  };

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 h-full flex flex-col">
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Activity Feed</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Recent System Activities</p>
          </div>
          <button
            onClick={fetchActivities}
            className="text-solid hover:text-tertiary text-sm font-medium cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Loader2 className="w-6 h-6 animate-spin text-solid mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading activities...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <button onClick={fetchActivities} className="mt-2 text-sm text-solid hover:underline">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && activities.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
        </div>
      )}

      {/* Activities List */}
      {!loading && !error && activities.length > 0 && (
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {activities.map((activity) => {
              const { Icon, color, bgColor } = getActivityConfig(activity.type, activity.icon);
              return (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg ${bgColor} flex items-center justify-center mt-1`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                      {activity.title}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                      {activity.description}
                    </p>
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
