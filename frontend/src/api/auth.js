import client from './client';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const getAuthHeaders = () => {
  const token = useAuthStore.getState().accessToken;
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  logout: () => client.post('/auth/logout'),
  getMe: () => client.get('/auth/me'),
  updateProfile: (data) => client.put('/auth/profile', data),
  updatePassword: (data) => client.put('/auth/password', data),
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await axios.post(
      `${import.meta.env.VITE_API_URL || '/api'}/auth/avatar`,
      formData,
      {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response;
  },
};