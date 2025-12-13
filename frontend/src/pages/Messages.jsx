import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { chatAPI } from '../api/chat';
import { useAuthStore } from '../store/authStore';
import { useNotifications } from '../hooks/useNotifications';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import {
  MessageCircle,
  Send,
  ArrowLeft,
  Image as ImageIcon,
  Loader2,
  Search,
  Edit,
  Trash2,
  X,
  MoreVertical,
  Reply,
  Forward,
  Pin,
  Smile
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const { refreshUnreadCount } = useNotifications();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showMessageMenu, setShowMessageMenu] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const fileInputRef = useRef(null);
  
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];

  const conversationId = searchParams.get('conversation');

  useEffect(() => {
    if (!user || !accessToken) {
      navigate('/login');
      return;
    }

    // Initialize Socket.IO
    const socketUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('/api', '') 
      : 'http://localhost:5000';
    
    const newSocket = io(socketUrl, {
      auth: {
        userId: user.id
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('new_message', (data) => {
      if (data.conversationId === selectedConversation?._id) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
        // Mark as read if viewing this conversation
        chatAPI.markAsRead(data.conversationId).catch(console.error);
      }
      // Update conversation list
      fetchConversations();
      // Refresh unread count
      refreshUnreadCount();
    });

    newSocket.on('message_updated', (data) => {
      if (data.conversationId === selectedConversation?._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.message._id ? data.message : msg
          )
        );
      }
      fetchConversations();
    });

    newSocket.on('message_deleted', (data) => {
      if (data.conversationId === selectedConversation?._id) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId
              ? { ...msg, isDeleted: true, content: 'Tin nhắn đã được thu hồi' }
              : msg
          )
        );
      }
      fetchConversations();
    });

    newSocket.on('conversation_deleted', (data) => {
      if (data.conversationId === selectedConversation?._id) {
        setSelectedConversation(null);
        setMessages([]);
        setSearchParams({});
      }
      fetchConversations();
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, accessToken]);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (conversationId) {
      const conversation = conversations.find(c => c._id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        fetchMessages(conversationId);
      }
    } else if (conversations.length > 0) {
      setSelectedConversation(conversations[0]);
      fetchMessages(conversations[0]._id);
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    if (selectedConversation && socket) {
      socket.emit('join_conversation', selectedConversation._id);
      return () => {
        socket.emit('leave_conversation', selectedConversation._id);
      };
    }
  }, [selectedConversation, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMessageMenu && !e.target.closest('.message-menu-container')) {
        setShowMessageMenu(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMessageMenu]);

  const fetchConversations = async () => {
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data.conversations);
      
      if (conversationId) {
        const conversation = data.conversations.find(c => c._id === conversationId);
        if (conversation) {
          setSelectedConversation(conversation);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Không thể tải danh sách tin nhắn');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const { data } = await chatAPI.getMessages(convId);
      setMessages(data.messages);
      
      // Mark messages as read when viewing
      await chatAPI.markAsRead(convId);
      // Refresh unread count
      refreshUnreadCount();
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Không thể tải tin nhắn');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation || sending) return;

    setSending(true);
    try {
      const messageData = {
        conversationId: selectedConversation._id,
        type: selectedImage ? 'image' : 'text',
        content: newMessage.trim() || 'Đã gửi một hình ảnh',
        replyToId: replyingTo?._id || null
      };

      if (selectedImage) {
        messageData.image = selectedImage;
      }

      const apiCall = replyingTo 
        ? chatAPI.replyToMessage(messageData)
        : chatAPI.sendMessage(messageData);

      const { data } = await apiCall;

      setMessages((prev) => [...prev, data.message]);
      setNewMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      setReplyingTo(null);
      scrollToBottom();
      
      // Update conversation list
      fetchConversations();
      // Refresh unread count
      refreshUnreadCount();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ảnh quá lớn (tối đa 5MB)');
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    if (!newContent.trim()) return;

    try {
      const { data } = await chatAPI.updateMessage(messageId, newContent.trim());
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? data.message : msg))
      );
      setEditingMessageId(null);
      setEditContent('');
      toast.success('Đã chỉnh sửa tin nhắn');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Không thể chỉnh sửa tin nhắn');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) return;

    try {
      await chatAPI.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, content: 'Tin nhắn đã được thu hồi' }
            : msg
        )
      );
      toast.success('Đã thu hồi tin nhắn');
      fetchConversations();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Không thể thu hồi tin nhắn');
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;
    if (!confirm('Bạn có chắc muốn xóa cuộc trò chuyện này? Hành động này không thể hoàn tác.')) return;

    try {
      await chatAPI.deleteConversation(selectedConversation._id);
      toast.success('Đã xóa cuộc trò chuyện');
      setSelectedConversation(null);
      setMessages([]);
      setSearchParams({});
      fetchConversations();
      refreshUnreadCount();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Không thể xóa cuộc trò chuyện');
    }
  };

  const handleForwardMessage = async (messageId, targetConversationId = null) => {
    if (!targetConversationId) {
      // Show conversation selector modal
      setForwardingMessage(messageId);
      return;
    }

    try {
      await chatAPI.forwardMessage({
        messageId: forwardingMessage || messageId,
        targetConversationId
      });
      toast.success('Đã chuyển tiếp tin nhắn');
      setForwardingMessage(null);
    } catch (error) {
      console.error('Error forwarding message:', error);
      toast.error('Không thể chuyển tiếp tin nhắn');
    }
  };

  const handlePinMessage = async (messageId, pinned) => {
    try {
      await chatAPI.pinMessage(messageId, pinned);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, pinned } : msg
        )
      );
      toast.success(pinned ? 'Đã ghim tin nhắn' : 'Đã bỏ ghim tin nhắn');
      fetchConversations();
    } catch (error) {
      console.error('Error pinning message:', error);
      toast.error('Không thể ghim tin nhắn');
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      const { data } = await chatAPI.reactToMessage(messageId, emoji);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? data.message : msg
        )
      );
      setShowEmojiPicker(null);
    } catch (error) {
      console.error('Error reacting to message:', error);
      toast.error('Không thể thả cảm xúc');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation.participants) return null;
    return conversation.participants.find(p => p._id !== user.id) || conversation.participants[0];
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const other = getOtherParticipant(conv);
    const listingTitle = conv.listing?.title || '';
    const searchLower = searchQuery.toLowerCase();
    return (
      other?.name?.toLowerCase().includes(searchLower) ||
      listingTitle.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tin nhắn
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-[calc(100vh-200px)] flex">
          {/* Conversations List */}
          <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm cuộc trò chuyện..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có cuộc trò chuyện nào</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => {
                  const other = getOtherParticipant(conversation);
                  const isSelected = selectedConversation?._id === conversation._id;

                  return (
                    <motion.div
                      key={conversation._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        setSearchParams({ conversation: conversation._id });
                        fetchMessages(conversation._id);
                      }}
                      className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                        isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {other?.avatar ? (
                          <img
                            src={other.avatar}
                            alt={other.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {other?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">
                              {other?.name || 'Người dùng'}
                            </p>
                            {conversation.lastMessageAt && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                                  addSuffix: true
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {conversation.listing?.title || 'Phòng trọ'}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 truncate">
                              {conversation.lastMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  {(() => {
                    const other = getOtherParticipant(selectedConversation);
                    return (
                      <div className="flex items-center space-x-3 flex-1">
                        {other?.avatar ? (
                          <img
                            src={other.avatar}
                            alt={other.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                            {other?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {other?.name || 'Người dùng'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedConversation.listing?.title || 'Phòng trọ'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                  <button
                    onClick={handleDeleteConversation}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    title="Xóa cuộc trò chuyện"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4"
                >
                  {messages.map((message) => {
                    const isOwn = message.sender._id === user.id;
                    const isEditing = editingMessageId === message._id;
                    
                    return (
                      <motion.div
                        key={message._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group relative`}
                      >
                        <div className="flex items-end space-x-2">
                          {/* Action buttons - visible on hover */}
                          {!message.isDeleted && (
                            <div className="opacity-0 group-hover:opacity-100 transition flex items-center space-x-1 message-menu-container">
                              {/* Reply button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReplyingTo(message);
                                  setShowMessageMenu(null);
                                }}
                                className="p-1 text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition"
                                title="Trả lời"
                              >
                                <Reply className="w-4 h-4" />
                              </button>

                              {/* Emoji button */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowEmojiPicker(showEmojiPicker === message._id ? null : message._id);
                                    setShowMessageMenu(null);
                                  }}
                                  className="p-1 text-gray-500 hover:text-primary-500 dark:hover:text-primary-400 transition"
                                  title="Thả cảm xúc"
                                >
                                  <Smile className="w-4 h-4" />
                                </button>
                                {showEmojiPicker === message._id && (
                                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 border border-gray-200 dark:border-gray-700 z-20 flex space-x-1">
                                    {commonEmojis.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReactToMessage(message._id, emoji);
                                        }}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-xl"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* More menu (3 dots) */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMessageMenu(showMessageMenu === message._id ? null : message._id);
                                    setShowEmojiPicker(null);
                                  }}
                                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                  title="Thêm"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                                {showMessageMenu === message._id && (
                                  <div className="absolute right-0 bottom-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700 min-w-[140px]">
                                    {isOwn && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingMessageId(message._id);
                                            setEditContent(message.content);
                                            setShowMessageMenu(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                        >
                                          <Edit className="w-4 h-4" />
                                          <span>Chỉnh sửa</span>
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMessage(message._id);
                                            setShowMessageMenu(null);
                                          }}
                                          className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>Thu hồi</span>
                                        </button>
                                      </>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleForwardMessage(message._id);
                                        setShowMessageMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                    >
                                      <Forward className="w-4 h-4" />
                                      <span>Chuyển tiếp</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePinMessage(message._id, !message.pinned);
                                        setShowMessageMenu(null);
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                    >
                                      <Pin className={`w-4 h-4 ${message.pinned ? 'fill-current' : ''}`} />
                                      <span>{message.pinned ? 'Bỏ ghim' : 'Ghim'}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                            } ${message.isDeleted ? 'opacity-60 italic' : ''}`}
                          >
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded border-0"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleEditMessage(message._id, editContent);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingMessageId(null);
                                      setEditContent('');
                                    }
                                  }}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleEditMessage(message._id, editContent)}
                                    className="text-xs px-2 py-1 bg-white/20 rounded"
                                  >
                                    Lưu
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditContent('');
                                    }}
                                    className="text-xs px-2 py-1 bg-white/20 rounded"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Reply preview */}
                                {message.replyTo && (
                                  <div className={`mb-2 p-2 rounded border-l-4 ${
                                    isOwn 
                                      ? 'bg-white/20 border-white/50' 
                                      : 'bg-gray-100 dark:bg-gray-600 border-gray-400'
                                  }`}>
                                    <p className={`text-xs font-semibold ${
                                      isOwn ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                                    }`}>
                                      {message.replyTo.sender?.name || 'Người dùng'}
                                    </p>
                                    <p className={`text-xs truncate ${
                                      isOwn ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {message.replyTo.type === 'image' 
                                        ? '📷 Hình ảnh' 
                                        : message.replyTo.content}
                                    </p>
                                  </div>
                                )}

                                {/* Pinned indicator */}
                                {message.pinned && (
                                  <div className="mb-1 flex items-center space-x-1">
                                    <Pin className="w-3 h-3 fill-current text-yellow-500" />
                                    <span className="text-xs text-yellow-500">Đã ghim</span>
                                  </div>
                                )}

                                {message.type === 'image' && message.imageUrl ? (
                                  <img
                                    src={message.imageUrl}
                                    alt="Message image"
                                    className="max-w-full h-auto rounded-lg mb-2"
                                  />
                                ) : null}
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                
                                {/* Reactions */}
                                {message.reactions && message.reactions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {Object.entries(
                                      message.reactions.reduce((acc, r) => {
                                        if (!acc[r.emoji]) acc[r.emoji] = [];
                                        acc[r.emoji].push(r.user);
                                        return acc;
                                      }, {})
                                    ).map(([emoji, users]) => (
                                      <button
                                        key={emoji}
                                        onClick={() => {
                                          const userReacted = users.some(u => u._id === user.id);
                                          handleReactToMessage(message._id, userReacted ? null : emoji);
                                        }}
                                        className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 ${
                                          users.some(u => u._id === user.id)
                                            ? 'bg-primary-200 dark:bg-primary-800'
                                            : 'bg-gray-200 dark:bg-gray-600'
                                        }`}
                                      >
                                        <span>{emoji}</span>
                                        <span className="text-gray-600 dark:text-gray-300">
                                          {users.length}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <div className="flex items-center space-x-2 mt-1">
                                  <p
                                    className={`text-xs ${
                                      isOwn ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'
                                    }`}
                                  >
                                    {format(new Date(message.createdAt), 'HH:mm')}
                                  </p>
                                  {message.isEdited && (
                                    <span className={`text-xs ${isOwn ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                      (đã chỉnh sửa)
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Image Preview */}
                {imagePreview && (
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 relative">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-xs h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Input */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center space-x-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                      title="Gửi hình ảnh"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={replyingTo ? "Nhập tin nhắn trả lời..." : "Nhập tin nhắn..."}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={(!newMessage.trim() && !selectedImage) || sending}
                      className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Chọn một cuộc trò chuyện để bắt đầu</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setForwardingMessage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Chọn cuộc trò chuyện để chuyển tiếp
            </h3>
            <div className="space-y-2">
              {conversations
                .filter(c => c._id !== selectedConversation?._id)
                .map((conversation) => {
                  const other = getOtherParticipant(conversation);
                  return (
                    <button
                      key={conversation._id}
                      onClick={() => handleForwardMessage(forwardingMessage, conversation._id)}
                      className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition flex items-center space-x-3"
                    >
                      {other?.avatar ? (
                        <img
                          src={other.avatar}
                          alt={other.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {other?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {other?.name || 'Người dùng'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {conversation.listing?.title || 'Phòng trọ'}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
            <button
              onClick={() => setForwardingMessage(null)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

