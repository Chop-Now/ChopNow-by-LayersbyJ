import api from './api';

const analyticsService = {
  // Get platform overview stats (Admin)
  getPlatformOverview: async () => {
    try {
      const response = await api.get('/api/analytics/platform/overview');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get business overview stats (Business Owner)
  getBusinessOverview: async () => {
    try {
      const response = await api.get('/api/analytics/business/overview');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get my impact (Consumer/Business)
  getMyImpact: async () => {
    try {
      const response = await api.get('/api/analytics/impact/my');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get impact leaderboard
  getImpactLeaderboard: async () => {
    try {
      const response = await api.get('/api/analytics/impact/leaderboard');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get recent platform activity (Admin only)
  getRecentActivity: async (limit = 10) => {
    try {
      const response = await api.get(`/api/analytics/platform/activity?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user activity log (Admin only)
  getUserActivity: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams({
        limit: params.limit || 20,
        page: params.page || 1,
        timeRange: params.timeRange || '7days',
      });
      const response = await api.get(`/api/analytics/user-activity?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get admin dashboard stats (Admin only)
  getAdminStats: async () => {
    try {
      const response = await api.get('/api/analytics/admin/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default analyticsService;
