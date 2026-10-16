import { verifyToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { isTokenBlacklisted } from '../utils/tokenBlacklist.js';
import prisma from '../config/db.js';

/**
 * Middleware to protect routes.
 * Expects: Authorization: Bearer <token>
 * Attaches the full user object (without passwordHash) to req.user and the token to req.token.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided. Please log in.');
    }

    const token = authHeader.split(' ')[1];

    if (isTokenBlacklisted(token)) {
      throw new ApiError(401, 'Token has been revoked. Please log in again.');
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        difficulty: true,
        rating: true,
        onboarded: true,
        createdAt: true,
        updatedAt: true,
        topics: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(401, 'User belonging to this token no longer exists.');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token expired. Please log in again.'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid token. Please log in again.'));
    }
    next(err);
  }
};
