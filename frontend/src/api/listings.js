import client from './client';

export const listingsAPI = {
  getListings: (params) => client.get('/listings', { params }),
  getListing: (id) => client.get(`/listings/${id}`),
  getFeatured: () => client.get('/listings/featured'),
  getMyListings: () => client.get('/listings/my'),
  createListing: (formData) => 
    client.post('/listings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateListing: (id, formData) =>
    client.put(`/listings/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateStatus: (id, status) =>
    client.patch(`/listings/${id}/status`, { status }),
  deleteListing: (id) => client.delete(`/listings/${id}`),
};