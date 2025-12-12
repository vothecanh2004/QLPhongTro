import Listing from '../models/Listing.js';
import Favorite from '../models/Favorite.js';
import fs from 'fs/promises';
import path from 'path';

export const createListing = async (req, res) => {
  try {
    const listingData = {
      ...req.body,
      owner: req.user.id,
      geo: {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      }
    };

    if (req.files) {
      listingData.images = req.files.map(file => ({
        url: `/uploads/${file.filename}`,
        publicId: file.filename
      }));
    }

    const listing = await Listing.create(listingData);
    res.status(201).json({ listing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getListings = async (req, res) => {
  try {
    const {
      search,
      city,
      district,
      type,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      amenities,
      sort = '-createdAt',
      page = 1,
      limit = 12,
      lat,
      lng,
      radius
    } = req.query;

    const query = { status: 'published' };

    if (search) {
      query.$text = { $search: search };
    }

    if (city) query.city = city;
    if (district) query.district = district;
    if (type) query.type = type;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = parseFloat(minArea);
      if (maxArea) query.area.$lte = parseFloat(maxArea);
    }

    if (amenities) {
      const amenitiesArray = amenities.split(',');
      query.amenities = { $all: amenitiesArray };
    }

    if (lat && lng && radius) {
      query.geo = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radius) * 1000
        }
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const listings = await Listing.find(query)
      .populate('owner', 'name phone avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Listing.countDocuments(query);

    let listingsWithFavorites = listings;
    if (req.user) {
      const favorites = await Favorite.find({
        user: req.user.id,
        listing: { $in: listings.map(l => l._id) }
      });
      
      const favoriteIds = new Set(favorites.map(f => f.listing.toString()));
      listingsWithFavorites = listings.map(listing => ({
        ...listing.toObject(),
        isFavorite: favoriteIds.has(listing._id.toString())
      }));
    }

    res.json({
      listings: listingsWithFavorites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('owner', 'name phone avatar email');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.views += 1;
    await listing.save();

    let isFavorite = false;
    if (req.user) {
      const favorite = await Favorite.findOne({
        user: req.user.id,
        listing: listing._id
      });
      isFavorite = !!favorite;
    }

    res.json({ 
      listing: {
        ...listing.toObject(),
        isFavorite
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updateData = { ...req.body };
    if (req.body.lat && req.body.lng) {
      updateData.geo = {
        type: 'Point',
        coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
      };
    }

    if (req.files && req.files.length > 0) {
      updateData.images = [
        ...listing.images,
        ...req.files.map(file => ({
          url: `/uploads/${file.filename}`,
          publicId: file.filename
        }))
      ];
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({ listing: updatedListing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    for (const image of listing.images) {
      if (image.publicId) {
        const filepath = path.join(process.cwd(), 'uploads', image.publicId);
        try {
          await fs.unlink(filepath);
        } catch (err) {
          console.log('Error deleting file:', err.message);
        }
      }
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const listings = await Listing.find({ owner: req.user.id })
      .sort('-createdAt');
    res.json({ listings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    listing.status = status;
    await listing.save();

    res.json({ listing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeaturedListings = async (req, res) => {
  try {
    const listings = await Listing.find({ 
      status: 'published', 
      featured: true 
    })
      .populate('owner', 'name phone avatar')
      .limit(6)
      .sort('-createdAt');

    res.json({ listings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};