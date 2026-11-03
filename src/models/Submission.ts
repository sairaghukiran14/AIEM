import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SubmissionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    challengeId: { type: String, required: true },
    trackSlug: { type: String, required: true },
    lessonSlug: { type: String, default: "" },
    kind: {
      type: String,
      enum: ["quiz", "spot-the-bug", "code", "prompt", "gate", "capstone"],
      required: true,
    },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    attempt: { type: Number, default: 1 },
    xpAwarded: { type: Number, default: 0 },
    answer: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

SubmissionSchema.index({ userId: 1, challengeId: 1 });

export type SubmissionDoc = InferSchemaType<typeof SubmissionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Submission: Model<SubmissionDoc> =
  (mongoose.models.Submission as Model<SubmissionDoc>) ||
  mongoose.model<SubmissionDoc>("Submission", SubmissionSchema);
