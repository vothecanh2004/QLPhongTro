import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  deposit: {
    type: Number,
    default: 0
  },
  area: {
    type: Number,
    required: true,
    min: 1
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  ward: {
    type: String,
    default: ''
  },
  geo: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  type: {
    type: String,
    enum: ['room', 'house', 'apartment', 'shared'],
    required: true
  },
  amenities: [{
    type: String,
    enum: ['wifi', 'ac', 'private_bathroom','shared_bathroom', 'loft', 'parking', 'pets', 'kitchen', 'washing_machine', 'elevator', 'security']
  }],
  images: [{
    url: String,
    publicId: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'hidden', 'rented'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
listingSchema.index({ city: 1, district: 1 });
listingSchema.index({ price: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ owner: 1 });
listingSchema.index({ createdAt: -1 });

export default mongoose.model('Listing', listingSchema);