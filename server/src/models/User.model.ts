import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
    name: string;
    username: string;
    password: string;
    role: 'ADMIN' | 'BILLER';
    status: 'active' | 'inactive';
    lastLogin?: Date;
    lastLogout?: Date;
    isOnline?: boolean;
    createdAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
    },
    role: {
        type: String,
        enum: ['ADMIN', 'BILLER'],
        required: true,
        default: 'BILLER',
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    lastLogout: {
        type: Date,
        default: null,
    },
    isOnline: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Redundant index removed (username is already unique: true)
// userSchema.index({ username: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);
