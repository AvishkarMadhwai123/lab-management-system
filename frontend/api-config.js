// API Configuration for Render Deployment
// This file centralizes API endpoint configuration

// Determine the environment and set appropriate API base URL
const getApiBaseUrl = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // For production on Render
    if (window.location.hostname.includes('onrender.com')) {
      return 'https://lab-management-backend.onrender.com';
    }
    // For development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }
  
  // Fallback for server-side rendering or other environments
  return process.env.NODE_ENV === 'production' 
    ? 'https://lab-management-backend.onrender.com'
    : 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * API Client utility functions
 */
export class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth-related API calls
  async deleteUser(userId) {
    return this.request(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getUser(userId) {
    return this.request(`/api/users/${userId}`);
  }

  // Health check
  async healthCheck() {
    return this.request('/api/health');
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export individual functions for convenience
export const deleteUser = (userId) => apiClient.deleteUser(userId);
export const getUser = (userId) => apiClient.getUser(userId);
export const healthCheck = () => apiClient.healthCheck();
