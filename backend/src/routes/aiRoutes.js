import express from 'express';
import { chatWithAI } from '../controllers/aiController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Test endpoint (không cần auth để test)
router.get('/test', (req, res) => {
  res.json({ 
    message: 'AI routes are working',
    timestamp: new Date()
  });
});

// Tất cả routes đều cần authentication
router.use(protect);

router.post('/chat', chatWithAI);

export default router;

