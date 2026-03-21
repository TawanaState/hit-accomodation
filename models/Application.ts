import mongoose, { Document, Model, Schema } from 'mongoose';
import { ISession } from './Session';

export interface IApplication extends Document {
  regNumber: string; // The Student's Registration Number
  session: mongoose.Types.ObjectId | ISession; // Session reference
  status: 'Pending' | 'Accepted' | 'Archived' | 'Rejected';
  paymentStatus: string;
  reference: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    regNumber: {
      type: String,
      required: true,
      index: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Archived', 'Rejected'],
      default: 'Pending',
    },
    paymentStatus: {
      type: String,
      default: 'Not Paid',
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One active application per student per session
applicationSchema.index({ regNumber: 1, session: 1 }, { unique: true });

export const Application: Model<IApplication> =
  mongoose.models.Application ||
  mongoose.model<IApplication>('Application', applicationSchema);
