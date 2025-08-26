import prisma from '../config/prisma.js';
import { z } from 'zod';

const createTowerSchema = z.object({ name: z.string().min(1) });

export const listTowers = async (_req, res, next) => {
	try {
		const towers = await prisma.tower.findMany({ orderBy: { name: 'asc' } });
		res.json(towers);
	} catch (err) {
		next(err);
	}
};

export const createTower = async (req, res, next) => {
	try {
		const { name } = createTowerSchema.parse(req.body);
		const tower = await prisma.tower.create({ data: { name } });
		res.status(201).json(tower);
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};