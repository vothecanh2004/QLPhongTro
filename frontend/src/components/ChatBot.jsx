import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { aiAPI } from '../api/ai';
import { MessageCircle, X, Send, Minimize2, Bot, Loader2, MapPin, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function ChatBot() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Welcome message khi mở lần đầu
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Xin chào! 👋 Tôi là trợ lý AI của NhaTro247.\n\n' +
                 'Tôi có thể trả lời các câu hỏi về:\n' +
                 '🏠 Loại hình phòng trọ\n' +
                 '💰 Giá cả\n' +
                 '📐 Diện tích\n' +
                 '✨ Tiện ích\n' +
                 '📍 Địa điểm\n\n' +
                 'Bạn muốn hỏi gì về phòng trọ?',
        timestamp: new Date()
      }]);
    }
  }, [isOpen]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      // Lấy lịch sử conversation (chỉ lấy 10 tin nhắn gần nhất)
      const conversationHistory = messages
        .slice(-10)
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      const response = await aiAPI.chat(userMessage.content, conversationHistory);
      
      // Kiểm tra response
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }

      const { data } = response;

      if (!data.response) {
        throw new Error('No response from AI');
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(data.timestamp || new Date()),
        suggestedListings: data.suggestedListings || []
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      // Hiển thị thông báo lỗi chi tiết hơn
      let errorMessage = 'Xin lỗi, tôi gặp sự cố kỹ thuật.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
      } else if (!error.response) {
        errorMessage = 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
      }
      
      toast.error(errorMessage);
      
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMessage + '\n\nVui lòng thử lại hoặc liên hệ với chúng tôi nếu vấn đề vẫn tiếp tục.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  if (!user) return null; // Chỉ hiển thị khi đã đăng nhập

  return (
    <>
      {/* Chat Button - Floating */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition hover:scale-110"
            aria-label="Mở chat AI"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed ${
              isMinimized 
                ? 'bottom-6 right-6 w-80 h-16' 
                : 'bottom-6 right-6 w-96 h-[600px]'
            } bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 flex flex-col border border-gray-200 dark:border-gray-700 transition-all duration-300`}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-primary-500 text-white rounded-t-xl">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Trợ lý AI</h3>
                  {!isMinimized && (
                    <p className="text-xs text-primary-100">NhaTro247</p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-primary-600 rounded transition"
                  aria-label={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsMinimized(false);
                  }}
                  className="p-1 hover:bg-primary-600 rounded transition"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary-500 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <div className="flex items-center space-x-2 mb-1">
                            <Bot className="w-4 h-4 text-primary-500" />
                            <span className="text-xs font-semibold text-primary-500">AI Assistant</span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Suggested Listings */}
                        {message.suggestedListings && message.suggestedListings.length > 0 && (
                          <div className="mt-3 space-y-2 border-t border-gray-200 dark:border-gray-600 pt-2">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                              Phòng trọ đề xuất:
                            </p>
                            {message.suggestedListings.map((listing) => (
                              <button
                                key={listing.id}
                                onClick={() => {
                                  navigate(`/listings/${listing.id}`);
                                  setIsOpen(false);
                                }}
                                className="w-full text-left p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition group"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                      {listing.title}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <MapPin className="w-3 h-3 text-gray-500" />
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {listing.address}, {listing.district}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                                        {new Intl.NumberFormat('vi-VN').format(listing.price)}đ/tháng
                                      </p>
                                      <span className="text-xs text-gray-500">•</span>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        {listing.area}m²
                                      </p>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0 ml-2" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <p className={`text-xs mt-1 ${
                          message.role === 'user' 
                            ? 'text-primary-100' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {new Date(message.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">Đang suy nghĩ...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Hỏi về loại hình, giá cả, diện tích, tiện ích, địa điểm..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || loading}
                      className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Gửi tin nhắn"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleClearChat}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                    >
                      Xóa lịch sử
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      AI có thể mắc lỗi. Vui lòng kiểm tra thông tin.
                    </p>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

