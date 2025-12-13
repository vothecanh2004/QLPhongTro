import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Listing from '../models/Listing.js';
import fs from 'fs/promises';
import path from 'path';

export const getOrCreateConversation = async (req, res) => {
  try {
    const { listingId, recipientId } = req.body;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    let conversation = await Conversation.findOne({
      listing: listingId,
      participants: { $all: [req.user.id, recipientId] }
    }).populate('participants', 'name avatar')
      .populate('listing', 'title images');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, recipientId],
        listing: listingId
      });

      conversation = await Conversation.findById(conversation._id)
        .populate('participants', 'name avatar')
        .populate('listing', 'title images');
    }

    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'name avatar')
      .populate('listing', 'title images')
      .sort('-lastMessageAt');

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({ 
      conversation: conversationId,
      isDeleted: false
    })
      .populate('sender', 'name avatar')
      .populate('replyTo', 'content sender type imageUrl')
      .populate('replyTo.sender', 'name')
      .populate('reactions.user', 'name')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ conversation: conversationId });

    res.json({
      messages: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = 'text' } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messageData = {
      conversation: conversationId,
      sender: req.user.id,
      content: type === 'image' ? 'Đã gửi một hình ảnh' : content,
      type
    };

    // Handle image upload
    if (type === 'image' && req.file) {
      messageData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const message = await Message.create(messageData);

    conversation.lastMessage = messageData.content;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    // Emit to other participants via socket
    const io = req.app.get('io');
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(participantId.toString()).emit('new_message', {
          conversationId,
          message: populatedMessage
        });
      }
    });

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markMessagesAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user.id },
        isRead: false
      },
      {
        isRead: true
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    });

    const conversationIds = conversations.map(c => c._id);

    const unreadCount = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: req.user.id },
      isRead: false,
      isDeleted: false
    });

    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit deleted message' });
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    // Emit update to participants
    const conversation = await Conversation.findById(message.conversation);
    const io = req.app.get('io');
    conversation.participants.forEach(participantId => {
      io.to(participantId.toString()).emit('message_updated', {
        conversationId: message.conversation,
        message: populatedMessage
      });
    });

    res.json({ message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Soft delete
    message.isDeleted = true;
    message.content = 'Tin nhắn đã được thu hồi';
    await message.save();

    // Delete image file if exists
    if (message.imageUrl) {
      const filepath = path.join(process.cwd(), message.imageUrl.replace('/uploads/', 'uploads/'));
      try {
        await fs.unlink(filepath);
      } catch (err) {
        console.log('Error deleting image file:', err.message);
      }
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    // Emit delete to participants
    const conversation = await Conversation.findById(message.conversation);
    const io = req.app.get('io');
    conversation.participants.forEach(participantId => {
      io.to(participantId.toString()).emit('message_deleted', {
        conversationId: message.conversation,
        messageId: message._id
      });
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete all messages in conversation
    const messages = await Message.find({ conversation: conversationId });
    for (const msg of messages) {
      if (msg.imageUrl) {
        const filepath = path.join(process.cwd(), msg.imageUrl.replace('/uploads/', 'uploads/'));
        try {
          await fs.unlink(filepath);
        } catch (err) {
          console.log('Error deleting image file:', err.message);
        }
      }
    }

    await Message.deleteMany({ conversation: conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    // Emit delete to participants
    const io = req.app.get('io');
    conversation.participants.forEach(participantId => {
      io.to(participantId.toString()).emit('conversation_deleted', {
        conversationId
      });
    });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const replyToMessage = async (req, res) => {
  try {
    const { conversationId, content, replyToId, type = 'text' } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Verify replyTo message exists and is in same conversation
    if (replyToId) {
      const replyToMessage = await Message.findById(replyToId);
      if (!replyToMessage || replyToMessage.conversation.toString() !== conversationId) {
        return res.status(400).json({ message: 'Invalid reply message' });
      }
    }

    const messageData = {
      conversation: conversationId,
      sender: req.user.id,
      content: type === 'image' ? 'Đã gửi một hình ảnh' : content,
      type,
      replyTo: replyToId || null
    };

    // Handle image upload
    if (type === 'image' && req.file) {
      messageData.imageUrl = `/uploads/${req.file.filename}`;
    }

    const message = await Message.create(messageData);

    conversation.lastMessage = messageData.content;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('replyTo', 'content sender type imageUrl')
      .populate('replyTo.sender', 'name')
      .populate('reactions.user', 'name');

    // Emit to other participants via socket
    const io = req.app.get('io');
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(participantId.toString()).emit('new_message', {
          conversationId,
          message: populatedMessage
        });
      }
    });

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forwardMessage = async (req, res) => {
  try {
    const { messageId, targetConversationId } = req.body;

    const originalMessage = await Message.findById(messageId)
      .populate('sender', 'name');
    if (!originalMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const targetConversation = await Conversation.findById(targetConversationId);
    if (!targetConversation) {
      return res.status(404).json({ message: 'Target conversation not found' });
    }

    if (!targetConversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const forwardedContent = originalMessage.type === 'image' 
      ? `[Đã chuyển tiếp hình ảnh từ ${originalMessage.sender.name}]`
      : `[Đã chuyển tiếp từ ${originalMessage.sender.name}]: ${originalMessage.content}`;

    const messageData = {
      conversation: targetConversationId,
      sender: req.user.id,
      content: forwardedContent,
      type: originalMessage.type,
      imageUrl: originalMessage.imageUrl || null
    };

    const message = await Message.create(messageData);

    targetConversation.lastMessage = forwardedContent;
    targetConversation.lastMessageAt = new Date();
    await targetConversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    // Emit to participants
    const io = req.app.get('io');
    targetConversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user.id) {
        io.to(participantId.toString()).emit('new_message', {
          conversationId: targetConversationId,
          message: populatedMessage
        });
      }
    });

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { pinned } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    message.pinned = pinned;
    await message.save();

    // Update conversation pinned messages
    if (pinned) {
      if (!conversation.pinnedMessages.includes(messageId)) {
        conversation.pinnedMessages.push(messageId);
      }
    } else {
      conversation.pinnedMessages = conversation.pinnedMessages.filter(
        id => id.toString() !== messageId
      );
    }
    await conversation.save();

    // Emit update
    const io = req.app.get('io');
    conversation.participants.forEach(participantId => {
      io.to(participantId.toString()).emit('message_pinned', {
        conversationId: conversation._id,
        messageId,
        pinned
      });
    });

    res.json({ message: 'Message pinned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== req.user.id
    );

    // Add new reaction if emoji provided
    if (emoji) {
      message.reactions.push({
        user: req.user.id,
        emoji
      });
    }

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .populate('reactions.user', 'name');

    // Emit update
    const io = req.app.get('io');
    conversation.participants.forEach(participantId => {
      io.to(participantId.toString()).emit('message_reacted', {
        conversationId: conversation._id,
        message: populatedMessage
      });
    });

    res.json({ message: populatedMessage });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};