import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Only a hash of the token is stored, like password-reset tokens. */
const EmailVerificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
});

export type EmailVerificationDoc = InferSchemaType<typeof EmailVerificationSchema> & { _id: mongoose.Types.ObjectId };

export const EmailVerification: Model<EmailVerificationDoc> =
  (mongoose.models.EmailVerification as Model<EmailVerificationDoc>) ||
  mongoose.model<EmailVerificationDoc>("EmailVerification", EmailVerificationSchema);
