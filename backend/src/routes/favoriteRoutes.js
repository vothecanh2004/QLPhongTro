import express from 'express';
import { toggleFavorite, getFavorites } from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getFavorites);
router.post('/:listingId', protect, toggleFavorite);

export default router;