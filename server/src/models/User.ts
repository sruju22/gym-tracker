import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  onboardingCompleted?: boolean;
  fitnessGoal?: string;
  experienceLevel?: string;
  trainingDaysPerWeek?: number;
  equipmentPreference?: string;
  heightCm?: number;
  currentWeight?: number;
  weightUnit?: 'kg' | 'lbs';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please enter a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    fitnessGoal: {
      type: String,
      default: '',
    },
    experienceLevel: {
      type: String,
      default: '',
    },
    trainingDaysPerWeek: {
      type: Number,
      default: 4,
    },
    equipmentPreference: {
      type: String,
      default: '',
    },
    heightCm: {
      type: Number,
      default: null,
    },
    currentWeight: {
      type: Number,
      default: null,
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);

export default User;
