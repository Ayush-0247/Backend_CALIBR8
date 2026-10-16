import prisma from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { signToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Sanitize a user object — strip passwordHash before sending to client.
 * @param {object} user
 * @returns {object}
 */
const sanitizeUser = (user) => {
  const { passwordHash, ...safe } = user;
  return safe;
};

/**
 * Register a new user.
 * @param {{ email: string, password: string, name: string }} data
 */
export const registerUser = async ({ email, password, name }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
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
  const user = await prisma.user.findUnique({
    where: { email },
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
