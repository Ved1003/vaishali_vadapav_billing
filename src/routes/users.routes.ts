import { Router } from 'express';
import {
    getAllUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
} from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All user routes require admin authentication
router.use(authenticate, authorize('ADMIN'));

// GET /api/users - Get all users
router.get('/', getAllUsers);

// POST /api/users - Create new user
router.post('/', createUser);

// PUT /api/users/:id - Update user
router.put('/:id', updateUser);

// PUT /api/users/:id/status - Toggle user status
router.put('/:id/status', toggleUserStatus);

// DELETE /api/users/:id - Delete user
router.delete('/:id', deleteUser);

export default router;
