import client from './client';

export const chatAPI = {
  getOrCreateConversation: (data) =>
    client.post('/chat/conversations', data),
  getConversations: () => client.get('/chat/conversations'),
  deleteConversation: (conversationId) =>
    client.delete(`/chat/conversations/${conversationId}`),
  getMessages: (conversationId, page = 1) =>
    client.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page },
    }),
  sendMessage: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        if (key === 'image' && data[key] instanceof File) {
          formData.append('image', data[key]);
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return client.post('/chat/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  replyToMessage: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        if (key === 'image' && data[key] instanceof File) {
          formData.append('image', data[key]);
        } else {
          formData.append(key, data[key]);
        }
      }
    });
    return client.post('/chat/messages/reply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  forwardMessage: (data) => client.post('/chat/messages/forward', data),
  pinMessage: (messageId, pinned) => 
    client.patch(`/chat/messages/${messageId}/pin`, { pinned }),
  reactToMessage: (messageId, emoji) =>
    client.patch(`/chat/messages/${messageId}/react`, { emoji }),
  updateMessage: (messageId, content) =>
    client.put(`/chat/messages/${messageId}`, { content }),
  deleteMessage: (messageId) =>
    client.delete(`/chat/messages/${messageId}`),
  markAsRead: (conversationId) =>
    client.put(`/chat/conversations/${conversationId}/read`),
  getUnreadCount: () => client.get('/chat/unread-count'),
};