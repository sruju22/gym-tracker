import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface ICombinationStage {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  movementDescription?: string;
  targetWeight?: number | null;
  targetReps?: number | null;
}

export interface ICombinationTemplate {
  userId: Types.ObjectId;
  name: string;
  type: string;
  techniqueLabel?: string;
  rounds: number;
  stages: ICombinationStage[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICombinationTemplateDocument extends ICombinationTemplate, Document {}

const combinationStageSchema = new Schema<ICombinationStage>(
  {
    exerciseId: { type: String, required: true },
    exerciseName: { type: String, required: true },
    movementDescription: { type: String, default: '' },
    targetWeight: { type: Number, default: null },
    targetReps: { type: Number, default: null },
  },
  { _id: false }
);

const combinationTemplateSchema = new Schema<ICombinationTemplateDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['combine_exercises', 'combine_movements', 'change_weights', 'build_own'],
      default: 'combine_exercises',
    },
    techniqueLabel: {
      type: String,
      default: 'Custom Combination',
      trim: true,
    },
    rounds: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
    },
    stages: {
      type: [combinationStageSchema],
      default: [],
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

combinationTemplateSchema.index({ userId: 1, createdAt: -1 });

export const CombinationTemplate: Model<ICombinationTemplateDocument> =
  mongoose.models.CombinationTemplate ||
  mongoose.model<ICombinationTemplateDocument>('CombinationTemplate', combinationTemplateSchema);

export default CombinationTemplate;
