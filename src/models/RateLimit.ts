import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** One counter per policy, identity and fixed window. MongoDB deletes it after the window ends. */
const RateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  resetAt: { type: Date, required: true, expires: 0 },
});

export type RateLimitDoc = InferSchemaType<typeof RateLimitSchema>;

export const RateLimit: Model<RateLimitDoc> =
  (mongoose.models.RateLimit as Model<RateLimitDoc>) ||
  mongoose.model<RateLimitDoc>("RateLimit", RateLimitSchema);
