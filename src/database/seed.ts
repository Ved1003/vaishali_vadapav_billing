import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.model';
import { Item } from '../models/Item.model';
import { Bill, Counter } from '../models/Bill.model';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftbill_db';

const seedDatabase = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Item.deleteMany({}),
            Bill.deleteMany({}),
            Counter.deleteMany({}),
        ]);
        console.log('🗑️  Cleared existing data');

        // Create users
        const users = await User.create([
            {
                name: 'Admin User',
                username: 'admin',
                password: 'admin',
                role: 'ADMIN',
                status: 'active',
            },
            {
                name: 'Rahul Sharma',
                username: 'rahul',
                password: 'employee',
                role: 'BILLER',
                status: 'active',
            },
            {
                name: 'Priya Patel',
                username: 'priya',
                password: 'employee',
                role: 'BILLER',
                status: 'active',
            },
            {
                name: 'Amit Kumar',
                username: 'amit',
                password: 'employee',
                role: 'BILLER',
                status: 'inactive',
            },
        ]);
        console.log(`✅ Created ${users.length} users`);

        // Create menu items
        const items = await Item.create([
            { name: 'Samosa', price: 15, isActive: true },
            { name: 'Vada Pav', price: 20, isActive: true },
            { name: 'Bhaji Pav', price: 30, isActive: true },
            { name: 'Poha', price: 25, isActive: true },
            { name: 'Upma', price: 25, isActive: true },
            { name: 'Idli (2 pcs)', price: 30, isActive: true },
            { name: 'Medu Vada (2 pcs)', price: 35, isActive: true },
            { name: 'Dosa', price: 45, isActive: true },
            { name: 'Masala Dosa', price: 55, isActive: true },
            { name: 'Tea', price: 10, isActive: true },
            { name: 'Coffee', price: 15, isActive: true },
            { name: 'Cold Drink', price: 20, isActive: true },
            { name: 'Lassi', price: 30, isActive: true },
            { name: 'Pani Puri (6 pcs)', price: 25, isActive: false },
            { name: 'Bread Pakoda', price: 20, isActive: true },
        ]);
        console.log(`✅ Created ${items.length} menu items`);

        // Initialize bill counter
        await Counter.create({ name: 'billNumber', seq: 1000 });

        // Create sample bills
        const billers = users.filter((u) => u.role === 'BILLER' && u.status === 'active');
        const activeItems = items.filter((i) => i.isActive);
        const bills = [];

        for (let i = 0; i < 50; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - daysAgo);
            createdAt.setHours(Math.floor(Math.random() * 12) + 8);
            createdAt.setMinutes(Math.floor(Math.random() * 60));

            const biller = billers[Math.floor(Math.random() * billers.length)];
            const numItems = Math.floor(Math.random() * 4) + 1;

            const billItems = [];
            let totalAmount = 0;

            const selectedItems: string[] = [];
            for (let j = 0; j < numItems; j++) {
                let item;
                do {
                    item = activeItems[Math.floor(Math.random() * activeItems.length)];
                } while (selectedItems.includes(item._id.toString()));
                selectedItems.push(item._id.toString());

                const quantity = Math.floor(Math.random() * 3) + 1;
                const itemTotal = item.price * quantity;
                totalAmount += itemTotal;

                billItems.push({
                    itemId: item._id.toString(),
                    itemName: item.name,
                    quantity,
                    price: item.price,
                    total: itemTotal,
                });
            }

            bills.push({
                billNumber: `B${String(1001 + i).padStart(4, '0')}`,
                items: billItems,
                totalAmount,
                paymentMode: ['cash', 'card', 'upi'][Math.floor(Math.random() * 3)],
                billerId: biller._id.toString(),
                billerName: biller.name,
                createdAt,
            });
        }

        await Bill.insertMany(bills);
        console.log(`✅ Created ${bills.length} sample bills`);

        // Update counter to match the last bill number
        await Counter.findOneAndUpdate(
            { name: 'billNumber' },
            { seq: 1050 }
        );

        console.log('🎉 Database seeding completed successfully!');
        console.log('\n📝 Demo Credentials:');
        console.log('   Admin: username=admin, password=admin');
        console.log('   Employee: username=rahul, password=employee');
        console.log('   Employee: username=priya, password=employee');

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seedDatabase();
