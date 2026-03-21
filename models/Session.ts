import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISession extends Document {
  name: string; // e.g., "Academic Year 2024/2025"
  code: string; // e.g., "24-25"
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isOpenForApplications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isOpenForApplications: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// We want only one session to be active at a time (optional, but logical)
// However, implementing strict singleton active requires pre-save hooks which we'll add if needed.
// For now, simple model.

export const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', sessionSchema);
