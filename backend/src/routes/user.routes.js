import express from 'express';
import { getUsers, getUser, updateUserRole, updateUserTenant, getTenants } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All user routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getUsers);
router.get('/tenants', getTenants);
router.get('/:id', getUser);
router.patch('/:id/role', updateUserRole);
router.patch('/:id/tenant', updateUserTenant);

export default router;
