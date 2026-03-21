import mongoose, { Document, Model, Schema } from 'mongoose';
import { IHostel } from './Hostel';

export interface IRoom extends Document {
  number: string;
  hostel: mongoose.Types.ObjectId | IHostel;
  floor: mongoose.Types.ObjectId; // Reference to the floor _id inside Hostel
  price: number;
  capacity: number;
  occupants: string[]; // List of Student Reg Numbers
  gender: 'Male' | 'Female' | 'Mixed';
  isReserved: boolean;
  reservedBy?: string;
  reservedUntil?: Date;
  isAvailable: boolean;
  features: string[];
  createdAt: Date;
  updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
  {
    number: {
      type: String,
      required: true,
    },
    hostel: {
      type: Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
    },
    floor: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    occupants: {
      type: [String],
      default: [],
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Mixed'],
      required: true,
    },
    isReserved: {
      type: Boolean,
      default: false,
    },
    reservedBy: {
      type: String, // Reg number
    },
    reservedUntil: {
      type: Date,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    features: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Ensure room number is unique within a hostel's floor
roomSchema.index({ hostel: 1, floor: 1, number: 1 }, { unique: true });

export const Room: Model<IRoom> =
  mongoose.models.Room || mongoose.model<IRoom>('Room', roomSchema);
