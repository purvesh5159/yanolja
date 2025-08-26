import prisma from '../config/prisma.js';
import { z } from 'zod';

const createFlatSchema = z.object({
	number: z.string().min(1),
	floor: z.number().int(),
	towerId: z.string().uuid(),
});

const assignUserSchema = z.object({ userId: z.string().uuid(), flatId: z.string().uuid() });

export const listFlats = async (req, res, next) => {
	try {
		const { towerId } = req.query;
		const where = towerId ? { towerId: String(towerId) } : {};
		const flats = await prisma.flat.findMany({
			where,
			orderBy: [{ towerId: 'asc' }, { number: 'asc' }],
			include: { tower: true, residents: { select: { id: true, name: true, email: true, role: true } } },
		});
		res.json(flats);
	} catch (err) {
		next(err);
	}
};

export const createFlat = async (req, res, next) => {
	try {
		const { number, floor, towerId } = createFlatSchema.parse(req.body);
		const flat = await prisma.flat.create({ data: { number, floor, towerId } });
		res.status(201).json(flat);
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};

export const assignUserToFlat = async (req, res, next) => {
	try {
		const { userId, flatId } = assignUserSchema.parse(req.body);
		const user = await prisma.user.update({ where: { id: userId }, data: { flatId } });
		res.json({ id: user.id, flatId: user.flatId });
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};