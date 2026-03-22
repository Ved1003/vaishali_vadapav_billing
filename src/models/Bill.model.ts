import mongoose, { Document, Schema } from 'mongoose';

// Bill Item interface (embedded in Bill)
export interface IBillItem {
    itemId: string;
    itemName: string;
    quantity: number;
    price: number;
    total: number;
}

// Bill interface
export interface IBill extends Document {
    billNumber: string;
    items: IBillItem[];
    totalAmount: number;
    paymentMode: 'cash' | 'card' | 'upi';
    billerId: string;
    billerName: string;
    createdAt: Date;
}

// Bill Item Schema (embedded)
const billItemSchema = new Schema<IBillItem>(
    {
        itemId: {
            type: String,
            required: true,
        },
        itemName: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false } // Don't create _id for embedded documents
);

// Bill Schema
const billSchema = new Schema<IBill>({
    billNumber: {
        type: String,
        required: true,
        unique: true,
    },
    items: {
        type: [billItemSchema],
        required: true,
        validate: {
            validator: (items: IBillItem[]) => items.length > 0,
            message: 'Bill must have at least one item',
        },
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'card', 'upi'],
        required: true,
    },
    billerId: {
        type: String,
        required: true,
    },
    billerName: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Indexes for faster queries (billNumber index is implicit via unique:true above)
billSchema.index({ createdAt: -1 }); // Descending for recent bills first
billSchema.index({ billerId: 1, createdAt: -1 });

export const Bill = mongoose.model<IBill>('Bill', billSchema);

// Counter Schema for auto-incrementing bill numbers
interface ICounter extends Document {
    name: string;
    seq: number;
}

const counterSchema = new Schema<ICounter>({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    seq: {
        type: Number,
        default: 1000,
    },
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);

// Helper function to get next bill number
export const getNextBillNumber = async (): Promise<string> => {
    const counter = await Counter.findOneAndUpdate(
        { name: 'billNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    return `B${String(counter.seq).padStart(4, '0')}`;
};
