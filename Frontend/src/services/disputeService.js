import api from './api';

const disputeService = {
  // Create a dispute
  createDispute: async (disputeData) => {
    try {
      const response = await api.post('/api/disputes', disputeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get disputes (Admin or Business)
  getDisputes: async (role, status) => {
    try {
      // Role can be 'admin' or 'business' to target different endpoints if needed
      // ensuring consistency with backend routes
      const endpoint = role === 'business' ? '/api/disputes/business' : '/api/disputes/admin';
      const url = status ? `${endpoint}?status=${status}` : endpoint;

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get dispute by ID
  getDisputeById: async (id) => {
    try {
      const response = await api.get(`/api/disputes/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Resolve/Update dispute (Admin/Support)
  resolveDispute: async (id, resolutionData) => {
    try {
      const response = await api.patch(`/api/disputes/${id}/resolve`, resolutionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Refunds queued for manual processing (Admin/Support)
  getRefundRequests: async (status) => {
    try {
      const response = await api.get('/api/disputes/refund-requests', {
        params: status ? { status } : undefined,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Record that a queued refund was paid back ('completed') or couldn't be ('failed')
  updateRefundRequest: async (id, data) => {
    try {
      const response = await api.patch(`/api/disputes/refund-requests/${id}`, data, {
        silent: true,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get dispute statistics (Admin/Support)
  getDisputeStats: async () => {
    try {
      const response = await api.get('/api/disputes/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default disputeService;
