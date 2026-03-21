import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFloor {
  _id: mongoose.Types.ObjectId;
  name: string; // "Ground Floor"
  number: string; // "0"
}

export interface IHostel extends Document {
  name: string;
  description: string;
  totalCapacity: number;
  currentOccupancy: number;
  gender: 'Male' | 'Female' | 'Mixed';
  isActive: boolean;
  pricePerSemester: number;
  features: string[];
  images: string[];
  floors: IFloor[]; // Floors are now just descriptive metadata, rooms are independent documents
  createdAt: Date;
  updatedAt: Date;
}

const floorSchema = new Schema<IFloor>(
  {
    name: { type: String, required: true },
    number: { type: String, required: true },
  },
  { _id: true } // Generate IDs for floors if needed, but not strictly relational
);

const hostelSchema = new Schema<IHostel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    totalCapacity: {
      type: Number,
      required: true,
      min: 0,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: 0,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Mixed'],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    pricePerSemester: {
      type: Number,
      required: true,
      min: 0,
    },
    features: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    floors: {
      type: [floorSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export const Hostel: Model<IHostel> =
  mongoose.models.Hostel || mongoose.model<IHostel>('Hostel', hostelSchema);
