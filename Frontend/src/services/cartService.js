import api from './api';

const cartService = {
  // Get user's cart from server
  getCart: async () => {
    try {
      const response = await api.get('/api/cart');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add item to cart
  addToCart: async (listingId, quantity = 1) => {
    try {
      const response = await api.post('/api/cart/add', { listingId, quantity });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update item quantity
  updateCartItem: async (listingId, quantity) => {
    try {
      const response = await api.put('/api/cart/update', { listingId, quantity });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Remove item from cart
  removeFromCart: async (listingId) => {
    try {
      const response = await api.delete(`/api/cart/remove/${listingId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Clear entire cart
  clearCart: async () => {
    try {
      const response = await api.delete('/api/cart/clear');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Sync local cart with server cart (call on login, silent mode)
  syncCart: async (localCart) => {
    try {
      const response = await api.post('/api/cart/sync', { localCart }, { silent: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Replace entire server cart (silent mode - no toast on error)
  setCart: async (cartItems) => {
    try {
      const response = await api.put('/api/cart/set', { cartItems }, { silent: true });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default cartService;
