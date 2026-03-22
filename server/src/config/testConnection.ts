import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftbill_db';

const testConnection = async () => {
    try {
        console.log('🔍 Testing MongoDB connection...');
        console.log(`📍 URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);

        await mongoose.connect(MONGODB_URI);

        console.log('✅ MongoDB connection successful!');
        console.log(`📦 Database: ${mongoose.connection.name}`);
        console.log(`🏠 Host: ${mongoose.connection.host}`);

        await mongoose.connection.close();
        console.log('👋 Connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

testConnection();
