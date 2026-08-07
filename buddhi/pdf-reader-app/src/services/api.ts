// src/services/api.ts

import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { User, Session, UploadedFile } from '../types';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  googleLogin: async (credential: string): Promise<{ user: User; token: string }> => {
    const response = await api.post('/auth/google', { credential });
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  getToken: (): string | null => {
    return localStorage.getItem('authToken');
  },
  
  getUserDetails: async (): Promise<User> => {
    return authAPI.getCurrentUser(); // or add more fields if needed
  },
  
};

export const sessionAPI = {
  getSessions: async (): Promise<Session[]> => {
    const response = await api.get('/sessions');
    return response.data;
  },
  
  createSession: async (name: string): Promise<Session> => {
    const response = await api.post('/sessions', { name });
    return response.data;
  },
  
  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/sessions/${sessionId}`);
  },
  
  renameSession: async (sessionId: string, name: string): Promise<Session> => {
    const response = await api.patch(`/sessions/${sessionId}`, { name });
    return response.data;
  },
};

export const fileAPI = {
  uploadFile: async (sessionId: string, file: File): Promise<UploadedFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', sessionId);
    
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': undefined,
      },
    });
    return response.data;
  },
  
  getSessionFiles: async (sessionId: string): Promise<UploadedFile[]> => {
    const response = await api.get(`/sessions/${sessionId}/files`);
    return response.data;
  },
  
  deleteFile: async (fileId: string): Promise<void> => {
    await api.delete(`/files/${fileId}`);
  },

  getPresignedUrl: async (fileId: string): Promise<string> => {
    const response = await api.post('/files/tempUrl', null, {
      params: { file_id: fileId },
      headers: {'Content-Type': 'application/json'},
    });
    return response.data.temp_url;
  }
};

export default api;