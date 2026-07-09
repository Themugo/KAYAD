function createSession() {
  let ended = false;
  return {
    get ended() { return ended; },
    async withTransaction(callback) {
      if (ended) throw new Error("Session already ended");
      return callback(this);
    },
    async abortTransaction() {},
    async commitTransaction() {},
    endSession() { ended = true; },
  };
}

export async function startSession() {
  return createSession();
}

export default { startSession };
