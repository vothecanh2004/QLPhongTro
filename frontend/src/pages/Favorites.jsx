
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { favoritesAPI } from '../api/favorites';
import ListingCard from '../components/ListingCard';
import { Heart, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function Favorites() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const { data } = await favoritesAPI.getFavorites();
      setListings(data.listings);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (listingId) => {
    try {
      await favoritesAPI.toggleFavorite(listingId);
      setListings(listings.filter(listing => listing._id !== listingId));
      toast.success('Đã xóa khỏi yêu thích');
    } catch (error) {
      console.error(error);
      toast.error('Không thể xóa khỏi yêu thích');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Trở về trang chủ</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-100 dark:bg-primary-900 rounded-lg">
              <Heart className="w-6 h-6 text-primary-600 dark:text-primary-400 fill-current" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Phòng trọ yêu thích
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {listings.length} phòng trọ đã lưu
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-200 dark:bg-gray-700 rounded-xl h-80 animate-pulse"
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Chưa có phòng trọ yêu thích
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Bắt đầu khám phá và lưu những phòng trọ bạn quan tâm
            </p>
            <Link
              to="/listings"
              className="inline-block px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition"
            >
              Khám phá phòng trọ
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div key={listing._id} className="relative">
                <ListingCard listing={listing} />
                <button
                  onClick={() => handleRemoveFavorite(listing._id)}
                  className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition group"
                  title="Xóa khỏi yêu thích"
                >
                  <Heart className="w-5 h-5 text-red-500 fill-current group-hover:scale-110 transition" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

