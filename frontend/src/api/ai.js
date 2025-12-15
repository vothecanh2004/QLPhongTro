import client from './client';

export const aiAPI = {
  chat: (message, conversationHistory = []) =>
    client.post('/ai/chat', { message, conversationHistory }),
};

