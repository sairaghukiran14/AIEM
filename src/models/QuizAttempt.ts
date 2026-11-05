import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ItemSchema = new Schema(
  {
    questionId: { type: String, required: true },
    category: { type: String, required: true },
    kind: { type: String, required: true },
    difficulty: { type: Number, required: true },
    /** order[displayPosition] = original option index. */
    order: { type: [Number], required: true },
    answered: { type: Boolean, default: false },
    chosen: { type: Number, default: null },
    correct: { type: Boolean, default: false },
    /** Where the right answer was shown, kept so a later edit to the bank cannot change an old result. */
    correctDisplay: { type: Number, default: null },
  },
  { _id: false }
);

const QuizAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true },
    difficulty: { type: String, required: true },
    kind: { type: String, required: true },
    count: { type: Number, required: true },
    items: { type: [ItemSchema], required: true },
    status: { type: String, enum: ["open", "done"], default: "open" },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    percent: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    finishedAt: { type: Date, default: null },
    /** TTL: an unfinished attempt is dropped after a few days, a finished one is kept for a year. */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

QuizAttemptSchema.index({ userId: 1, createdAt: -1 });
QuizAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type QuizAttemptDoc = InferSchemaType<typeof QuizAttemptSchema> & { _id: mongoose.Types.ObjectId };

export const QuizAttempt: Model<QuizAttemptDoc> =
  (mongoose.models.QuizAttempt as Model<QuizAttemptDoc>) || mongoose.model<QuizAttemptDoc>("QuizAttempt", QuizAttemptSchema);
