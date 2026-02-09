const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async () => {
  // Only try to connect if MongoDB URI is configured
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MONGO_URI not configured. Running without database.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });
    isConnected = true;
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    isConnected = false;
    console.warn("⚠️ MongoDB unavailable - server running in offline mode");
    console.warn(`  Error: ${error.message}`);
    console.log("  Install MongoDB or set MONGO_URI to a valid connection string.");
  }
};

module.exports = { connectDB, isConnected: () => isConnected };
