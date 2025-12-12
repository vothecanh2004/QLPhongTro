import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Listing from '../models/Listing.js';

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

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatar')
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

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      content,
      type
    });

    conversation.lastMessage = content;
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