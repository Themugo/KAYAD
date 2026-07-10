function createSession() {
  let ended = false;
  let inTransaction = false;
  return {
    get ended() { return ended; },
    get inTransaction() { return inTransaction; },
    startTransaction() { inTransaction = true; },
    async withTransaction(callback) {
      if (ended) throw new Error("Session already ended");
      inTransaction = true;
      try {
        const result = await callback(this);
        return result;
      } finally {
        inTransaction = false;
      }
    },
    async abortTransaction() { inTransaction = false; },
    async commitTransaction() { inTransaction = false; },
    endSession() { ended = true; inTransaction = false; },
  };
}

export async function startSession() {
  return createSession();
}
