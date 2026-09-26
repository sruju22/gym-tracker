import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IExercise {
  name: string;
  muscleGroup: string;
  equipment?: string;
  category?: string;
  description?: string;
  instructions?: string;
  imageUrl?: string;
  isCustom?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IExerciseDocument extends IExercise, Document {}

const exerciseSchema = new Schema<IExerciseDocument>(
  {
    name: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true
    },
    muscleGroup: {
      type: String,
      required: [true, 'Muscle group is required'],
      trim: true
    },
    equipment: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    instructions: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    isCustom: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index on muscleGroup and name for fast querying and filtering
exerciseSchema.index({ muscleGroup: 1, name: 1 });

export const Exercise: Model<IExerciseDocument> =
  mongoose.models.Exercise || mongoose.model<IExerciseDocument>('Exercise', exerciseSchema);

export default Exercise;
