import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IStudentProfile extends Document {
  userId?: mongoose.Types.ObjectId; // Link to NextAuth User if needed
  regNumber: string;
  name: string;
  email: string;
  phone?: string;
  gender: "Male" | "Female";
  part: "1" | "2" | "3" | "4" | "5";
  programme: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentProfileSchema = new Schema<IStudentProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    regNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    part: {
      type: String,
      enum: ["1", "2", "3", "4", "5"],
      required: true,
    },
    programme: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export const StudentProfile: Model<IStudentProfile> =
  mongoose.models.StudentProfile || mongoose.model<IStudentProfile>('StudentProfile', studentProfileSchema);
