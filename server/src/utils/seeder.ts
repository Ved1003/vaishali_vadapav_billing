import { User } from '../models/User.model';

export const seedInitialAdmin = async () => {
    try {
        const userCount = await User.countDocuments();

        if (userCount === 0) {
            console.log('🌱 No users found. Seeding default admin...');

            const username = 'admin';
            const password = 'adminpassword';
            const name = 'System Admin';

            const newAdmin = new User({
                name,
                username,
                password,
                role: 'ADMIN',
                status: 'active',
            });

            await newAdmin.save();
            console.log(`✅ Default Admin user created: ${username} / ${password}`);
        } else {
            console.log('ℹ️ Users exist. Skipping initial seed.');
        }
    } catch (error) {
        console.error('❌ Failed to seed initial admin:', error);
        // Don't kill the process, just log the error
    }
};
