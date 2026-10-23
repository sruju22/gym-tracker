import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type CardioActivityType =
  | 'running'
  | 'walking'
  | 'cycling'
  | 'treadmill'
  | 'elliptical'
  | 'rowing'
  | 'stair_climber'
  | 'other';

export type DistanceUnit = 'km' | 'mi' | 'm';

export interface ICardioSession {
  userId: Types.ObjectId;
  clientSessionId?: string;
  activityType: CardioActivityType;
  customActivityName?: string;
  date: Date;
  durationMinutes: number;
  distance?: number | null;
  distanceUnit?: DistanceUnit;
  paceMinutesPerUnit?: number | null;
  speedPerHour?: number | null;
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  caloriesBurned?: number | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICardioSessionDocument extends ICardioSession, Document {}

const cardioSessionSchema = new Schema<ICardioSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    clientSessionId: {
      type: String,
      required: false,
      index: true,
    },
    activityType: {
      type: String,
      required: [true, 'Activity type is required'],
      enum: [
        'running',
        'walking',
        'cycling',
        'treadmill',
        'elliptical',
        'rowing',
        'stair_climber',
        'other',
      ],
    },
    customActivityName: {
      type: String,
      trim: true,
      default: undefined,
    },
    date: {
      type: Date,
      required: [true, 'Session date is required'],
      default: Date.now,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [0.1, 'Duration must be greater than 0'],
    },
    distance: {
      type: Number,
      default: null,
      min: [0, 'Distance cannot be negative'],
    },
    distanceUnit: {
      type: String,
      enum: ['km', 'mi', 'm'],
      default: 'km',
    },
    paceMinutesPerUnit: {
      type: Number,
      default: null,
    },
    speedPerHour: {
      type: Number,
      default: null,
    },
    averageHeartRate: {
      type: Number,
      default: null,
      min: [30, 'Heart rate must be at least 30 bpm'],
      max: [250, 'Heart rate must be at most 250 bpm'],
    },
    maxHeartRate: {
      type: Number,
      default: null,
      min: [30, 'Heart rate must be at least 30 bpm'],
      max: [260, 'Heart rate must be at most 260 bpm'],
    },
    caloriesBurned: {
      type: Number,
      default: null,
      min: [0, 'Calories burned cannot be negative'],
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
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Timeline query optimization
cardioSessionSchema.index({ userId: 1, date: -1 });

// Idempotency guard for offline/retried saves
cardioSessionSchema.index(
  { userId: 1, clientSessionId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientSessionId: { $type: 'string' } },
    name: 'unique_cardio_userId_clientSessionId',
  }
);

export const CardioSession: Model<ICardioSessionDocument> =
  mongoose.models.CardioSession ||
  mongoose.model<ICardioSessionDocument>('CardioSession', cardioSessionSchema);

export default CardioSession;
