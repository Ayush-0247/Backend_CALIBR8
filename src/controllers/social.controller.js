import {
  getProviderAuthUrl,
  processOAuthCallback,
  unlinkSocialAccount,
} from "../services/social.service.js";

/**
 * GET /api/social/:provider/link-url
 * Returns authorization URL for linking external social account (Protected)
 */
export const getLinkUrl = (req, res, next) => {
  try {
    const url = getProviderAuthUrl(req.params.provider, req.user.id);
    res.status(200).json({ url });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/social/:provider/callback
 * OAuth redirect callback handler
 */
export const handleCallback = async (req, res, next) => {
  try {
    const result = await processOAuthCallback(req.params.provider, req.query);
    res.redirect(result.redirect);
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/social/:provider
 * Unlink social provider from the authenticated user (Protected)
 */
export const unlinkProvider = async (req, res, next) => {
  try {
    const result = await unlinkSocialAccount(req.user.id, req.params.provider);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
