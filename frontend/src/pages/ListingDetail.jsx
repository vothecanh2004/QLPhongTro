import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { listingsAPI } from '../api/listings';
import { bookingsAPI } from '../api/bookings';
import { chatAPI } from '../api/chat';
import { favoritesAPI } from '../api/favorites';
import { useAuthStore } from '../store/authStore';
import {
  MapPin,
  Home,
  DollarSign,
  Calendar,
  Heart,
  Phone,
  MessageCircle,
  ArrowLeft,
  Check
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    viewDate: '',
    viewTime: '',
    phone: user?.phone || '',
    message: ''
  });

  useEffect(() => {
    fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data } = await listingsAPI.getListing(id);
      setListing(data.listing);
    } catch (error) {
      console.error(error);
      navigate('/listings');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập');
      return;
    }

    try {
      const { data } = await favoritesAPI.toggleFavorite(listing._id);
      setListing(prev => ({ ...prev, isFavorite: data.isFavorite }));
      toast.success(data.message);
    } catch (error) {
      console.error(error);
    }
  };

  const handleContact = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để liên hệ');
      navigate('/login');
      return;
    }

    try {
      const { data } = await chatAPI.getOrCreateConversation({
        listingId: listing._id,
        recipientId: listing.owner._id
      });
      navigate(`/messages?conversation=${data.conversation._id}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập để đặt lịch');
      return;
    }

    try {
      await bookingsAPI.createBooking({
        listingId: listing._id,
        ...bookingData
      });
      toast.success('Đặt lịch xem phòng thành công!');
      setShowBookingModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  const amenityLabels = {
    wifi: 'Wifi',
    ac: 'Máy lạnh',
    private_bathroom: 'WC riêng',
    parking: 'Chỗ để xe',
    kitchen: 'Bếp',
    washing_machine: 'Máy giặt',
    loft: 'Gác lửng',
    pets: 'Cho phép thú cưng',
    elevator: 'Thang máy',
    security: 'Bảo vệ 24/7'
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-primary-500 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Quay lại</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images Gallery */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
              <div className="aspect-video">
                <img
                  src={listing.images[selectedImage]?.url || 'https://via.placeholder.com/800x600'}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex space-x-2 overflow-x-auto">
                {listing.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImage === idx
                        ? 'border-primary-500'
                        : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`${listing.title} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {listing.title}
                  </h1>
                  <div className="flex items-center text-gray-600 dark:text-gray-400">
                    <MapPin className="w-5 h-5 mr-2" />
                    <span>
                      {listing.address}, {listing.ward && `${listing.ward}, `}
                      {listing.district}, {listing.city}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleFavorite}
                  className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <Heart
                    className={`w-6 h-6 ${
                      listing.isFavorite
                        ? 'fill-red-500 text-red-500'
                        : 'text-gray-600'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center space-x-6 py-4 border-y border-gray-200 dark:border-gray-700">
                <div>
                  <span className="text-3xl font-bold text-primary-500">
                    {new Intl.NumberFormat('vi-VN').format(listing.price)}đ
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">/tháng</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Home className="w-5 h-5 mr-2" />
                  <span>{listing.area}m²</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <DollarSign className="w-5 h-5 mr-2" />
                  <span>Cọc: {new Intl.NumberFormat('vi-VN').format(listing.deposit)}đ</span>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                  Mô tả
                </h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {listing.description}
                </p>
              </div>

              {listing.amenities?.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                    Tiện ích
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {listing.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center space-x-2 text-gray-600 dark:text-gray-400"
                      >
                        <Check className="w-5 h-5 text-emerald-500" />
                        <span>{amenityLabels[amenity]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Map */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                Vị trí
              </h3>
              <div className="h-96 rounded-lg overflow-hidden">
                <MapContainer
                  center={[listing.geo.coordinates[1], listing.geo.coordinates[0]]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker position={[listing.geo.coordinates[1], listing.geo.coordinates[0]]}>
                    <Popup>{listing.title}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Owner Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Thông tin liên hệ
                </h3>
                <div className="flex items-center space-x-3 mb-4">
                  {listing.owner.avatar ? (
                    <img
                      src={listing.owner.avatar}
                      alt={listing.owner.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {listing.owner.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {listing.owner.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Chủ nhà
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {user && (
                    <a
                      href={`tel:${listing.owner.phone}`}
                      className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition"
                    >
                      <Phone className="w-5 h-5" />
                      <span>{listing.owner.phone}</span>
                    </a>
                  )}

                  <button
                    onClick={handleContact}
                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>Nhắn tin</span>
                  </button>

                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 border-2 border-primary-500 text-primary-500 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Đặt lịch xem</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowBookingModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
              Đặt lịch xem phòng
            </h3>
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ngày xem</label>
                <input
                  type="date"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={bookingData.viewDate}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, viewDate: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Giờ xem</label>
                <select
                  required
                  value={bookingData.viewTime}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, viewTime: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                >
                  <option value="">Chọn giờ</option>
                  <option value="08:00">08:00</option>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="14:00">14:00</option>
                  <option value="15:00">15:00</option>
                  <option value="16:00">16:00</option>
                  <option value="17:00">17:00</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Số điện thoại</label>
                <input
                  type="tel"
                  required
                  value={bookingData.phone}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ghi chú (tùy chọn)</label>
                <textarea
                  value={bookingData.message}
                  onChange={(e) =>
                    setBookingData((prev) => ({ ...prev, message: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}