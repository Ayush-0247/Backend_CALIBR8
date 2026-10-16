import { registerUser, loginUser } from '../services/auth.service.js';
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
