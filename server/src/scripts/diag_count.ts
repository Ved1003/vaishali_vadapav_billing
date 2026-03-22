import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Bill } from '../models/Bill.model';

dotenv.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftbill_db';

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const total = await Bill.countDocuments({});
        console.log(`\n================================`);
        console.log(`TOTAL BILLS IN DB: ${total}`);
        console.log(`================================\n`);
        await mongoose.connection.close();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
