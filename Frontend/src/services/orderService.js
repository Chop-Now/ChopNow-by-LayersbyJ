import api from './api';

const orderService = {
  // Create order
  createOrder: async (orderData) => {
    try {
      const response = await api.post('/api/orders', orderData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all orders
  getOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/api/orders?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get order by ID
  getOrderById: async (id) => {
    try {
      const response = await api.get(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Cancel order
  cancelOrder: async (id) => {
    try {
      const response = await api.put(`/api/orders/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update order status (for business owner/admin)
  updateOrderStatus: async (id, status) => {
    try {
      const response = await api.put(`/api/orders/${id}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify pickup code (for business owner/admin)
  verifyPickupCode: async (id, pickupCode) => {
    try {
      const response = await api.post(`/api/orders/${id}/verify-pickup`, { pickupCode });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify pickup code directly (without order ID)
  verifyPickupCodeDirect: async (pickupCode) => {
    try {
      const response = await api.post('/api/orders/verify-pickup-code', { pickupCode });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all orders for admin (across all businesses)
  getAdminOrders: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/api/orders/admin?${params.toString()}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default orderService;
