import { useState } from 'react';
import { Search, MapPin, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ onSearch }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query);
    } else {
      navigate(`/listings?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2">
        <div className="flex-1 flex items-center space-x-3 px-4">
          <MapPin className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo địa điểm, quận, tiện ích..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition flex items-center space-x-2"
        >
          <Search className="w-5 h-5" />
          <span className="hidden sm:inline">Tìm kiếm</span>
        </button>
      </div>
    </form>
  );
}