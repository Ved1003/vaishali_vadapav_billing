import mongoose, { Document, Schema } from 'mongoose';

export interface IFridgeItem extends Document {
    name: string;
    price: number;
    stock: number;
    lowStockThreshold: number;
    unit: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const fridgeItemSchema = new Schema<IFridgeItem>(
    {
        name: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price must be positive'],
        },
        stock: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Stock cannot be negative'],
        },
        lowStockThreshold: {
            type: Number,
            default: 5,
            min: 0,
        },
        unit: {
            type: String,
            default: 'piece',
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

fridgeItemSchema.index({ isActive: 1 });
fridgeItemSchema.index({ name: 1 });

export const FridgeItem = mongoose.model<IFridgeItem>('FridgeItem', fridgeItemSchema);
