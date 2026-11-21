// backend/utils/io.js
// Centralized Socket.io instance management.
// Replaces getIO() with a module-level singleton.
//
// Usage:
//   import { setIO, getIO } from "./utils/io.js";
//   setIO(ioInstance);       // called once in server.js
//   const io = getIO();     // returns the instance (or null if not ready)

let _io = null;

export const setIO = (io) => {
  _io = io;
};

export const getIO = () => _io;
