import { useState, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';
import { 
  User, 
  Lock, 
  Save, 
  Camera, 
  Mail, 
  Phone
} from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });

  // Get avatar URL or default
  const getAvatarUrl = () => {
    if (user?.avatar) {
      if (user.avatar.startsWith('http')) {
        return user.avatar;
      }
      // If it starts with /uploads/, use the API base URL
      if (user.avatar.startsWith('/uploads/')) {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        return baseUrl.replace('/api', '') + user.avatar;
      }
      // Otherwise, assume it's a relative path
      return user.avatar;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=4F46E5&color=fff&size=200`;
  };

  // Get cover photo URL or default gradient
  const getCoverUrl = () => {
    // For now, return a gradient. You can add cover photo later
    return null;
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data } = await authAPI.uploadAvatar(file);
      updateUser(data.user);
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload thất bại');
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.updateProfile(profileData);
      updateUser(data.user);
      toast.success('Cập nhật thông tin thành công!');
    } catch (error) {
      toast.error('Cập nhật thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.updatePassword(passwordData);
      toast.success('Đổi mật khẩu thành công!');
      setPasswordData({ currentPassword: '', newPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Cover Photo Section */}
      <div className="relative w-full h-80 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        {getCoverUrl() ? (
          <img 
            src={getCoverUrl()} 
            alt="Cover" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        )}
        
        {/* Cover Photo Edit Button */}
        <button
          onClick={() => coverInputRef.current?.click()}
          className="absolute top-4 right-4 px-4 py-2 bg-black/50 hover:bg-black/70 text-white rounded-lg flex items-center space-x-2 transition"
        >
          <Camera className="w-4 h-4" />
          <span>Chỉnh sửa ảnh bìa</span>
        </button>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            // Cover photo upload can be implemented later
            toast.info('Tính năng upload ảnh bìa sẽ được thêm sau');
          }}
        />
      </div>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">
        {/* Avatar Section */}
        <div className="relative mb-4">
          <div className="relative inline-block">
            <div className="relative w-40 h-40 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-800 shadow-xl">
              <img
                src={getAvatarUrl()}
                alt={user?.name}
                className="w-full h-full object-cover"
              />
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <button
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="absolute bottom-2 right-2 w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center shadow-lg transition disabled:opacity-50"
              title="Đổi ảnh đại diện"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* User Info Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {user?.name || 'Người dùng'}
              </h1>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                {user?.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                )}
                {user?.phone && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-4 h-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
                    {user?.role === 'landlord' ? 'Chủ nhà' : user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-4">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto">
              <button
                onClick={() => setTab('info')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                  tab === 'info'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Thông tin</span>
              </button>
              <button
                onClick={() => setTab('password')}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                  tab === 'password'
                    ? 'text-primary-500 border-b-2 border-primary-500'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Lock className="w-5 h-5" />
                <span>Mật khẩu</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            {tab === 'info' && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Họ tên
                    </label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    <span>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  </button>
                </div>
              </form>
            )}

            {tab === 'password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nhập mật khẩu mới"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-5 h-5" />
                    <span>{loading ? 'Đang lưu...' : 'Đổi mật khẩu'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
