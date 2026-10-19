import mongoose, { Document, Schema, Model } from 'mongoose';

export type GoalType = 'weight_gain' | 'weight_loss' | 'strength' | 'consistency' | 'body_weight' | 'exercise_strength';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'archived';

export interface IGoal {
  userId: mongoose.Types.ObjectId;
  title: string;
  type: GoalType;
  exerciseId?: string;
  exerciseName?: string;
  startValue: number;
  targetValue: number;
  unit: string;
  targetDate?: Date | null;
  status: GoalStatus;
  isPrimary: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGoalDocument extends IGoal, Document {}

const goalSchema = new Schema<IGoalDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    type: {
      type: String,
      enum: ['weight_gain', 'weight_loss', 'strength', 'consistency', 'body_weight', 'exercise_strength'],
      required: true,
    },
    exerciseId: {
      type: String,
      default: null,
      trim: true,
    },
    exerciseName: {
      type: String,
      default: null,
      trim: true,
    },
    startValue: {
      type: Number,
      required: [true, 'Start value is required'],
    },
    targetValue: {
      type: Number,
      required: [true, 'Target value is required'],
    },
    unit: {
      type: String,
      default: 'kg',
      trim: true,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'archived'],
      default: 'active',
      index: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

goalSchema.index({ userId: 1, status: 1 });

const Goal: Model<IGoalDocument> = mongoose.model<IGoalDocument>('Goal', goalSchema);

export default Goal;
