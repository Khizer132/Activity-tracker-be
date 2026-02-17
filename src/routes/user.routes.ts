import { Router } from 'express';
import { getAllUsers, getUserById, updateUserRole, deleteUser, assignUserToProject, removeUserFromProject } from '../controllers/user.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { adminOnly } from '../middlewares/role.middleware';

const router = Router();

// All user routes require: (1) valid token, (2) admin role
router.use(verifyToken);
router.use(adminOnly);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);
router.post('/:id/assign-project', assignUserToProject);
router.delete('/:id/assign-project/:projectId', removeUserFromProject);

export default router;
