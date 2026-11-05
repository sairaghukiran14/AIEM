import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** One row per (user, code challenge) whose reference solution was opened before it was passed. That pass earns no XP. */
const SolutionViewSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  challengeId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
SolutionViewSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

export type SolutionViewDoc = InferSchemaType<typeof SolutionViewSchema>;

export const SolutionView: Model<SolutionViewDoc> =
  (mongoose.models.SolutionView as Model<SolutionViewDoc>) ||
  mongoose.model<SolutionViewDoc>("SolutionView", SolutionViewSchema);
