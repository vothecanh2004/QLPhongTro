import express from 'express';
import {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadCount,
  updateMessage,
  deleteMessage,
  deleteConversation,
  replyToMessage,
  forwardMessage,
  pinMessage,
  reactToMessage
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/conversations', protect, getOrCreateConversation);
router.get('/conversations', protect, getConversations);
router.delete('/conversations/:conversationId', protect, deleteConversation);
router.get('/conversations/:conversationId/messages', protect, getMessages);
router.post('/messages', protect, upload.single('image'), sendMessage);
router.post('/messages/reply', protect, upload.single('image'), replyToMessage);
router.post('/messages/forward', protect, forwardMessage);
router.put('/messages/:messageId', protect, updateMessage);
router.patch('/messages/:messageId/pin', protect, pinMessage);
router.patch('/messages/:messageId/react', protect, reactToMessage);
router.delete('/messages/:messageId', protect, deleteMessage);
router.put('/conversations/:conversationId/read', protect, markMessagesAsRead);
router.get('/unread-count', protect, getUnreadCount);

export default router;