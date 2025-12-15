import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE
  });

  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validate required fields
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Check if JWT secrets are configured
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('JWT secrets not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: role || 'user'
    };

    // Only add phone if provided
    if (phone && phone.trim().length > 0) {
      userData.phone = phone.trim();
    }

    const user = await User.create(userData);

    const { accessToken, refreshToken } = generateTokens(user._id);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }
    
    res.status(500).json({ 
      message: error.message || 'Đăng ký thất bại. Vui lòng thử lại sau.' 
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token provided' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone },
      { new: true, runValidators: true }
    );
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarUrl },
      { new: true }
    );

    res.json({ user, avatar: avatarUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully' });
};