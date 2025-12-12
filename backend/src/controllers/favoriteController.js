import Favorite from '../models/Favorite.js';
import Listing from '../models/Listing.js';

export const toggleFavorite = async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const existing = await Favorite.findOne({
      user: req.user.id,
      listing: listingId
    });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      return res.json({ 
        message: 'Removed from favorites',
        isFavorite: false
      });
    }

    await Favorite.create({
      user: req.user.id,
      listing: listingId
    });

    res.json({ 
      message: 'Added to favorites',
      isFavorite: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.id })
      .populate({
        path: 'listing',
        populate: { path: 'owner', select: 'name phone avatar' }
      })
      .sort('-createdAt');

    const listings = favorites
      .filter(f => f.listing)
      .map(f => ({
        ...f.listing.toObject(),
        isFavorite: true
      }));

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};