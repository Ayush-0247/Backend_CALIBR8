import { ApiError } from '../utils/ApiError.js';

/**
 * Global error handling middleware.
 * Catches ApiError instances and generic errors,
 * returning a consistent JSON error shape.
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
    });
  }

  // Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] ?? 'field';
    return res.status(409).json({
      success: false,
      message: `A record with that ${field} already exists.`,
    });
  }

  // Fallback: unknown error
  res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
};
