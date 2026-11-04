import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BadgeSchema = new Schema(
  {
    badgeId: { type: String, required: true },
    label: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AssessmentSchema = new Schema(
  {
    takenAt: { type: Date, default: Date.now },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 0 },
    // trackSlug -> percentage correct
    trackScores: { type: Map, of: Number, default: {} },
    recommendedTrack: { type: String, default: "llm-foundations" },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    // Set when the password is reset. Sessions issued before it stop working.
    passwordChangedAt: { type: Date, default: null },
    // Set when the person confirms the address through the emailed link.
    emailVerifiedAt: { type: Date, default: null },
    // Stamped into every session token. Bumping it signs the user out everywhere.
    sessionVersion: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    lastActiveDay: { type: String, default: "" }, // YYYY-MM-DD in UTC
    badges: { type: [BadgeSchema], default: [] },
    assessment: { type: AssessmentSchema, default: null },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);
