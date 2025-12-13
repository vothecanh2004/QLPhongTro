import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { chatAPI } from '../api/chat';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

export function useNotifications() {
  const { user, accessToken } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user || !accessToken) {
      setUnreadCount(0);
      return;
    }

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const { data } = await chatAPI.getUnreadCount();
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Set up polling to refresh unread count
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds

    // Initialize Socket.IO for real-time notifications
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
      console.log('Notification socket connected');
    });

    newSocket.on('new_message', async (data) => {
      // Update unread count
      await fetchUnreadCount();
      
      // Show notification if not in messages page or not viewing this conversation
      const isOnMessagesPage = window.location.pathname === '/messages';
      const currentConversationId = new URLSearchParams(window.location.search).get('conversation');
      const isViewingThisConversation = currentConversationId === data.conversationId;
      
      if (!isOnMessagesPage || !isViewingThisConversation) {
        const message = data.message;
        const senderName = message.sender?.name || 'Ai đó';
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Tin nhắn mới', {
              body: `${senderName}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
              icon: message.sender?.avatar || '/favicon.ico',
              tag: `message-${data.conversationId}`,
              requireInteraction: false,
              badge: '/favicon.ico'
            });
          } catch (error) {
            console.error('Error showing notification:', error);
          }
        }
        
        // Toast notification (only if not viewing this conversation)
        if (!isViewingThisConversation) {
          toast(
            `${senderName}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`,
            {
              duration: 5000,
              icon: '💬',
              style: {
                background: '#4F46E5',
                color: '#fff',
                cursor: 'pointer',
              },
              onClick: () => {
                window.location.href = `/messages?conversation=${data.conversationId}`;
              }
            }
          );
        }
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Notification socket disconnected');
    });

    setSocket(newSocket);

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      clearInterval(interval);
      newSocket.disconnect();
    };
  }, [user, accessToken]);

  const refreshUnreadCount = async () => {
    if (!user || !accessToken) return;
    try {
      const { data } = await chatAPI.getUnreadCount();
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return { unreadCount, refreshUnreadCount };
}

