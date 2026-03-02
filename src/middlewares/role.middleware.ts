import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.model.js';


export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated.' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Access denied. This action requires one of: [${roles.join(', ')}]. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
};

// Only admin
export const adminOnly = requireRole('admin');

// Admin or team_lead
export const adminOrLead = requireRole('admin', 'team_lead');

// Only employee
export const employeeOnly = requireRole('employee');
