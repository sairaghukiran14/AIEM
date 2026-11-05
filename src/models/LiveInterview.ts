import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PlanItemSchema = new Schema(
  {
    id: String,
    trackTitle: String,
    trackSlug: String,
    lessonTitle: String,
    lessonSlug: String,
    question: String,
    /** The marking reference. Never sent to the browser while the interview is running. */
    answer: String,
    followUp: String,
    difficulty: { type: Number, default: 2 },
  },
  { _id: false }
);

const TurnSchema = new Schema(
  {
    role: { type: String, enum: ["interviewer", "candidate"], required: true },
    text: { type: String, required: true },
    questionIndex: { type: Number, default: -1 },
    seconds: { type: Number, default: null },
    /** A fixed line whose audio may be reused from the speech cache. */
    cacheable: { type: Boolean, default: false },
    /** A new round starts with this line, so the browser pauses before playing it. */
    roundBreak: { type: Boolean, default: false },
  },
  { _id: false }
);

/** A voice interview. The audio is never stored: only the transcript and the report, and those expire. */
const LiveInterviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["active", "ended", "scoring", "done"], default: "active" },
    track: { type: String, required: true },
    level: { type: String, required: true },
    voice: { type: String, required: true },
    codemix: { type: Boolean, default: false },
    /** Questions are chosen one at a time as the interview adapts, so this grows to `target`. */
    plan: { type: [PlanItemSchema], default: [] },
    target: { type: Number, required: true },
    difficulty: { type: Number, default: 2 },
    /** Prism's 0-3 rating of each answer, by plan index. */
    qualities: { type: [new Schema({ index: Number, value: Number }, { _id: false })], default: [] },
    cursor: { phase: String, index: Number, followUps: Number, hints: Number },
    turns: { type: [TurnSchema], default: [] },
    report: { type: Schema.Types.Mixed, default: null },
    scoringStartedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
LiveInterviewSchema.index({ userId: 1, createdAt: -1 });
LiveInterviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type LiveInterviewDoc = InferSchemaType<typeof LiveInterviewSchema>;

export const LiveInterview: Model<LiveInterviewDoc> =
  (mongoose.models.LiveInterview as Model<LiveInterviewDoc>) ||
  mongoose.model<LiveInterviewDoc>("LiveInterview", LiveInterviewSchema);
