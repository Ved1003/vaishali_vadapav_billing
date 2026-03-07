import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_in_production';
const JWT_EXPIRES_IN = '7d'; // Access token valid for 7 days
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // Refresh token valid for 30 days

export interface JWTPayload {
    userId: string;
    username: string;
    role: 'ADMIN' | 'BILLER';
    type?: 'access' | 'refresh';
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

/**
 * Generate access token (short-lived)
 */
export const generateToken = (payload: JWTPayload): string => {
    return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
};

/**
 * Generate refresh token (long-lived)
 */
export const generateRefreshToken = (payload: JWTPayload): string => {
    return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: JWTPayload): TokenPair => {
    return {
        accessToken: generateToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
};

/**
 * Verify and decode token
 */
export const verifyToken = (token: string): JWTPayload => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        return decoded;
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token has expired');
        } else if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw new Error('Invalid or expired token');
    }
};

/**
 * Decode token without verification (for inspection)
 */
export const decodeToken = (token: string): JWTPayload | null => {
    try {
        return jwt.decode(token) as JWTPayload;
    } catch {
        return null;
    }
};
