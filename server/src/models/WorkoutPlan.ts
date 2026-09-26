import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IMuscleGroupConfig {
  name: string;
  displayName: string;
  subAreas?: string[];
  exerciseCount?: number;
}

export interface IDayConfig {
  name: string;
  isRest: boolean;
  muscleGroups: IMuscleGroupConfig[];
}

export interface IWeeklySchedule {
  monday: IDayConfig;
  tuesday: IDayConfig;
  wednesday: IDayConfig;
  thursday: IDayConfig;
  friday: IDayConfig;
  saturday: IDayConfig;
  sunday: IDayConfig;
}

export interface IWorkoutPlan {
  userId: Types.ObjectId;
  weeklyPlan: IWeeklySchedule;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWorkoutPlanDocument extends IWorkoutPlan, Document {}

const muscleGroupConfigSchema = new Schema<IMuscleGroupConfig>(
  {
    name: { type: String, required: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    subAreas: [{ type: String }],
    exerciseCount: { type: Number, default: 3 },
  },
  { _id: false }
);

const dayConfigSchema = new Schema<IDayConfig>(
  {
    name: { type: String, required: true, trim: true },
    isRest: { type: Boolean, required: true, default: false },
    muscleGroups: { type: [muscleGroupConfigSchema], default: [] },
  },
  { _id: false }
);

const weeklyScheduleSchema = new Schema<IWeeklySchedule>(
  {
    monday: { type: dayConfigSchema, required: true },
    tuesday: { type: dayConfigSchema, required: true },
    wednesday: { type: dayConfigSchema, required: true },
    thursday: { type: dayConfigSchema, required: true },
    friday: { type: dayConfigSchema, required: true },
    saturday: { type: dayConfigSchema, required: true },
    sunday: { type: dayConfigSchema, required: true },
  },
  { _id: false }
);

const workoutPlanSchema = new Schema<IWorkoutPlanDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    weeklyPlan: {
      type: weeklyScheduleSchema,
      required: [true, 'Weekly schedule plan is required'],
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

export const WorkoutPlan: Model<IWorkoutPlanDocument> =
  mongoose.models.WorkoutPlan ||
  mongoose.model<IWorkoutPlanDocument>('WorkoutPlan', workoutPlanSchema);

export default WorkoutPlan;
