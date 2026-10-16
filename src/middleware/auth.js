import prisma from '../config/db.js';

export const auth = async (req, res, next) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: { message: 'Not authenticated' }, requestId: req.id });

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  });

  if (!session || session.expiresAt < new Date()) {
    return res.status(401).json({ error: { message: 'Session expired' }, requestId: req.id });
  }

  req.user = session.user;
  next();
};