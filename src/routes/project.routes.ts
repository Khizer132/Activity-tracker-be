import { Router } from 'express';
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject, assignMemberToProject } from '../controllers/project.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);

router.post('/', adminOnly, createProject);
router.patch('/:id', adminOnly, updateProject);
router.delete('/:id', adminOnly, deleteProject);
router.post('/:id/assign', adminOnly, assignMemberToProject);

export default router;
