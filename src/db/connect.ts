import mongoose, { ConnectOptions } from "mongoose";
import logger from "@/server/config/pino-config";

const MONGODB_URI: string = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

/**
 * Global connection caching:
 * Ensures we do not create multiple connections
 * during API Route hot reloads in development.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Use global cache to persist the connection across hot reloads (for development)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cached: MongooseCache = (global as any).mongoose || {
  conn: null,
  promise: null,
};

if (process.env.DEBUG_MODE === "true") {
  mongoose.set("debug", true); // Log queries in development mode
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const options: ConnectOptions = {
      bufferCommands: true, // Change to true to buffer commands until connection is ready
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, options)
      .then((mongooseInstance) => {
        logger.info("Connected to MongoDB");
        return mongooseInstance;
      })
      .catch((err) => {
        logger.error("MongoDB connection failed:", err);
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    logger.error(err, "Failed to resolve connection promise:");
    throw err;
  }

  return cached.conn;
}

// Store in global cache to persist across hot reloads in development
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).mongoose = cached;

// mongoose.connection.on("disconnected", () => {
// 	logger.error("MongoDB disconnected! Attempting to reconnect...")
// 	setTimeout(dbConnect, 1000)
// })

export default dbConnect;
