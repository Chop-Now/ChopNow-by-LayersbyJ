import api from './api';

const authService = {
  // Register user (buyer or business)
  register: async (userData) => {
    try {
      const response = await api.post('/api/users/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Login user
  login: async (credentials) => {
    try {
      // silent: the login screens show their own error message; avoid a
      // second, generic toast.
      const response = await api.post('/api/users/login', credentials, { silent: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Google login
  googleLogin: async (tokenData) => {
    try {
      const response = await api.post('/api/users/google-login', tokenData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get current user profile
  getProfile: async () => {
    try {
      const response = await api.get('/api/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update profile
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/api/users/profile', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/api/users/profile/password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Upload avatar
  uploadAvatar: async (formData) => {
    try {
      const response = await api.post('/api/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify email with token
  verifyEmail: async (token) => {
    try {
      // silent: VerifyEmail.jsx shows its own error state; avoid a duplicate toast.
      const response = await api.get('/api/users/verify-email', {
        params: { token },
        silent: true,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Resend verification email
  resendVerificationEmail: async (email) => {
    try {
      // silent: callers show their own success/error message.
      const response = await api.post(
        '/api/users/resend-verification',
        { email },
        { silent: true }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/api/users/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify reset OTP
  verifyResetOTP: async (email, otp) => {
    try {
      const response = await api.post('/api/users/verify-reset-otp', { email, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Reset password with token/OTP
  resetPassword: async (email, token, password) => {
    try {
      const response = await api.post('/api/users/reset-password', { email, token, password });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Send OTP for phone verification
  sendOTP: async (phone) => {
    try {
      const response = await api.post('/api/users/send-otp', { phone });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify OTP
  verifyOTP: async (phone, otp) => {
    try {
      const response = await api.post('/api/users/verify-otp', { phone, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Switch active role (for multi-role users)
  switchRole: async (role) => {
    try {
      const response = await api.post('/api/users/switch-role', { role });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add a new role to user
  addRole: async (role, switchToNew = false) => {
    try {
      const response = await api.post('/api/users/add-role', { role, switchToNew });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add address
  addAddress: async (addressData) => {
    try {
      const response = await api.post('/api/users/addresses', addressData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update address
  updateAddress: async (addressId, addressData) => {
    try {
      const response = await api.put(`/api/users/addresses/${addressId}`, addressData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete address
  deleteAddress: async (addressId) => {
    try {
      const response = await api.delete(`/api/users/addresses/${addressId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete user account
  deleteAccount: async () => {
    try {
      const response = await api.delete('/api/users/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get active sessions
  getActiveSessions: async () => {
    try {
      const response = await api.get('/api/users/sessions');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get login activity/history
  getLoginActivity: async (limit = 10) => {
    try {
      const response = await api.get(`/api/users/login-activity?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Logout specific session
  logoutSession: async (sessionId) => {
    try {
      const response = await api.delete(`/api/users/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Logout from all devices
  logoutAllDevices: async () => {
    try {
      const response = await api.post('/api/users/logout-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Request password change OTP
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

  // Change password with OTP
  changePasswordWithOTP: async (otp, newPassword) => {
    try {
      const response = await api.put('/api/users/profile/password', { otp, newPassword });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default authService;
