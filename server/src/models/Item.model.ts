import mongoose, { Document, Schema } from 'mongoose';

export interface IItem extends Document {
    name: string;
    price: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const itemSchema = new Schema<IItem>(
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
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Index for faster queries
itemSchema.index({ isActive: 1 });
itemSchema.index({ name: 1 });

export const Item = mongoose.model<IItem>('Item', itemSchema);
