import api from './api';

const favoriteService = {
  // Toggle favorite status for a listing or business
  toggleFavorite: async (favoriteType, referenceId) => {
    try {
      const response = await api.post('/api/favorites/toggle', { favoriteType, referenceId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get all favorites for the current user
  getFavorites: async (type = null) => {
    try {
      const url = type ? `/api/favorites?type=${type}` : '/api/favorites';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Check if an item is favorited
  checkFavorite: async (favoriteType, referenceId) => {
    try {
      const response = await api.get(`/api/favorites/check/${favoriteType}/${referenceId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default favoriteService;
