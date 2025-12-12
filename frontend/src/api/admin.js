import client from './client';

export const adminAPI = {
  getDashboard: () => client.get('/admin/dashboard'),
  getUsers: (params) => client.get('/admin/users', { params }),
  updateUserRole: (userId, role) =>
    client.put(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => client.delete(`/admin/users/${userId}`),
  getListings: (params) => client.get('/admin/listings', { params }),
};