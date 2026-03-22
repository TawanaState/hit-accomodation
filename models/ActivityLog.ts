import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IActivityLog extends Document {
  adminEmail: string;
  activity: string;
  regNumber?: string;
  oldStatus?: string;
  newStatus?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    adminEmail: {
      type: String,
      required: true,
      index: true,
    },
    activity: {
      type: String,
      required: true,
    },
    regNumber: {
      type: String,
      index: true,
    },
    oldStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
