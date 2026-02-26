import { Request, Response } from 'express';
import Ticket from '../models/Ticket.model.ts';
import Project from '../models/Project.model.ts';

export const getAllTickets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, _id: userId } = req.user;

    let query: any = {};

    if (role === 'admin') {
      query = {};

    } else if (role === 'team_lead') {
      const projects = await Project.find({ assignedTeamLead: userId }).select('_id');
      const projectIds = projects.map((p) => p._id);
      query = { project: { $in: projectIds } };

    } else {
      query = { assignedTo: userId };
    }

    const tickets = await Ticket.find(query)
      .populate('project', 'name status')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ count: tickets.length, tickets });
  } catch (error) {
    console.error('GetAllTickets error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('project', 'name status description')
      .populate('assignedTo', 'name email role')
      .populate('assignedBy', 'name email')
      .populate('createdBy', 'name email');

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    const { role, _id: userId } = req.user;
    if (role === 'employee') {
      if (ticket.assignedTo?._id.toString() !== userId.toString()) {
        res.status(403).json({ message: 'You can only view your assigned tickets.' });
        return;
      }
    }

    res.json({ ticket });
  } catch (error) {
    console.error('GetTicketById error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, projectId, priority } = req.body;

    if (!title || !projectId) {
      res.status(400).json({ message: 'title and projectId are required.' });
      return;
    }

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    if (req.user.role === 'team_lead') {
      if (project.assignedTeamLead?.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'You can only create tickets in your project.' });
        return;
      }
    }

    const ticket = await Ticket.create({
      title,
      description: description || '',
      project: projectId,
      createdBy: req.user._id,
      priority: priority || 'medium',
    });

    project.tickets.push(ticket._id);
    await project.save();

    res.status(201).json({ message: 'Ticket created.', ticket });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join(', ') });
      return;
    }
    console.error('CreateTicket error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const updateTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowedFields = ['title', 'description', 'priority'];
    const updates: any = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const ticket = await Project.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    const updatedTicket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('project', 'name')
      .populate('assignedTo', 'name email');

    if (!updatedTicket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.json({ message: 'Ticket updated.', ticket: updatedTicket });
  } catch (error) {
    console.error('UpdateTicket error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const deleteTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    // Team lead can only delete tickets within their project
    if (req.user.role === 'team_lead') {
      const project = await Project.findById(ticket.project);
      if (!project || project.assignedTeamLead?.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'You can only delete tickets in your project.' });
        return;
      }
    }

    await Project.findByIdAndUpdate(ticket.project, {
      $pull: { tickets: ticket._id },
    });

    await ticket.deleteOne();

    res.json({ message: 'Ticket deleted.' });
  } catch (error) {
    console.error('DeleteTicket error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const assignTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      res.status(400).json({ message: 'employeeId is required.' });
      return;
    }

    // Verify employee exists and is an employee
    const employee = await (await import('../models/User.model')).default.findById(employeeId);
    if (!employee) {
      res.status(404).json({ message: 'Employee not found.' });
      return;
    }
    if (employee.role !== 'employee') {
      res.status(400).json({ message: 'Tickets can only be assigned to employees.' });
      return;
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    // Team lead can only assign tickets within their project
    if (req.user.role === 'team_lead') {
      const project = await Project.findById(ticket.project);
      if (!project || project.assignedTeamLead?.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'You can only assign tickets in your project.' });
        return;
      }
    }

    ticket.assignedTo = employee._id;
    ticket.assignedBy = req.user._id;
    ticket.status = 'assigned';
    await ticket.save();

    res.json({
      message: `Ticket assigned to ${employee.name}.`,
      ticket: await ticket.populate('assignedTo', 'name email'),
    });
  } catch (error) {
    console.error('AssignTicket error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const setEstimatedDuration = async (req: Request, res: Response): Promise<void> => {
  try {
    const { estimatedDuration, estimatedUnit } = req.body;

    if (!estimatedDuration || estimatedDuration < 1) {
      res.status(400).json({ message: 'estimatedDuration must be a positive number.' });
      return;
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { estimatedDuration, estimatedUnit: estimatedUnit || 'hours' },
      { new: true, runValidators: true }
    );

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    res.json({ message: 'Estimated duration set.', ticket });
  } catch (error) {
    console.error('SetEstimatedDuration error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const acceptTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    // Only the assigned employee can accept
    if (ticket.assignedTo?.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'This ticket is not assigned to you.' });
      return;
    }

    if (ticket.status !== 'assigned' && ticket.status !== 'rejected') {
      res.status(400).json({
        message: `Cannot accept a ticket with status: ${ticket.status}. Must be 'assigned' or 'rejected'.`,
      });
      return;
    }

    //  TIMER START
    ticket.status = 'in_progress';
    ticket.acceptedAt = new Date();
    await ticket.save();

    res.json({
      message: 'Ticket accepted. Timer started!',
      ticket: {
        _id: ticket._id,
        status: ticket.status,
        acceptedAt: ticket.acceptedAt,
      },
    });
  } catch (error) {
    console.error('AcceptTicket error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const submitPullRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, message } = req.body || {};

    if (!url || !message) {
      res.status(400).json({ message: 'PR url and message are required.' });
      return;
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    if (ticket.assignedTo?.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: 'This ticket is not assigned to you.' });
      return;
    }

    if (ticket.status !== 'in_progress') {
      res.status(400).json({
        message: `Cannot submit PR for ticket with status: ${ticket.status}. Must be 'in_progress'.`,
      });
      return;
    }

    const now = new Date();

    ticket.status = 'pr_submitted';
    ticket.submittedAt = now;
    ticket.pullRequest = { url, message, submittedAt: now };

    await ticket.save();

    res.json({
      message: 'Pull request submitted! Awaiting review.',
      ticket: {
        _id: ticket._id,
        status: ticket.status,
        submittedAt: ticket.submittedAt,
        actualDuration: ticket.actualDuration,
        pullRequest: ticket.pullRequest,
      },
    });
  } catch (error) {
    console.error('SubmitPullRequest error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const completeTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    if (ticket.status !== 'pr_submitted') {
      res.status(400).json({
        message: `Cannot complete a ticket with status: ${ticket.status}. Must be 'pr_submitted'.`,
      });
      return;
    }

    if (req.user.role === 'team_lead') {
      const project = await Project.findById(ticket.project);
      if (!project || project.assignedTeamLead?.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: 'You can only complete tickets in your project.' });
        return;
      }
    }

    ticket.status = 'completed';
    ticket.completedAt = new Date();
    await ticket.save();

    res.json({
      message: 'Ticket marked as completed!',
      ticket: {
        _id: ticket._id,
        status: ticket.status,
        completedAt: ticket.completedAt,
        actualDuration: ticket.actualDuration,
        estimatedDuration: ticket.estimatedDuration,
        estimatedUnit: ticket.estimatedUnit,
      },
    });
  } catch (error) {
    console.error('CompleteTicket error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const rejectTicket = async (req: Request, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found.' });
      return;
    }

    if (ticket.status !== 'pr_submitted') {
      res.status(400).json({
        message: `Cannot reject a ticket with status: ${ticket.status}. Must be 'pr_submitted'.`,
      });
      return;
    }

    ticket.status = 'rejected';
    ticket.submittedAt = null;
    ticket.pullRequest = null;
    ticket.actualDuration = null;
    await ticket.save();

    res.json({
      message: 'PR rejected. Employee needs to rework and resubmit.',
      ticket: {
        _id: ticket._id,
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error('RejectTicket error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
