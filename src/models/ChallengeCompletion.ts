import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * One row per (user, challenge) the first time it is passed. The unique index is what makes
 * "award XP once" safe when the same pass arrives in several requests at the same moment.
 */
const ChallengeCompletionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  challengeId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
ChallengeCompletionSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

export type ChallengeCompletionDoc = InferSchemaType<typeof ChallengeCompletionSchema>;

export const ChallengeCompletion: Model<ChallengeCompletionDoc> =
  (mongoose.models.ChallengeCompletion as Model<ChallengeCompletionDoc>) ||
  mongoose.model<ChallengeCompletionDoc>("ChallengeCompletion", ChallengeCompletionSchema);
