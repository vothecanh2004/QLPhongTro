import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Create indexes after connection
    await createIndexes();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const { default: Listing } = await import('../models/Listing.js');

    // Text index for search
    await Listing.collection.createIndex({
      title: 'text',
      description: 'text',
      address: 'text',
      city: 'text',
      district: 'text'
    });

    // Geo index (khuyến nghị dùng geo: '2dsphere' nếu schema geo là GeoJSON)
    await Listing.collection.createIndex({ geo: '2dsphere' });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.log('Index creation note:', error.message);
  }
};

export default connectDB;
