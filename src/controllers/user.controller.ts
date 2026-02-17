import { Request, Response } from 'express';
import User from '../models/User.model';
import Project from '../models/Project.model';


export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('assignedProjects', 'name status')
      .sort({ createdAt: -1 });

    res.json({ count: users.length, users });
  } catch (error) {
    console.error('GetAllUsers error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};


export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('assignedProjects', 'name status description');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('GetUserById error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};


export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.body;

    if (!role || !['admin', 'team_lead', 'employee'].includes(role)) {
      res.status(400).json({ message: 'Role must be admin, team_lead, or employee.' });
      return;
    }

    if (req.params.id === req.user._id.toString()) {
      res.status(400).json({ message: 'You cannot change your own role.' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    res.json({ message: `User role updated to ${role}.`, user });
  } catch (error) {
    console.error('UpdateUserRole error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      res.status(400).json({ message: 'You cannot delete your own account.' });
      return;
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    // Remove user from all projects they were assigned to
    await Project.updateMany(
      { $or: [{ assignedEmployees: user._id }, { assignedTeamLead: user._id }] },
      {
        $pull: { assignedEmployees: user._id },
        $set: { assignedTeamLead: null },
      }
    );

    // Soft delete: just deactivate (safer than hard delete — preserves ticket history)
    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated successfully.' });
  } catch (error) {
    console.error('DeleteUser error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};


export const assignUserToProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      res.status(400).json({ message: 'projectId is required.' });
      return;
    }

    const [user, project] = await Promise.all([
      User.findById(req.params.id),
      Project.findById(projectId),
    ]);

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }

    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    const alreadyAssigned = user.assignedProjects.some(
      (p) => p.toString() === projectId
    );

    if (alreadyAssigned) {
      res.status(400).json({ message: 'User is already assigned to this project.' });
      return;
    }

    user.assignedProjects.push(project._id);
    await user.save();

    if (user.role === 'team_lead') {
      project.assignedTeamLead = user._id;
    } else {
      if (!project.assignedEmployees.includes(user._id)) {
        project.assignedEmployees.push(user._id);
      }
    }
    await project.save();

    res.json({ message: `User assigned to project "${project.name}".` });
  } catch (error) {
    console.error('AssignUserToProject error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

export const removeUserFromProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId, projectId } = req.params;

    const [user, project] = await Promise.all([
      User.findById(userId),
      Project.findById(projectId),
    ]);

    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    if (!project) {
      res.status(404).json({ message: 'Project not found.' });
      return;
    }

    user.assignedProjects = user.assignedProjects.filter(
      (p) => p.toString() !== projectId
    );
    await user.save();

    project.assignedEmployees = project.assignedEmployees.filter(
      (e) => e.toString() !== userId
    );
    if (project.assignedTeamLead?.toString() === userId) {
      project.assignedTeamLead = null;
    }
    await project.save();

    res.json({ message: 'User removed from project.' });
  } catch (error) {
    console.error('RemoveUserFromProject error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};
