import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** A session token that was signed out. Rows disappear on their own once the token would have expired anyway. */
const RevokedSessionSchema = new Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export type RevokedSessionDoc = InferSchemaType<typeof RevokedSessionSchema>;

export const RevokedSession: Model<RevokedSessionDoc> =
  (mongoose.models.RevokedSession as Model<RevokedSessionDoc>) ||
  mongoose.model<RevokedSessionDoc>("RevokedSession", RevokedSessionSchema);
