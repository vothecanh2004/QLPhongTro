import express from 'express';
import {
  createBooking,
  getMyBookings,
  getLandlordBookings,
  updateBookingStatus
} from '../controllers/bookingController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, createBooking);
router.get('/my', protect, getMyBookings);
router.get('/landlord', protect, authorize('landlord', 'admin'), getLandlordBookings);
router.patch('/:id/status', protect, updateBookingStatus);

export default router;