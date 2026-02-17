import mongoose, { Schema, Document } from 'mongoose';

export type TicketStatus =
  | 'open'          
  | 'assigned'      
  | 'in_progress'   
  | 'pr_submitted'  
  | 'completed'     
  | 'rejected'; 

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type DurationUnit = 'minutes' | 'hours' | 'days';

export interface IPullRequest {
  url: string;
  message: string;
  submittedAt: Date;
}

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  project: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;           
  assignedTo: mongoose.Types.ObjectId | null;   
  assignedBy: mongoose.Types.ObjectId | null;  
  status: TicketStatus;
  priority: TicketPriority;
  estimatedDuration: number | null;
  estimatedUnit: DurationUnit;

  acceptedAt: Date | null;  
  submittedAt: Date | null; 
  completedAt: Date | null; 
  actualDuration: number | null;

  // Pull request info
  pullRequest: IPullRequest | null;

  createdAt: Date;
  updatedAt: Date;
}

const PullRequestSchema = new Schema<IPullRequest>(
  {
    url: { type: String, required: true },
    message: { type: String, required: true },
    submittedAt: { type: Date, required: true },
  },
  { _id: false }
);

const TicketSchema = new Schema<ITicket>(
  {
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Ticket must belong to a project'],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Ticket must have a creator'],
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ['open', 'assigned', 'in_progress', 'pr_submitted', 'completed', 'rejected'],
        message: 'Invalid status value',
      },
      default: 'open',
    },

    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'critical'],
        message: 'Priority must be low, medium, high, or critical',
      },
      default: 'medium',
    },
    estimatedDuration: {
      type: Number,
      default: null,
      min: [1, 'Estimated duration must be at least 1'],
    },

    estimatedUnit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'hours',
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    actualDuration: {
      type: Number,
      default: null,
    },

    pullRequest: {
      type: PullRequestSchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate actual duration when PR is submitted
TicketSchema.pre('save', function () {
  if (this.acceptedAt && this.submittedAt) {
    const diffMs = this.submittedAt.getTime() - this.acceptedAt.getTime();
    this.actualDuration = Math.floor(diffMs / 60000); 
   }
});

export default mongoose.model<ITicket>('Ticket', TicketSchema);
