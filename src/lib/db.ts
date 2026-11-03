import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Copy .env.example to .env.local and fill it in."
  );
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// The dev server hot-reloads modules, so the connection is cached on globalThis
// to avoid opening a new pool on every reload.
const globalForMongoose = globalThis as unknown as {
  _mongoose?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose._mongoose ?? {
  conn: null,
  promise: null,
};
globalForMongoose._mongoose = cached;

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
