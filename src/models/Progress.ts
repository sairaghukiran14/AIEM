import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trackSlug: { type: String, required: true },
    lessonSlug: { type: String, required: true },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ProgressSchema.index({ userId: 1, lessonSlug: 1 }, { unique: true });

export type ProgressDoc = InferSchemaType<typeof ProgressSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Progress: Model<ProgressDoc> =
  (mongoose.models.Progress as Model<ProgressDoc>) ||
  mongoose.model<ProgressDoc>("Progress", ProgressSchema);
