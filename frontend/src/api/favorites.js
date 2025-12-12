import client from './client';

export const favoritesAPI = {
  getFavorites: () => client.get('/favorites'),
  toggleFavorite: (listingId) => client.post(`/favorites/${listingId}`),
};