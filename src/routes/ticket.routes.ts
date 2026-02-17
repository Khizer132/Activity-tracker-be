import { Router } from 'express';
import { getAllTickets, getTicketById, createTicket, updateTicket, deleteTicket, assignTicket, setEstimatedDuration, acceptTicket, submitPullRequest, completeTicket, rejectTicket } from '../controllers/ticket.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { adminOnly, adminOrLead, employeeOnly } from '../middlewares/role.middleware';

const router = Router();

router.use(verifyToken);

router.get('/', getAllTickets);
router.get('/:id', getTicketById);

router.post('/', adminOnly, createTicket);
router.delete('/:id', adminOnly, deleteTicket);
router.patch('/:id', adminOrLead, updateTicket);
router.post('/:id/assign', adminOrLead, assignTicket);
router.patch('/:id/duration', adminOrLead, setEstimatedDuration);
router.post('/:id/complete', adminOrLead, completeTicket);
router.post('/:id/reject', adminOrLead, rejectTicket);
router.post('/:id/accept', employeeOnly, acceptTicket);      
router.post('/:id/submit-pr', employeeOnly, submitPullRequest);

export default router;
