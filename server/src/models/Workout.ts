import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IWorkoutSet {
  id?: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface IWorkoutExercise {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle?: string;
  muscleAreaEmphasis?: string[];
  equipment?: string;
  exerciseType?: string;
  order: number;
  sets: IWorkoutSet[];
  notes?: string;
}

export interface IWorkoutSession {
  userId: Types.ObjectId;
  workoutPlanId?: Types.ObjectId;
  workoutName: string;
  date: Date;
  dayOfWeek: string;
  muscleGroups: string[];
  status: 'planned' | 'in_progress' | 'completed';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  exercises: IWorkoutExercise[];
  notes?: string;
  totalVolume: number;
  totalSets: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWorkoutDocument extends IWorkoutSession, Document {}

const workoutSetSchema = new Schema<IWorkoutSet>(
  {
    setNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    weight: {
      type: Number,
      default: null,
    },
    reps: {
      type: Number,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const workoutExerciseSchema = new Schema<IWorkoutExercise>(
  {
    exerciseId: {
      type: String,
      required: [true, 'Exercise ID is required'],
      trim: true,
    },
    exerciseName: {
      type: String,
      required: [true, 'Exercise name is required'],
      trim: true,
    },
    primaryMuscle: {
      type: String,
      trim: true,
    },
    muscleAreaEmphasis: [{ type: String }],
    equipment: { type: String },
    exerciseType: { type: String },
    order: {
      type: Number,
      default: 1,
    },
    sets: {
      type: [workoutSetSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const workoutSchema = new Schema<IWorkoutDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    workoutPlanId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      required: false,
    },
    workoutName: {
      type: String,
      required: [true, 'Workout name is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Workout date is required'],
      default: Date.now,
    },
    dayOfWeek: {
      type: String,
      required: true,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: 'monday',
    },
    muscleGroups: [{ type: String }],
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed'],
      default: 'completed',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number, default: 0 },
    exercises: {
      type: [workoutExerciseSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    totalVolume: {
      type: Number,
      default: 0,
      min: [0, 'Total volume cannot be negative'],
    },
    totalSets: {
      type: Number,
      default: 0,
      min: [0, 'Total sets cannot be negative'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for user workout queries
workoutSchema.index({ userId: 1, date: -1 });
workoutSchema.index({ userId: 1, status: 1, date: -1 });

export const Workout: Model<IWorkoutDocument> =
  mongoose.models.Workout || mongoose.model<IWorkoutDocument>('Workout', workoutSchema);

export const WorkoutSession = Workout;

export default Workout;
