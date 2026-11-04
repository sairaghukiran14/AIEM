import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Only a hash of the token is stored, so a database leak does not hand out working reset links. */
const PasswordResetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
});

export type PasswordResetDoc = InferSchemaType<typeof PasswordResetSchema> & { _id: mongoose.Types.ObjectId };

export const PasswordReset: Model<PasswordResetDoc> =
  (mongoose.models.PasswordReset as Model<PasswordResetDoc>) ||
  mongoose.model<PasswordResetDoc>("PasswordReset", PasswordResetSchema);
