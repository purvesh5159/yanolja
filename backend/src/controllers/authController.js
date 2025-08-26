import bcrypt from 'bcrypt';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { signJwt } from '../utils/jwt.js';

const registerSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(6),
	role: z.enum(['ADMIN', 'RESIDENT', 'SECURITY']).optional(),
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

export const register = async (req, res, next) => {
	try {
		const { name, email, password, role } = registerSchema.parse(req.body);
		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) return res.status(409).json({ error: 'Email already registered' });
		const passwordHash = await bcrypt.hash(password, 10);
		const user = await prisma.user.create({ data: { name, email, passwordHash, role: role || 'RESIDENT' } });
		const token = signJwt({ id: user.id, role: user.role, email: user.email, name: user.name });
		return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};

export const login = async (req, res, next) => {
	try {
		const { email, password } = loginSchema.parse(req.body);
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });
		const valid = await bcrypt.compare(password, user.passwordHash);
		if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
		const token = signJwt({ id: user.id, role: user.role, email: user.email, name: user.name });
		return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};