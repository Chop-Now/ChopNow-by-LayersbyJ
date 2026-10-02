import api from './api';

const reviewService = {
  // Get all reviews for a business
  getBusinessReviews: async (businessId) => {
    try {
      const response = await api.get(`/api/reviews/business/${businessId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get a single review by ID
  getReviewById: async (id) => {
    try {
      const response = await api.get(`/api/reviews/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create a new review (consumer only)
  createReview: async (reviewData) => {
    try {
      const response = await api.post('/api/reviews', reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get current user's reviews
  getMyReviews: async () => {
    try {
      const response = await api.get('/api/reviews/my/list');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update a review
  updateReview: async (id, reviewData) => {
    try {
      const response = await api.put(`/api/reviews/${id}`, reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete a review
  deleteReview: async (id) => {
    try {
      const response = await api.delete(`/api/reviews/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Add business owner response to a review
  addBusinessResponse: async (reviewId, responseText) => {
    try {
      const response = await api.post(`/api/reviews/${reviewId}/response`, {
        response: responseText,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default reviewService;
