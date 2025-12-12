import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Listing from '../models/Listing.js';

dotenv.config();

const users = [
  {
    name: 'Admin User',
    email: 'admin@rental.com',
    password: 'admin123',
    role: 'admin',
    phone: '0901234567',
    isVerified: true
  },
  {
    name: 'Nguyễn Văn A',
    email: 'landlord@rental.com',
    password: 'landlord123',
    role: 'landlord',
    phone: '0912345678',
    isVerified: true
  },
  {
    name: 'Trần Thị B',
    email: 'user@rental.com',
    password: 'user123',
    role: 'user',
    phone: '0923456789',
    isVerified: true
  }
];

const listings = [
  {
    title: 'Phòng trọ cao cấp quận 1 - Gần chợ Bến Thành',
    description: 'Phòng trọ sạch sẽ, thoáng mát, đầy đủ tiện nghi. Gần trung tâm, thuận tiện đi lại.',
    price: 4500000,
    deposit: 4500000,
    area: 25,
    address: '123 Lê Lợi',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Thành',
    geo: {
      type: 'Point',
      coordinates: [106.6978, 10.7698]
    },
    type: 'room',
    amenities: ['wifi', 'ac', 'private_bathroom', 'parking'],
    images: [
      { url: 'https://via.placeholder.com/800x600?text=Room+1', publicId: 'sample1' }
    ],
    status: 'published',
    featured: true
  },
  {
    title: 'Nhà nguyên căn 2 phòng ngủ - Quận 3',
    description: 'Nhà mới xây, đầy đủ nội thất, 2 phòng ngủ, 2 toilet. An ninh tốt.',
    price: 12000000,
    deposit: 12000000,
    area: 60,
    address: '456 Võ Văn Tần',
    city: 'Hồ Chí Minh',
    district: 'Quận 3',
    ward: 'Phường 6',
    geo: {
      type: 'Point',
      coordinates: [106.6881, 10.7825]
    },
    type: 'house',
    amenities: ['wifi', 'ac', 'kitchen', 'washing_machine', 'parking'],
    images: [
      { url: 'https://via.placeholder.com/800x600?text=House+1', publicId: 'sample2' }
    ],
    status: 'published',
    featured: true
  },
  {
    title: 'Chung cư mini Tân Bình - Gần sân bay',
    description: 'Studio tiện nghi, ban công thoáng, view đẹp. Thích hợp cho người đi làm.',
    price: 5500000,
    deposit: 5500000,
    area: 30,
    address: '789 Cộng Hòa',
    city: 'Hồ Chí Minh',
    district: 'Tân Bình',
    ward: 'Phường 13',
    geo: {
      type: 'Point',
      coordinates: [106.6528, 10.8012]
    },
    type: 'apartment',
    amenities: ['wifi', 'ac', 'elevator', 'security', 'parking'],
    images: [
      { url: 'https://via.placeholder.com/800x600?text=Apartment+1', publicId: 'sample3' }
    ],
    status: 'published'
  },
  {
    title: 'Phòng ở ghép giá rẻ - Quận Bình Thạnh',
    description: 'Phòng ở ghép 2-3 người, giá phải chăng, gần trường đại học.',
    price: 2000000,
    deposit: 2000000,
    area: 20,
    address: '321 Xô Viết Nghệ Tĩnh',
    city: 'Hồ Chí Minh',
    district: 'Bình Thạnh',
    ward: 'Phường 21',
    geo: {
      type: 'Point',
      coordinates: [106.7141, 10.8017]
    },
    type: 'shared',
    amenities: ['wifi', 'ac', 'shared_bathroom'],
    images: [
      { url: 'https://via.placeholder.com/800x600?text=Shared+Room', publicId: 'sample4' }
    ],
    status: 'published'
  },
  {
    title: 'Căn hộ dịch vụ cao cấp Quận 7',
    description: 'Căn hộ full nội thất, bếp riêng, gym, hồ bơi. Khu an ninh 24/7.',
    price: 8000000,
    deposit: 8000000,
    area: 45,
    address: '555 Nguyễn Thị Thập',
    city: 'Hồ Chí Minh',
    district: 'Quận 7',
    ward: 'Phường Tân Phú',
    geo: {
      type: 'Point',
      coordinates: [106.7221, 10.7324]
    },
    type: 'apartment',
    amenities: ['wifi', 'ac', 'kitchen', 'elevator', 'security', 'parking', 'washing_machine'],
    images: [
      { url: 'https://via.placeholder.com/800x600?text=Service+Apartment', publicId: 'sample5' }
    ],
    status: 'published',
    featured: true
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Listing.deleteMany({});
    console.log('Cleared existing data');

    // Create users
    const createdUsers = await User.create(users);
    console.log(`Created ${createdUsers.length} users`);

    // Assign listings to landlord
    const landlord = createdUsers.find(u => u.role === 'landlord');
    const listingsWithOwner = listings.map(listing => ({
      ...listing,
      owner: landlord._id
    }));

    const createdListings = await Listing.create(listingsWithOwner);
    console.log(`Created ${createdListings.length} listings`);

    console.log('\\n=== Seed Data Complete ===');
    console.log('\\nTest Accounts:');
    console.log('Admin: admin@rental.com / admin123');
    console.log('Landlord: landlord@rental.com / landlord123');
    console.log('User: user@rental.com / user123');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();