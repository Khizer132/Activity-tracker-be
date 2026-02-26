import { Router } from 'express';
import { getAllUsers, getUserById, updateUserRole, deleteUser, assignUserToProject, removeUserFromProject } from '../controllers/user.controller.ts';
import { verifyToken } from '../middlewares/auth.middleware.ts';
import { adminOnly } from '../middlewares/role.middleware.ts';

const router = Router();

router.use(verifyToken);
router.use(adminOnly);

router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.patch('/:id/role', updateUserRole);
router.delete('/:id', deleteUser);
router.post('/:id/assign-project', assignUserToProject);
router.delete('/:id/assign-project/:projectId', removeUserFromProject);

export default router;
