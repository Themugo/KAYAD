/**
 * Escape special regex characters to prevent ReDoS (Regular Expression Denial of Service).
 * Pass any user-supplied string through this before using in a $regex pattern.
 *
 * @param {string} s - Raw user input
 * @returns {string} Escaped string safe for use in RegExp
 */
export const escapeRegex = (s) =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
