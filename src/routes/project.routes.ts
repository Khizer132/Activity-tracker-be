import { Router } from 'express';
import { getAllProjects, getProjectById, createProject, updateProject, deleteProject, assignMemberToProject } from '../controllers/project.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { adminOnly } from '../middlewares/role.middleware';

const router = Router();

router.use(verifyToken);

router.get('/', getAllProjects);
router.get('/:id', getProjectById);

router.post('/', adminOnly, createProject);
router.patch('/:id', adminOnly, updateProject);
router.delete('/:id', adminOnly, deleteProject);
router.post('/:id/assign', adminOnly, assignMemberToProject);

export default router;
