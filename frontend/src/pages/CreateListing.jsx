import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { listingsAPI } from '../api/listings';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { 
  Upload, 
  X, 
  MapPin, 
  Home, 
  DollarSign, 
  Ruler,
  FileText,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';

const schema = z.object({
  title: z.string().min(10, 'Tiêu đề phải có ít nhất 10 ký tự'),
  description: z.string().min(50, 'Mô tả phải có ít nhất 50 ký tự'),
  price: z.number().min(0, 'Giá phải lớn hơn 0'),
  deposit: z.number().min(0).optional(),
  area: z.number().min(1, 'Diện tích phải lớn hơn 0'),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  city: z.string().min(1, 'Vui lòng chọn thành phố'),
  district: z.string().min(1, 'Vui lòng chọn quận/huyện'),
  ward: z.string().optional(),
  type: z.enum(['room', 'house', 'apartment', 'shared']),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const amenitiesOptions = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'ac', label: 'Điều hòa' },
  { value: 'private_bathroom', label: 'Phòng tắm riêng' },
  { value: 'shared_bathroom', label: 'Phòng tắm chung' },
  { value: 'loft', label: 'Gác lửng' },
  { value: 'parking', label: 'Chỗ đậu xe' },
  { value: 'pets', label: 'Cho phép thú cưng' },
  { value: 'kitchen', label: 'Bếp' },
  { value: 'washing_machine', label: 'Máy giặt' },
  { value: 'elevator', label: 'Thang máy' },
  { value: 'security', label: 'Bảo vệ' },
];

const typeOptions = [
  { value: 'room', label: 'Phòng trọ' },
  { value: 'house', label: 'Nhà nguyên căn' },
  { value: 'apartment', label: 'Chung cư' },
  { value: 'shared', label: 'Phòng chung' },
];

const cityOptions = [
  'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
  'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
  'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
  'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
  'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
  'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
  'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
  'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

export default function CreateListing() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [images, setImages] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'room',
      deposit: 0,
    },
  });

  const selectedCity = watch('city');

  // Mock districts - trong thực tế nên lấy từ API
  const getDistricts = (city) => {
    const districtMap = {
      'Hà Nội': ['Ba Đình', 'Hoàn Kiếm', 'Tây Hồ', 'Long Biên', 'Cầu Giấy', 'Đống Đa', 'Hai Bà Trưng', 'Hoàng Mai', 'Thanh Xuân'],
      'Hồ Chí Minh': ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10'],
      'Đà Nẵng': ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ', 'Hòa Vang'],
    };
    return districtMap[city] || ['Quận/Huyện khác'];
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 10) {
      toast.error('Chỉ được upload tối đa 10 ảnh');
      return;
    }

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`Ảnh ${file.name} quá lớn (tối đa 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setImages((prev) => [...prev, { file, preview: e.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (amenity) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  };

  const onSubmit = async (data) => {
    if (images.length === 0) {
      toast.error('Vui lòng upload ít nhất 1 ảnh');
      return;
    }

    if (!user || (user.role !== 'landlord' && user.role !== 'admin')) {
      toast.error('Chỉ chủ nhà mới được đăng tin');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add all form fields
      Object.keys(data).forEach((key) => {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          formData.append(key, data[key]);
        }
      });

      // Add amenities as array
      if (amenities.length > 0) {
        amenities.forEach((amenity) => {
          formData.append('amenities[]', amenity);
        });
      }

      // Add images
      images.forEach((image) => {
        formData.append('images', image.file);
      });

      // Add status
      formData.append('status', 'published');

      const response = await listingsAPI.createListing(formData);
      toast.success('Đăng tin thành công!');
      navigate(`/listings/${response.data.listing._id}`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.[0]?.message || 
                          'Đăng tin thất bại';
      toast.error(errorMessage);
      console.error('Create listing error:', error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  // Update districts when city changes
  useEffect(() => {
    if (selectedCity) {
      setDistricts(getDistricts(selectedCity));
    }
  }, [selectedCity]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Đăng tin cho thuê
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Điền đầy đủ thông tin để đăng tin của bạn
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-5 h-5" />
                <span>Tiêu đề *</span>
              </label>
              <input
                {...register('title')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="VD: Phòng trọ đẹp, gần trung tâm, đầy đủ tiện nghi"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FileText className="w-5 h-5" />
                <span>Mô tả chi tiết *</span>
              </label>
              <textarea
                {...register('description')}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Mô tả chi tiết về phòng trọ, vị trí, tiện nghi..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            {/* Type and Area */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Home className="w-5 h-5" />
                  <span>Loại phòng *</span>
                </label>
                <select
                  {...register('type')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {typeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Ruler className="w-5 h-5" />
                  <span>Diện tích (m²) *</span>
                </label>
                <input
                  type="number"
                  {...register('area', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="VD: 25"
                />
                {errors.area && (
                  <p className="mt-1 text-sm text-red-500">{errors.area.message}</p>
                )}
              </div>
            </div>

            {/* Price and Deposit */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Giá thuê/tháng (VNĐ) *</span>
                </label>
                <input
                  type="number"
                  {...register('price', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="VD: 3000000"
                />
                {errors.price && (
                  <p className="mt-1 text-sm text-red-500">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Tiền cọc (VNĐ)</span>
                </label>
                <input
                  type="number"
                  {...register('deposit', { valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="VD: 3000000"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-5 h-5" />
                <span>Địa chỉ *</span>
              </label>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div>
                  <select
                    {...register('city')}
                    onChange={(e) => {
                      setValue('city', e.target.value);
                      setDistricts(getDistricts(e.target.value));
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Chọn thành phố</option>
                    {cityOptions.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <select
                    {...register('district')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={!selectedCity}
                  >
                    <option value="">Chọn quận/huyện</option>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                  {errors.district && (
                    <p className="mt-1 text-sm text-red-500">{errors.district.message}</p>
                  )}
                </div>

                <div>
                  <input
                    {...register('ward')}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Phường/Xã"
                  />
                </div>
              </div>

              <input
                {...register('address')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Số nhà, tên đường..."
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            {/* Amenities */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Home className="w-5 h-5" />
                <span>Tiện nghi</span>
              </label>
              <div className="grid md:grid-cols-4 gap-3">
                {amenitiesOptions.map((amenity) => (
                  <label
                    key={amenity.value}
                    className="flex items-center space-x-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <input
                      type="checkbox"
                      checked={amenities.includes(amenity.value)}
                      onChange={() => toggleAmenity(amenity.value)}
                      className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {amenity.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <ImageIcon className="w-5 h-5" />
                <span>Ảnh phòng trọ * (Tối đa 10 ảnh)</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Click để chọn ảnh hoặc kéo thả ảnh vào đây
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    JPG, PNG, WEBP (tối đa 5MB mỗi ảnh)
                  </span>
                </label>
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Đăng tin</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
