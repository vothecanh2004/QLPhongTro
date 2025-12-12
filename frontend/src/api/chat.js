import client from './client';

export const chatAPI = {
  getOrCreateConversation: (data) =>
    client.post('/chat/conversations', data),
  getConversations: () => client.get('/chat/conversations'),
  getMessages: (conversationId, page = 1) =>
    client.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page },
    }),
  sendMessage: (data) => client.post('/chat/messages', data),
};