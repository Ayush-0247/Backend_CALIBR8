import prisma from "../config/db.js";
import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { signToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";
import { blacklistToken } from "../utils/tokenBlacklist.js";

/**
 * Sanitize a user object — strip passwordHash before sending to client.
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
};

/**
 * Register user helper
 */
export const registerUser = async ({ email, password, name }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email: normalizedEmail, passwordHash, name: name.trim() },
    include: {
      socialAccounts: true,
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
 * Login user helper
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      socialAccounts: true,
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });
  if (!user) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const token = signToken({ id: user.id });
  return { user: sanitizeUser(user), token };
};

/**
 * Logout user helper
 */
export const logoutUser = (token) => {
  if (token) {
    blacklistToken(token);
  }
  return { success: true, message: "Logged out successfully." };
};

/**
 * Change password helper
 */
export const changeUserPassword = async (
  userId,
  { oldPassword, newPassword },
) => {
  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const isMatch = await comparePassword(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect.");
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { success: true, message: "Password updated successfully." };
};

/**
 * Get user profile helper
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
      preferredLanguage: true,
      createdAt: true,
      updatedAt: true,
      socialAccounts: true,
      topics: {
        include: {
          topic: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return user;
};

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw new ApiError(400, "email, password, and name are required.");
    }

    const data = await registerUser({ email, password, name });
    res.status(201).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, "email and password are required.");
    }

    const data = await loginUser({ email, password });
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Protected route: revokes the bearer token.
 */
export const logout = async (req, res, next) => {
  try {
    const token =
      req.token ||
      (req.headers.authorization
        ? req.headers.authorization.split(" ")[1]
        : null);
    const result = logoutUser(token);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me or GET /api/auth/verify
 * Protected route: verifies token and returns user profile.
 */
export const verifyAuth = async (req, res, next) => {
  try {
    const user = await getUserProfile(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 * Protected route: changes user password.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new ApiError(400, "oldPassword and newPassword are required.");
    }

    const result = await changeUserPassword(req.user.id, {
      oldPassword,
      newPassword,
    });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
