import { Request, Response } from 'express';
import Project from '../models/Project.model.ts';
import User from '../models/User.model.ts';
import Ticket from '../models/Ticket.model.ts';

export const getAllProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, _id: userId } = req.user;

    let query: any = {};

    if (role === 'admin') {
      query = {};
    } else if (role === 'team_lead') {
      query = { assignedTeamLead: userId };
    } else {
      query = { assignedEmployees: userId };
    }

    const projects = await Project.find(query)
      .populate('createdBy', 'name email')
      .populate('assignedTeamLead', 'name email')
      .populate('assignedEmployees', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ count: projects.length, projects });
  } catch (error) {
    console.error('GetAllProjects error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('assignedTeamLead', 'name email')
      .populate('assignedEmployees', 'name email role')
      .populate({
        path: 'tickets',
        populate: {
          path: 'assignedTo',
          select: 'name email',
        },
      });

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const { role, _id: userId } = req.user;
    if (role !== 'admin') {
      const isTeamLead = project.assignedTeamLead?._id.toString() === userId.toString();
      const isEmployee = project.assignedEmployees.some(
        (e: any) => e._id.toString() === userId.toString()
      );
      if (!isTeamLead && !isEmployee) {
        res.status(403).json({ message: 'You do not have access to this project.' });
        return;
      }
    }

    res.json({ project });
  } catch (error) {
    console.error('GetProjectById error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Project name is required.' });
      return;
    }

    const project = await Project.create({
      name,
      description: description || '',
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Project created successfully.', project });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join(', ') });
      return;
    }
    console.error('CreateProject error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const allowedFields = ['name', 'description', 'status'];
    const updates: any = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('assignedTeamLead', 'name email')
      .populate('assignedEmployees', 'name email');

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    res.json({ message: 'Project updated.', project });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      res.status(400).json({ message: messages.join(', ') });
      return;
    }
    console.error('UpdateProject error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    await Ticket.deleteMany({ project: project._id });

    await User.updateMany(
      { assignedProjects: project._id },
      { $pull: { assignedProjects: project._id } }
    );

    await project.deleteOne();

    res.json({ message: 'Project and all its tickets deleted.' });
  } catch (error) {
    console.error('DeleteProject error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const assignMemberToProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, memberRole } = req.body;

    if (!userId || !memberRole) {
      res.status(400).json({ message: 'userId and memberRole are required.' });
      return;
    }

    if (!['team_lead', 'employee'].includes(memberRole)) {
      res.status(400).json({ message: 'memberRole must be team_lead or employee.' });
      return;
    }

    const [project, user] = await Promise.all([
      Project.findById(req.params.id),
      User.findById(userId),
    ]);

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (memberRole === 'team_lead') {
      project.assignedTeamLead = user._id;
    } else {
      const alreadyAssigned = project.assignedEmployees.some(
        (e) => e.toString() === userId
      );
      if (!alreadyAssigned) {
        project.assignedEmployees.push(user._id);
      }
    }
    
    const alreadyInUser = user.assignedProjects.some(
      (p) => p.toString() === req.params.id
    );
    if (!alreadyInUser) {
      user.assignedProjects.push(project._id);
      await user.save();
    }

    await project.save();

    res.json({ message: `${user.name} assigned to project as ${memberRole}.` });
  } catch (error) {
    console.error('AssignMemberToProject error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
