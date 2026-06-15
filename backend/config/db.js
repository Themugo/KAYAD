import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const options = {
      // Replica set configuration
      replicaSet: process.env.MONGO_REPLICA_SET_NAME || undefined,
      readPreference: process.env.MONGO_READ_PREFERENCE || 'primary',
      writeConcern: {
        w: process.env.MONGO_WRITE_CONCERN_W || 'majority',
        j: process.env.MONGO_WRITE_CONCERN_J !== 'false',
        wtimeout: parseInt(process.env.MONGO_WRITE_TIMEOUT || '5000')
      },
      
      // Connection pool configuration
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '100'),
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '10'),
      maxIdleTimeMS: parseInt(process.env.MONGO_MAX_IDLE_TIME || '30000'),
      waitQueueTimeoutMS: parseInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT || '5000'),
      
      // Performance tuning
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000'),
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000'),
      heartbeatFrequencyMS: parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY || '10000'),
      
      // Index configuration
      autoIndex: process.env.NODE_ENV !== 'production',
      
      // Retry configuration
      retryWrites: true,
      retryReads: true,
      
      // Compression
      compressors: ['zlib'],
      zlibCompressionLevel: 6
    };

    const conn = await mongoose.connect(process.env.MONGO_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Log replica set status if configured
    if (process.env.MONGO_REPLICA_SET_NAME) {
      console.log(`✅ Replica Set: ${process.env.MONGO_REPLICA_SET_NAME}`);
      if (conn.connection.hosts && conn.connection.hosts.length > 1) {
        console.log(`✅ Replica Set Members: ${conn.connection.hosts.map(h => h.host).join(', ')}`);
      }
    }
    
    // Monitor connection pool
    setInterval(() => {
      if (conn.connection.client && conn.connection.client.topology && conn.connection.client.topology.s && conn.connection.client.topology.s.pool) {
        const poolStats = {
          totalConnections: conn.connection.client.topology.s.pool.totalConnectionCount || 0,
          availableConnections: conn.connection.client.topology.s.pool.availableConnectionCount || 0,
          checkedOutConnections: conn.connection.client.topology.s.pool.checkedOutConnectionCount || 0
        };
        console.log('📊 Connection Pool Stats:', poolStats);
      }
    }, 60000);
    
  } catch (err) {
    console.error("❌ DB CONNECTION ERROR:", err.message);
    process.exit(1);
  }
};

// =============================
// 🔄 CONNECTION EVENTS (IMPORTANT)
// =============================
mongoose.connection.on("connected", () => {
  console.log("📡 Mongoose connected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

// =============================
// 🧠 GRACEFUL SHUTDOWN
// =============================
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🔴 MongoDB connection closed (app terminated)");
  process.exit(0);
});

export default connectDB;
