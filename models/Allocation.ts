import mongoose, { Document, Model, Schema } from 'mongoose';
import { IHostel } from './Hostel';
import { IRoom } from './Room';
import { ISession } from './Session';

export interface IAllocation extends Document {
  studentRegNumber: string;
  room: mongoose.Types.ObjectId | IRoom;
  hostel: mongoose.Types.ObjectId | IHostel;
  session: mongoose.Types.ObjectId | ISession; // Track by session
  allocatedAt: Date;
  paymentStatus: 'Pending' | 'Paid' | 'Overdue';
  paymentDeadline: Date;
  semester: string;
  academicYear: string;
  paymentId?: mongoose.Types.ObjectId; // Reference to a Payment document
  createdAt: Date;
  updatedAt: Date;
}

const allocationSchema = new Schema<IAllocation>(
  {
    studentRegNumber: {
      type: String,
      required: true,
      index: true,
    },
    room: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
      index: true,
    },
    hostel: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
    },
    session: {
      type: Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Overdue'],
      default: 'Pending',
    },
    paymentDeadline: {
      type: Date,
      required: true,
    },
    semester: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment', // Resolves circular dependency in types vs models loosely
    },
  },
  { timestamps: true }
);

// One allocation per student per session
allocationSchema.index({ studentRegNumber: 1, session: 1 }, { unique: true });

export const Allocation: Model<IAllocation> =
  mongoose.models.Allocation ||
  mongoose.model<IAllocation>('Allocation', allocationSchema);
