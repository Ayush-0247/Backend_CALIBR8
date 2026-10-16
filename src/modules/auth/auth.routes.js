import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../../config/db.js';

const router = Router();

const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() });
const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post('/auth/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw { status: 409, message: 'Email already exists' };

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({ data: {...data, password: hashed } });
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });

    res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV==='production', sameSite: 'lax', maxAge: 7*24*60*60*1000 }).status(201).json({ user: { id: user.id, email: user.email, onboarded: user.onboarded } });
  } catch (e) { next(e); }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user ||!(await bcrypt.compare(data.password, user.password))) throw { status: 401, message: 'Invalid credentials' };

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({ data: { userId: user.id, token, expiresAt: new Date(Date.now() + 7*24*60*60*1000) } });

    res.cookie('session', token, { httpOnly: true, secure: process.env.NODE_ENV==='production', sameSite: 'lax', maxAge: 7*24*60*60*1000 }).json({ user: { id: user.id, email: user.email, onboarded: user.onboarded } });
  } catch (e) { next(e); }
});

router.post('/auth/logout', async (req, res) => {
  const token = req.cookies.session;
  if (token) await prisma.session.deleteMany({ where: { token } });
  res.clearCookie('session').json({ ok: true });
});

export default router;