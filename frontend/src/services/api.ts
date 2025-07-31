import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Sending request to: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Received response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Data type definitions
export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: SourceInfo[];
  responseTime?: number; // 回覆時間（秒）
}

export interface SourceInfo {
  title: string;
  type: string;
  content: string;
  location_score?: number; // 地理位置相關性得分
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface ChatRequest {
  message: string;
  include_sources?: boolean;
  user_location?: UserLocation;
  timestamp?: string;
}

export interface LocationData {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ChatResponse {
  answer: string;
  sources: SourceInfo[];
  success: boolean;
  error?: string;
}

export interface LocationsResponse {
  locations: LocationData[];
  total_count: number;
  success: boolean;
  error?: string;
}

// API service functions
export const apiService = {
  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('Unable to connect to backend service');
    }
  },

  // Send chat message with location and time awareness
  async sendMessage(
    message: string, 
    includeSources: boolean = true,
    userLocation?: UserLocation,
    timestamp?: string
  ): Promise<ChatResponse> {
    try {
      const requestData: ChatRequest = {
        message,
        include_sources: includeSources,
      };
      
      // 加入位置資訊（如果有的話）
      if (userLocation) {
        requestData.user_location = userLocation;
      }
      
      // 加入時間資訊（如果有的話）
      if (timestamp) {
        requestData.timestamp = timestamp;
      }
      
      console.log('Sending enhanced chat request:', requestData);
      
      const response = await api.post('/chat', requestData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to send message');
      }
      throw new Error('Network error, please check connection');
    }
  },

  // Get location data
  async getLocations(limit: number = 200, search?: string): Promise<LocationsResponse> {
    try {
      const params: any = { limit };
      if (search) {
        params.search = search;
      }
      
      const response = await api.get('/locations', { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.detail || 'Failed to get location data');
      }
      throw new Error('Network error, please check connection');
    }
  },

  // Search attractions
  async searchLocations(query: string, limit: number = 10) {
    try {
      const response = await api.get('/search', {
        params: { query, limit }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(error.response.data.detail || 'Search failed');
      }
      throw new Error('Network error, please check connection');
    }
  },
};

export default api;
