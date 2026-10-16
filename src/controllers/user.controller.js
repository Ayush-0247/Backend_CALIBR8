import prisma from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * GET /me
 * Returns the currently authenticated user (populated by protect middleware).
 */
export const getMe = (req, res) => {
  res.status(200).json({ success: true, user: req.user });
};

/**
 * PUT /me
 * Updates the currently authenticated user's profile.
 */
export const updateMe = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      throw new ApiError(400, 'Name cannot be empty.');
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() },
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

    res.status(200).json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};
