import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftbill_db';

const createAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const username = 'tanmay_k';
        const password = 'Tanmay@2026';
        const name = 'System Admin';

        const existingAdmin = await User.findOne({ username });

        if (existingAdmin) {
            console.log(`⚠️ User "${username}" already exists. Updating details and ensuring it's an ADMIN...`);
            existingAdmin.password = password;
            existingAdmin.role = 'ADMIN';
            existingAdmin.status = 'active';
            await existingAdmin.save();
            console.log(`✅ Admin user "${username}" updated successfully.`);
        } else {
            const newAdmin = new User({
                name,
                username,
                password,
                role: 'ADMIN',
                status: 'active',
            });
            await newAdmin.save();
            console.log(`✅ Admin user "${username}" created successfully.`);
        }

        console.log('\n📝 Admin Credentials:');
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log('\nUse these credentials to login.');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create admin:', error);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
};

createAdmin();
