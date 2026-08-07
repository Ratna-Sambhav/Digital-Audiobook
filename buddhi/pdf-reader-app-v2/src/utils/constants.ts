// src/utils/constants.ts

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB