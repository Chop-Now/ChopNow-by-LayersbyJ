import api from './api';

const notificationService = {
  // Get all notifications
  getNotifications: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/api/notifications?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get notification by ID with full details
  getNotificationById: async (id) => {
    try {
      const response = await api.get(`/api/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Mark a single notification as read
  markAsRead: async (id) => {
    try {
      const response = await api.put(`/api/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      const response = await api.put('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete a notification
  deleteNotification: async (id) => {
    try {
      const response = await api.delete(`/api/notifications/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get unread count
  getUnreadCount: async () => {
    try {
      const response = await api.get('/api/notifications/unread/count');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default notificationService;
