import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CertificateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    certId: { type: String, required: true, unique: true, index: true },
    holderName: { type: String, required: true },
    // "track" certificates are issued per completed track,
    // "course" is the final one.
    kind: { type: String, enum: ["track", "course"], default: "track" },
    trackSlug: { type: String, default: "" },
    title: { type: String, required: true },
    finalScore: { type: Number, required: true },
    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One certificate per person per track (and one course certificate). This makes
// issuing idempotent: passing a gate twice, or two requests racing, cannot duplicate it.
CertificateSchema.index({ userId: 1, kind: 1, trackSlug: 1 }, { unique: true });

export type CertificateDoc = InferSchemaType<typeof CertificateSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Certificate: Model<CertificateDoc> =
  (mongoose.models.Certificate as Model<CertificateDoc>) ||
  mongoose.model<CertificateDoc>("Certificate", CertificateSchema);
