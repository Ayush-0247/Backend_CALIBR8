// In-memory token blacklist for revoked JWT tokens (logout)
const blacklistedTokens = new Set();

/**
 * Add a token to the blacklist.
 * @param {string} token
 */
export const blacklistToken = (token) => {
  if (token) {
    blacklistedTokens.add(token);
  }
};

/**
 * Check if a token has been blacklisted.
 * @param {string} token
 * @returns {boolean}
 */
export const isTokenBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};
