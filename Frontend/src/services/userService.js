import api from './api';

const userService = {
  // Get all users (admin only)
  getUsers: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/api/users?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user by ID
  getUserById: async (id) => {
    try {
      const response = await api.get(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user (admin only)
  updateUser: async (id, userData) => {
    try {
      const response = await api.put(`/api/users/${id}`, userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Suspend user (admin only)
  suspendUser: async (id) => {
    try {
      const response = await api.patch(`/api/users/${id}/suspend`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Activate user (admin only)
  activateUser: async (id) => {
    try {
      const response = await api.patch(`/api/users/${id}/activate`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete user (admin only)
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Switch active role
  switchRole: async (role) => {
    try {
      const response = await api.post('/api/users/switch-role', { role });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add a new role to user (e.g., consumer becomes business owner)
  addRole: async (role, switchToNew = false) => {
    try {
      const response = await api.post('/api/users/add-role', { role, switchToNew });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Request OTP for password change
  requestPasswordChangeOTP: async (currentPassword) => {
    try {
      const response = await api.post('/api/users/profile/password/request-otp', {
        currentPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Change password with OTP verification
  changePasswordWithOTP: async (otp, newPassword) => {
    try {
      const response = await api.put('/api/users/profile/password', { otp, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Request OTP for sensitive information change (vendor)
  requestSensitiveChangeOTP: async (changeType) => {
    try {
      const response = await api.post('/api/users/request-sensitive-change-otp', { changeType });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify OTP for sensitive change
  verifySensitiveChangeOTP: async (otp) => {
    try {
      const response = await api.post('/api/users/verify-sensitive-change-otp', { otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Apply for rider role
  applyRider: async (formData) => {
    try {
      const response = await api.post('/api/users/apply-rider', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get riders for admin approval
  getRiders: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/api/users/admin/riders?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Review rider application (approve or reject)
  reviewRider: async (id, status, rejectionReason) => {
    try {
      const response = await api.post(`/api/users/admin/riders/${id}/review`, {
        status,
        rejectionReason,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default userService;
