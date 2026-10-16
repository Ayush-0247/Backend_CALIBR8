import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { blacklistToken } from '../utils/tokenBlacklist.js';

/**
 * Sanitize a user object — strip passwordHash before sending to client.
 * @param {object} user
 * @returns {object}
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
};

/**
 * Register a new user.
 * @param {{ email: string, password: string, name: string }} data
 */
export const registerUser = async ({ email, password, name }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, name: name.trim() },
    include: {
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });

  const token = signToken({ id: user.id });

  return { user: sanitizeUser(user), token };
};

/**
 * Login an existing user.
 * @param {{ email: string, password: string }} data
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = signToken({ id: user.id });

  return { user: sanitizeUser(user), token };
};

/**
 * Logout a user by blacklisting their active token.
 * @param {string} token
 */
export const logoutUser = (token) => {
  if (token) {
    blacklistToken(token);
  }
  return { success: true, message: 'Logged out successfully.' };
};

/**
 * Change a user's password.
 * @param {string} userId
 * @param {{ oldPassword: string, newPassword: string }} data
 */
export const changeUserPassword = async (userId, { oldPassword, newPassword }) => {
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters.');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const isMatch = await comparePassword(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { success: true, message: 'Password updated successfully.' };
};

/**
 * Get full user profile by ID.
 * @param {string} userId
 */
export const getUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
    throw new ApiError(404, 'User not found.');
  }

  return user;
};
