import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IWeightLog {
  userId: mongoose.Types.ObjectId;
  weight: number;
  unit: 'kg' | 'lbs';
  date: Date;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IWeightLogDocument extends IWeightLog, Document {}

const weightLogSchema = new Schema<IWeightLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    weight: {
      type: Number,
      required: [true, 'Weight value is required'],
      min: [20, 'Weight must be at least 20 kg (or 44 lbs)'],
      max: [500, 'Weight cannot exceed 500 kg (or 1100 lbs)'],
    },
    unit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Notes cannot exceed 200 characters'],
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

weightLogSchema.index({ userId: 1, date: -1 });

const WeightLog: Model<IWeightLogDocument> = mongoose.model<IWeightLogDocument>('WeightLog', weightLogSchema);

export default WeightLog;
