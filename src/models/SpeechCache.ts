import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Audio for interviewer lines that are the same for everyone (a question as first asked, the closing line), so each is
 * generated once and replayed after that. Keyed by a hash of voice, model and text. Entries expire, so a voice update
 * reaches every line in time.
 */
const SpeechCacheSchema = new Schema({
  key: { type: String, required: true, unique: true },
  audio: { type: Buffer, required: true },
  expiresAt: { type: Date, required: true },
});
SpeechCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SpeechCacheDoc = InferSchemaType<typeof SpeechCacheSchema>;

export const SpeechCache: Model<SpeechCacheDoc> =
  (mongoose.models.SpeechCache as Model<SpeechCacheDoc>) || mongoose.model<SpeechCacheDoc>("SpeechCache", SpeechCacheSchema);
