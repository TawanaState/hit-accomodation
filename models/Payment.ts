import mongoose, { Document, Model, Schema } from 'mongoose';
import { IAllocation } from './Allocation';
import { ISession } from './Session';

export interface IPayment extends Document {
  studentRegNumber: string;
  allocation: mongoose.Types.ObjectId | IAllocation;
  session: mongoose.Types.ObjectId | ISession; // Useful for grouping payments by session
  receiptNumber: string;
  amount: number;
  paymentMethod: 'Bank Transfer' | 'Mobile Money' | 'Cash' | 'Card' | 'Other';
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedAt: Date;
  approvedBy?: string; // e.g. admin Firebase UID or generic identifier
  approvedAt?: Date;
  rejectionReason?: string;
  attachments: string[]; // URLs or paths
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    studentRegNumber: {
      type: String,
      required: true,
      index: true,
    },
    allocation: {
      type: Schema.Types.ObjectId,
      ref: 'Allocation',
      required: true,
      index: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      unique: true, // Assuming receipt numbers should be globally unique
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Mobile Money', 'Cash', 'Card', 'Other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    attachments: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', paymentSchema);
