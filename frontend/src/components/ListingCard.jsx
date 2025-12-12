import { Link } from 'react-router-dom';
import { MapPin, Home, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { favoritesAPI } from '../api/favorites';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function ListingCard({ listing, onFavoriteChange }) {
  const { user } = useAuthStore();
  const [isFavorite, setIsFavorite] = useState(listing.isFavorite || false);
  const [loading, setLoading] = useState(false);

  const handleFavorite = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu tin');
      return;
    }

    setLoading(true);
    try {
      const { data } = await favoritesAPI.toggleFavorite(listing._id);
      setIsFavorite(data.isFavorite);
      toast.success(data.message);
      if (onFavoriteChange) onFavoriteChange();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const typeLabels = {
    room: 'Phòng trọ',
    house: 'Nhà nguyên căn',
    apartment: 'Chung cư',
    shared: 'Ở ghép',
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all overflow-hidden"
    >
      <Link to={`/listings/${listing._id}`} className="block relative">
        <div className="relative h-48 overflow-hidden">
          <img
            src={listing.images?.[0]?.url || 'https://via.placeholder.com/400x300?text=No+Image'}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3">
            <span className="px-3 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
              {typeLabels[listing.type]}
            </span>
          </div>
          {user && (
            <button
              onClick={handleFavorite}
              disabled={loading}
              className="absolute top-3 right-3 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full hover:bg-white dark:hover:bg-gray-700 transition"
            >
              <Heart
                className={`w-5 h-5 ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
                }`}
              />
            </button>
          )}
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
            {listing.title}
          </h3>

          <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-3">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="line-clamp-1">
              {listing.district}, {listing.city}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-primary-500">
                {new Intl.NumberFormat('vi-VN').format(listing.price)}
              </span>
              <span className="text-gray-600 dark:text-gray-400 text-sm ml-1">
                đ/tháng
              </span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm">
              <Home className="w-4 h-4 mr-1" />
              <span>{listing.area}m²</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}