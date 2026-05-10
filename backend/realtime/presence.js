// realtime/presence.js

// =============================
// 🧠 DATA STORES
// =============================

// userId => Set of socketIds (multi-device support)
const onlineUsers = new Map();

// socketId => userId (fast reverse lookup)
const socketToUser = new Map();

// optional: last seen tracking
const lastSeen = new Map();

// =============================
// 👤 USER CONNECT
// =============================
export const addUser = (userId, socketId) => {
  if (!userId || !socketId) return;

  // add socket to user set
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId).add(socketId);

  // reverse mapping
  socketToUser.set(socketId, userId);
};

// =============================
// ❌ USER DISCONNECT
// =============================
export const removeUser = (socketId) => {
  const userId = socketToUser.get(socketId);

  if (!userId) return null;

  const sockets = onlineUsers.get(userId);

  if (sockets) {
    sockets.delete(socketId);

    // if no sockets left → user offline
    if (sockets.size === 0) {
      onlineUsers.delete(userId);

      // track last seen
      lastSeen.set(userId, Date.now());
    }
  }

  socketToUser.delete(socketId);

  return userId;
};

// =============================
// 🔍 GET USER SOCKET(S)
// =============================
export const getUserSockets = (userId) => {
  return onlineUsers.get(userId) || new Set();
};

// 🔥 single socket (legacy support)
export const getUserSocket = (userId) => {
  const sockets = onlineUsers.get(userId);
  return sockets ? [...sockets][0] : null;
};

// =============================
// 📊 ONLINE STATUS
// =============================
export const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

// =============================
// 🕒 LAST SEEN
// =============================
export const getLastSeen = (userId) => {
  return lastSeen.get(userId) || null;
};

// =============================
// 📊 TOTAL ONLINE USERS
// =============================
export const getOnlineCount = () => {
  return onlineUsers.size;
};

// =============================
// 📊 COUNT USERS IN ROOM
// =============================
export const countRoomUsers = (io, roomId) => {
  const room = io.sockets.adapter.rooms.get(roomId);
  return room ? room.size : 0;
};

// =============================
// 📡 BROADCAST USER STATUS
// =============================
export const broadcastUserStatus = (io, userId, online) => {
  io.emit("userStatus", {
    userId,
    online,
    lastSeen: online ? null : Date.now(),
  });
};