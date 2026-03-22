import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ 
                error: 'No token provided',
                code: 'NO_TOKEN'
            });
            return;
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify token and ensure it's an access token
        const decoded = verifyToken(token);
        
        if (decoded.type && decoded.type !== 'access') {
            res.status(401).json({ 
                error: 'Invalid token type',
                code: 'INVALID_TOKEN_TYPE'
            });
            return;
        }

        req.user = decoded;
        next();
    } catch (error: any) {
        const errorMessage = error.message || 'Invalid or expired token';
        const errorCode = error.message === 'Token has expired' 
            ? 'TOKEN_EXPIRED' 
            : error.message === 'Invalid token'
            ? 'INVALID_TOKEN'
            : 'AUTH_ERROR';

        res.status(401).json({ 
            error: errorMessage,
            code: errorCode
        });
    }
};

export const authorize = (...roles: ('ADMIN' | 'BILLER')[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        next();
    };
};
