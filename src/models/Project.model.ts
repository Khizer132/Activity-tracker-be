import mongoose, { Schema, Document } from 'mongoose';

export type ProjectStatus = 'active' | 'completed' | 'on_hold';

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  status: ProjectStatus;
  createdBy: mongoose.Types.ObjectId;
  assignedTeamLead: mongoose.Types.ObjectId | null;
  assignedEmployees: mongoose.Types.ObjectId[];
  tickets: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [3, 'Project name must be at least 3 characters'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },

    description: {
      type: String,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },

    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'on_hold'],
        message: 'Status must be active, completed, or on_hold',
      },
      default: 'active',
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project must have a creator'],
    },

    assignedTeamLead: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    assignedEmployees: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    tickets: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Ticket',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IProject>('Project', ProjectSchema);
