import { Request, Response } from 'express';
import { User } from '../models/User.model';
import { generateTokenPair, generateToken, verifyToken } from '../utils/jwt';

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        // Input validation
        if (!username || !password) {
            res.status(400).json({
                error: 'Username and password are required',
                code: 'MISSING_CREDENTIALS'
            });
            return;
        }

        // Find user by username
        const user = await User.findOne({ username: username.toLowerCase().trim() });

        if (!user) {
            // Log failed login attempt (without revealing if user exists)
            console.warn(`Failed login attempt for username: ${username.toLowerCase().trim()} - User not found`);
            res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }

        // Check if user is active
        if (user.status !== 'active') {
            console.warn(`Login attempt for inactive account: ${user.username}`);
            res.status(403).json({
                error: 'Account is inactive. Please contact administrator.',
                code: 'ACCOUNT_INACTIVE'
            });
            return;
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            console.warn(`Failed login attempt for user: ${user.username} - Invalid password`);
            res.status(401).json({
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
            return;
        }

        // Update last login timestamp and online status
        user.isOnline = true;
        user.lastLogin = new Date();
        await user.save();

        // Broadcast event via WebSocket
        const { emitEvent } = require('../utils/socket');
        emitEvent('USER_UPDATED', {
            id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
            status: user.status,
            isOnline: true,
            lastLogin: user.lastLogin
        });

        // Generate token pair (access + refresh)
        const { accessToken, refreshToken } = generateTokenPair({
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
        });

        // Log successful login
        console.info(`Successful login for user: ${user.username} (${user.role})`);

        // Return user data with tokens
        res.json({
            id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
            status: user.status,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            token: accessToken,
            refreshToken: refreshToken,
        });
    } catch (error: any) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Login failed. Please try again later.',
            code: 'INTERNAL_ERROR'
        });
    }
};

export const verify = async (req: Request, res: Response): Promise<void> => {
    try {
        // User is already authenticated by middleware
        if (!req.user) {
            res.status(401).json({
                error: 'Not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
            return;
        }

        // Fetch fresh user data
        const user = await User.findById(req.user.userId).select('-password');

        if (!user) {
            res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }

        // Check if user is still active
        if (user.status !== 'active') {
            res.status(403).json({
                error: 'Account is inactive',
                code: 'ACCOUNT_INACTIVE'
            });
            return;
        }

        // Heartbeat: Update activity
        user.isOnline = true;
        user.lastLogin = new Date();
        await user.save();

        res.json({
            id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
            status: user.status,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
        });
    } catch (error: any) {
        console.error('Verify error:', error);
        res.status(500).json({
            error: 'Verification failed',
            code: 'VERIFICATION_ERROR'
        });
    }
};

/**
 * Refresh access token using refresh token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            res.status(400).json({
                error: 'Refresh token is required',
                code: 'MISSING_REFRESH_TOKEN'
            });
            return;
        }

        // Verify refresh token
        const decoded = verifyToken(refreshToken);

        // Check if it's actually a refresh token
        if (decoded.type !== 'refresh') {
            res.status(401).json({
                error: 'Invalid refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
            return;
        }

        // Verify user still exists and is active
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            res.status(404).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }

        if (user.status !== 'active') {
            res.status(403).json({
                error: 'Account is inactive',
                code: 'ACCOUNT_INACTIVE'
            });
            return;
        }

        // Generate new access token
        const newAccessToken = generateToken({
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
        });

        res.json({
            token: newAccessToken,
        });
    } catch (error: any) {
        console.error('Refresh token error:', error);

        if (error.message === 'Token has expired' || error.message === 'Invalid token') {
            res.status(401).json({
                error: 'Refresh token expired or invalid',
                code: 'REFRESH_TOKEN_EXPIRED'
            });
            return;
        }

        res.status(500).json({
            error: 'Token refresh failed',
            code: 'REFRESH_ERROR'
        });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.user) {
            console.info(`User ${req.user.username} logged out`);

            // Set user offline
            const user = await User.findById(req.user.userId);
            if (user) {
                user.isOnline = false;
                user.lastLogout = new Date();
                await user.save();

                // Broadcast event via WebSocket
                const { emitEvent } = require('../utils/socket');
                emitEvent('USER_UPDATED', {
                    id: user._id,
                    isOnline: false,
                    lastLogout: user.lastLogout
                });
            }
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
};

/**
 * Reset Password (Offline Mode)
 * Allows resetting password via Master Key (recover admin) or Admin Session (manager users)
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, newPassword, masterKey } = req.body;
        const requester = req.user; // If logged in as admin

        // 1. Validate Input
        if (!username || !newPassword) {
            res.status(400).json({ error: 'Username and new password are required' });
            return;
        }

        // 2. Authorization Check
        let isAuthorized = false;

        // Mode A: Logged in as Admin
        if (requester && requester.role === 'ADMIN') {
            isAuthorized = true;
        }

        // Mode B: Emergency Master Key (offline recovery)
        // Hardcoded fallback for offline apps if env is missing
        const SERVER_MASTER_KEY = process.env.MASTER_RESET_KEY || 'tanmay-billing-recovery-2025';

        if (masterKey && masterKey === SERVER_MASTER_KEY) {
            isAuthorized = true;
            console.warn(`⚠️ Emergency Password Reset used for user: ${username}`);
        }

        if (!isAuthorized) {
            res.status(403).json({ error: 'Unauthorized. Provide Master Key or Login as Admin.' });
            return;
        }

        // 3. Perform Reset
        const user = await User.findOne({ username: username.toLowerCase().trim() });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        user.password = newPassword;
        // If user was locked/inactive, maybe we want to unlock them? preserving status for now.
        await user.save();

        res.json({ message: `Password for ${user.username} has been reset successfully.` });

    } catch (error: any) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};
