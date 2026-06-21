module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    if (request.endsWith(".js")) {
      try {
        return options.defaultResolver(request.replace(/\.js$/, ".ts"), options);
      } catch {
        // Preserve the original resolver error so Jest reports the requested path.
      }
    }
    throw error;
  }
};
