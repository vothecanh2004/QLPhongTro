import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  viewDate: {
    type: Date,
    required: true
  },
  viewTime: {
    type: String,
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  phone: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

bookingSchema.index({ listing: 1, user: 1 });
bookingSchema.index({ landlord: 1, status: 1 });

export default mongoose.model('Booking', bookingSchema);