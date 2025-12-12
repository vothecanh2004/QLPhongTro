import { useState } from 'react';
import { X } from 'lucide-react';

const amenitiesOptions = [
  { value: 'wifi', label: 'Wifi' },
  { value: 'ac', label: 'Máy lạnh' },
  { value: 'private_bathroom', label: 'WC riêng' },
  { value: 'parking', label: 'Chỗ để xe' },
  { value: 'kitchen', label: 'Bếp' },
  { value: 'washing_machine', label: 'Máy giặt' },
];

export default function FilterPanel({ onFilter, onClose }) {
  const [filters, setFilters] = useState({
    type: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    amenities: [],
    city: 'Hồ Chí Minh',
    district: '',
  });

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenity) => {
    setFilters((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleApply = () => {
    onFilter(filters);
    if (onClose) onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      type: '',
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
      amenities: [],
      city: 'Hồ Chí Minh',
      district: '',
    };
    setFilters(resetFilters);
    onFilter(resetFilters);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Bộ lọc
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Loại hình */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Loại hình
        </label>
        <select
          value={filters.type}
          onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Tất cả</option>
          <option value="room">Phòng trọ</option>
          <option value="house">Nhà nguyên căn</option>
          <option value="apartment">Chung cư</option>
          <option value="shared">Ở ghép</option>
        </select>
      </div>

      {/* Giá */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Khoảng giá (triệu đồng/tháng)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Từ"
            value={filters.minPrice}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="number"
            placeholder="Đến"
            value={filters.maxPrice}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Diện tích */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Diện tích (m²)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Từ"
            value={filters.minArea}
            onChange={(e) => handleChange('minArea', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="number"
            placeholder="Đến"
            value={filters.maxArea}
            onChange={(e) => handleChange('maxArea', e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Tiện ích */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tiện ích
        </label>
        <div className="grid grid-cols-2 gap-2">
          {amenitiesOptions.map((amenity) => (
            <label key={amenity.value} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.amenities.includes(amenity.value)}
                onChange={() => handleAmenityToggle(amenity.value)}
                className="rounded text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {amenity.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Đặt lại
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}