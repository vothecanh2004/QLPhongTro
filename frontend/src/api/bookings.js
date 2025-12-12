import client from './client';

export const bookingsAPI = {
  createBooking: (data) => client.post('/bookings', data),
  getMyBookings: () => client.get('/bookings/my'),
  getLandlordBookings: () => client.get('/bookings/landlord'),
  updateStatus: (id, status) =>
    client.patch(`/bookings/${id}/status`, { status }),
};