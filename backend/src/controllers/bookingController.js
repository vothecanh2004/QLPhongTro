import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';

export const createBooking = async (req, res) => {
  try {
    const { listingId, viewDate, viewTime, message, phone } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (listing.owner.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot book your own listing' });
    }

    const booking = await Booking.create({
      listing: listingId,
      user: req.user.id,
      landlord: listing.owner,
      viewDate,
      viewTime,
      message,
      phone
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('listing', 'title address images')
      .populate('user', 'name phone email');

    // Emit socket event to landlord
    const io = req.app.get('io');
    io.to(listing.owner.toString()).emit('new_booking', populatedBooking);

    res.status(201).json({ booking: populatedBooking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('listing', 'title address images price')
      .populate('landlord', 'name phone email')
      .sort('-createdAt');

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getLandlordBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ landlord: req.user.id })
      .populate('listing', 'title address images')
      .populate('user', 'name phone email')
      .sort('-createdAt');

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.landlord.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = status;
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('listing', 'title address')
      .populate('user', 'name');

    // Emit socket event to user
    const io = req.app.get('io');
    io.to(booking.user.toString()).emit('booking_updated', populatedBooking);

    res.json({
      booking: populatedBooking
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};