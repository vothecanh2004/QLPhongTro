import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listingsAPI } from '../api/listings';
import ListingCard from '../components/ListingCard';
import FilterPanel from '../components/FilterPanel';
import SearchBar from '../components/SearchBar';
import { Sliders, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    fetchListings();
  }, [searchParams]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });

      const { data } = await listingsAPI.getListings(params);
      setListings(data.listings);
      setPagination(data.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    const params = new URLSearchParams(searchParams);
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleFilter = (newFilters) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== '') {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else {
          params.set(key, value);
        }
      }
    });
    params.set('page', '1');
    setSearchParams(params);
    setFilters(newFilters);
  };

  const handleSort = (sort) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page);
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition"
          >
            <Sliders className="w-5 h-5" />
            <span>Bộ lọc</span>
          </button>

          <select
            onChange={(e) => handleSort(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow border-0 text-gray-900 dark:text-white"
          >
            <option value="-createdAt">Mới nhất</option>
            <option value="price">Giá tăng dần</option>
            <option value="-price">Giá giảm dần</option>
            <option value="area">Diện tích tăng</option>
            <option value="-area">Diện tích giảm</option>
          </select>
        </div>

        <div className="flex gap-6">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-20">
              <FilterPanel onFilter={handleFilter} />
            </div>
          </div>

          {/* Filters Modal - Mobile */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setShowFilters(false)}
              >
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 overflow-y-auto"
                >
                  <div className="p-4">
                    <FilterPanel
                      onFilter={handleFilter}
                      onClose={() => setShowFilters(false)}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Listings Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-gray-200 dark:bg-gray-700 rounded-xl h-80 animate-pulse"
                  />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Không tìm thấy kết quả phù hợp
                </p>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing._id} listing={listing} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex justify-center items-center space-x-2 mt-8">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Trước
                    </button>

                    <span className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg">
                      {pagination.page} / {pagination.pages}
                    </span>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}