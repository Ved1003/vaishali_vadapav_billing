import { Request, Response } from 'express';
import { User } from '../models/User.model';

const formatUser = (user: any) => {
    const obj = user.toObject ? user.toObject() : user;
    const { password, _id, __v, ...rest } = obj;
    return {
        id: _id,
        ...rest
    };
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users.map(formatUser));
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, username, password, role, status } = req.body;

        if (!name || !username || !password) {
            res.status(400).json({ error: 'Name, username, and password are required' });
            return;
        }

        // Check if username already exists
        const existingUser = await User.findOne({ username: username.toLowerCase() });
        if (existingUser) {
            res.status(400).json({ error: 'Username already exists' });
            return;
        }

        const user = new User({
            name,
            username: username.toLowerCase(),
            password,
            role: role || 'BILLER',
            status: status || 'active',
        });

        await user.save();
        const formatted = formatUser(user);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('USER_CREATED', formatted);

        res.status(201).json(formatted);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Apply updates
        if (updates.name) user.name = updates.name;
        if (updates.username) user.username = updates.username.toLowerCase();
        if (updates.password) user.password = updates.password;
        if (updates.role) user.role = updates.role;
        if (updates.status) user.status = updates.status;

        await user.save();
        const formatted = formatUser(user);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('USER_UPDATED', formatted);

        res.json(formatted);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        user.status = user.status === 'active' ? 'inactive' : 'active';
        await user.save();
        const formatted = formatUser(user);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('USER_UPDATED', formatted);

        res.json(formatted);
    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({ error: 'Failed to toggle user status' });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Prevent deleting the last Admin (optional safety, but good practice)
        if (user.role === 'ADMIN') {
            const adminCount = await User.countDocuments({ role: 'ADMIN' });
            if (adminCount <= 1) {
                res.status(400).json({ error: 'Cannot delete the last administrator.' });
                return;
            }
        }

        await User.findByIdAndDelete(id);

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('USER_DELETED', id);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
};
