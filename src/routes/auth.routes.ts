import { Router } from 'express';
import { login, verify, refresh, logout, resetPassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/login - User login
router.post('/login', login);

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', refresh);

// GET /api/auth/verify - Verify token and get user data
router.get('/verify', authenticate, verify);

// POST /api/auth/logout - Logout (for future token blacklisting)
router.post('/logout', authenticate, logout);

// POST /api/auth/reset-password - Reset password (Authenticated Admin or Master Key)
// Note: We use 'authenticate' middleware optionally here? 
// No, resetPassword handles its own authorization check (req.user OR masterKey)
// But 'authenticate' middleware throws 401 if no token.
// So we need a new route that DOES NOT require authentication if using Master Key.
// Let's make it public, and controller handles logic.
router.post('/reset-password', authenticate, resetPassword);
// Wait, if I am locked out, I cannot authenticate. 
// So I must remove 'authenticate' middleware for this specific route if I want to support "I forgot my password".
// But we still want to support "Admin resets user password".
// The controller checks req.user. Since authenticate populates req.user, we can use a loose authentication or just no authentication middleware 
// and let the controller verify the token MANUALLY if provided? 
// OR, we just make it public. If token is present, express-jwt / custom middleware might populate it?
// Our custom 'authenticate' middleware BLOCKS if no token.
// So we should NOT use it here if we want offline recovery.
// Instead, we can make a 'optionalAuthenticate' middleware or just let the controller handle it.
// For simplicity: Let's make a separate route for offline recovery?
// Or just remove authenticate and manually check headers in controller?
// Let's use a new route for recovery.
router.post('/recovery/reset', resetPassword);

export default router;
