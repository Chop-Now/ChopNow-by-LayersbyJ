import api from './api';

const settingsService = {
  // Get public settings (no auth required)
  getPublicSettings: async () => {
    const response = await api.get('/api/settings/public');
    return response.data;
  },

  // Get all settings (admin only)
  getAllSettings: async () => {
    const response = await api.get('/api/settings');
    return response.data;
  },

  // Update platform settings (admin only)
  updateSettings: async (settings) => {
    const response = await api.put('/api/settings', settings);
    return response.data;
  },

  // Get commission settings (business owner + admin)
  getCommissionSettings: async () => {
    const response = await api.get('/api/settings/commission');
    return response.data;
  },

  // Check if a specific feature is enabled
  checkFeature: async (featureName) => {
    const response = await api.get(`/api/settings/feature/${featureName}`);
    return response.data;
  },

  // Check maintenance mode
  checkMaintenanceMode: async () => {
    const response = await api.get('/api/settings/maintenance');
    return response.data;
  },
};

export default settingsService;
