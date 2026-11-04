import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** A requested change of email address, waiting for the link sent to the NEW address to be opened. Hash only. */
const EmailChangeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  newEmail: { type: String, required: true, lowercase: true, trim: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  createdAt: { type: Date, default: Date.now },
});

export type EmailChangeDoc = InferSchemaType<typeof EmailChangeSchema> & { _id: mongoose.Types.ObjectId };

export const EmailChange: Model<EmailChangeDoc> =
  (mongoose.models.EmailChange as Model<EmailChangeDoc>) ||
  mongoose.model<EmailChangeDoc>("EmailChange", EmailChangeSchema);
