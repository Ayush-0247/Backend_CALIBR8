import {
  registerUser,
  loginUser,
  logoutUser,
  changeUserPassword,
  getUserProfile,
} from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * POST /auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      throw new ApiError(400, 'email, password, and name are required.');
    }

    const data = await registerUser({ email, password, name });
    res.status(201).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new ApiError(400, 'email and password are required.');
    }

    const data = await loginUser({ email, password });
    res.status(200).json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/logout
 * Protected route: revokes the bearer token.
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.token || (req.headers.authorization ? req.headers.authorization.split(' ')[1] : null);
    const result = logoutUser(token);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /auth/me or GET /auth/verify
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
 * POST /auth/change-password
 * Protected route: changes the user password.
 */
export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new ApiError(400, 'oldPassword and newPassword are required.');
    }

    const result = await changeUserPassword(req.user.id, { oldPassword, newPassword });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
