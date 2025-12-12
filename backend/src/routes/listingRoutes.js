import express from 'express';
import {
  createListing,
  getListings,
  getListing,
  updateListing,
  deleteListing,
  getMyListings,
  updateListingStatus,
  getFeaturedListings
} from '../controllers/listingController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/featured', getFeaturedListings);
router.get('/my', protect, authorize('landlord', 'admin'), getMyListings);
router.get('/', getListings);
router.get('/:id', getListing);

router.post(
  '/',
  protect,
  authorize('landlord', 'admin'),
  upload.array('images', 10),
  createListing
);

router.put(
  '/:id',
  protect,
  authorize('landlord', 'admin'),
  upload.array('images', 10),
  updateListing
);

router.patch(
  '/:id/status',
  protect,
  authorize('landlord', 'admin'),
  updateListingStatus
);

router.delete(
  '/:id',
  protect,
  authorize('landlord', 'admin'),
  deleteListing
);

export default router;