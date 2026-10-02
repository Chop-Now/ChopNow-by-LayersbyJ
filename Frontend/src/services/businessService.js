import api from './api';

const businessService = {
  // Submit KYC Verification
  submitVerification: async (id, formData) => {
    try {
      const response = await api.post(`/api/businesses/${id}/kyc`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create business
  createBusiness: async (businessData) => {
    try {
      const response = await api.post('/api/businesses', businessData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get my businesses
  getMyBusinesses: async () => {
    try {
      const response = await api.get('/api/businesses/my/list');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get my primary business (first one)
  getMyBusiness: async () => {
    try {
      const response = await api.get('/api/businesses/my/list');
      const businesses = response.data.businesses || response.data || [];
      return businesses[0] || null;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update my business
  updateMyBusiness: async (updates) => {
    try {
      const response = await api.get('/api/businesses/my/list');
      const businesses = response.data.businesses || response.data || [];
      if (businesses.length === 0) {
        throw new Error('No business found');
      }
      const businessId = businesses[0]._id;
      const updateResponse = await api.put(`/api/businesses/${businessId}`, updates);
      return updateResponse.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all businesses (with filters)
  getBusinesses: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/api/businesses?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get pending businesses (admin)
  getPendingBusinesses: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/api/businesses/pending?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get business by ID
  getBusinessById: async (id) => {
    try {
      const response = await api.get(`/api/businesses/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update business
  updateBusiness: async (id, updates) => {
    try {
      const response = await api.put(`/api/businesses/${id}`, updates);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Approve business (admin)
  approveBusiness: async (id, message = '') => {
    try {
      const response = await api.patch(`/api/businesses/${id}/approve`, { message });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reject business (admin)
  rejectBusiness: async (id, reason) => {
    try {
      const response = await api.patch(`/api/businesses/${id}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Request more info (admin)
  requestMoreInfo: async (id, message) => {
    try {
      const response = await api.patch(`/api/businesses/${id}/request-info`, { message });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Rescind business approval (admin)
  rescindBusiness: async (id, reason) => {
    try {
      const response = await api.patch(`/api/businesses/${id}/rescind`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get business stats
  getBusinessStats: async (id) => {
    try {
      const response = await api.get(`/api/businesses/${id}/stats`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload logo
  uploadLogo: async (id, formData) => {
    try {
      const response = await api.post(`/api/businesses/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload cover image
  uploadCoverImage: async (id, formData) => {
    try {
      const response = await api.post(`/api/businesses/${id}/cover`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default businessService;
