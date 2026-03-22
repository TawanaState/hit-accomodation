import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISettings extends Document {
  startDateTime?: Date;
  boyLimit?: number;
  girlLimit?: number;
  autoAcceptBoysLimit?: number;
  autoAcceptGirlsLimit?: number;
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    startDateTime: {
      type: Date,
    },
    boyLimit: {
      type: Number,
      default: 0,
    },
    girlLimit: {
      type: Number,
      default: 0,
    },
    autoAcceptBoysLimit: {
      type: Number,
      default: 0,
    },
    autoAcceptGirlsLimit: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Settings: Model<ISettings> =
  mongoose.models.Settings || mongoose.model<ISettings>('Settings', settingsSchema);
