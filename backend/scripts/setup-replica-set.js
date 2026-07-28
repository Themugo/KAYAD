// backend/scripts/setup-replica-set.js
// ─────────────────────────────────────────────────────────────
// MongoDB Replica Set Setup Script
// Initializes a 3-node replica set for high availability
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const setupReplicaSet = async () => {
  const primaryUri = process.env.MONGO_URI;
  const replicaSetName = process.env.MONGO_REPLICA_SET_NAME || "kayadReplicaSet";

  if (!primaryUri) {
    console.error("❌ MONGO_URI environment variable is required");
    process.exit(1);
  }

  try {
    console.log("🔧 Connecting to MongoDB primary...");
    await mongoose.connect(primaryUri);

    const admin = mongoose.connection.db.admin();

    // Check if replica set is already initialized
    try {
      const status = await admin.command({ replSetGetStatus: 1 });
      console.log("✅ Replica set already initialized");
      console.log("Replica Set Status:", {
        name: status.set,
        primary: status.members.find((m) => m.stateStr === "PRIMARY")?.name,
        secondaries: status.members.filter((m) => m.stateStr === "SECONDARY").map((m) => m.name),
        members: status.members.length,
      });
      await mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      if (error.code === 89) {
        // Replica set not initialized, proceed with initialization
        console.log("📋 Replica set not initialized, proceeding with setup...");
      } else {
        throw error;
      }
    }

    // Initialize replica set
    console.log("🔧 Initializing replica set...");

    const members = [];
    const hosts = process.env.MONGO_REPLICA_SET_HOSTS?.split(",") || [
      "localhost:27017",
      "localhost:27018",
      "localhost:27019",
    ];

    hosts.forEach((host, index) => {
      members.push({
        _id: index,
        host: host,
      });
    });

    await admin.command({
      replSetInitiate: {
        _id: replicaSetName,
        members: members,
      },
    });

    console.log("✅ Replica set initialized successfully");

    // Wait for replica set to be ready
    console.log("⏳ Waiting for replica set to be ready...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Check replica set status
    const status = await admin.command({ replSetGetStatus: 1 });
    console.log("📊 Replica Set Status:", {
      name: status.set,
      primary: status.members.find((m) => m.stateStr === "PRIMARY")?.name,
      secondaries: status.members.filter((m) => m.stateStr === "SECONDARY").map((m) => m.name),
      members: status.members.length,
    });

    console.log("✅ Replica set setup completed successfully");
  } catch (error) {
    console.error("❌ Replica set setup failed:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

setupReplicaSet();
