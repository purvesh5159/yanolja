import prisma from '../config/prisma.js';
import { z } from 'zod';

const createComplaintSchema = z.object({
	flatId: z.string().uuid(),
	category: z.string().min(1),
	description: z.string().min(1),
});

const updateStatusSchema = z.object({
	complaintId: z.string().uuid(),
	status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']),
});

export const listComplaints = async (req, res, next) => {
	try {
		const { flatId, status } = req.query;
		const where = {
			...(flatId ? { flatId: String(flatId) } : {}),
			...(status ? { status: String(status).toUpperCase() } : {}),
		};
		const complaints = await prisma.complaint.findMany({ where, orderBy: { createdAt: 'desc' }, include: { flat: true, raisedBy: { select: { id: true, name: true, email: true } } } });
		res.json(complaints);
	} catch (err) {
		next(err);
	}
};

export const createComplaint = async (req, res, next) => {
	try {
		const { flatId, category, description } = createComplaintSchema.parse(req.body);
		const raisedByUserId = req.user?.id;
		const complaint = await prisma.complaint.create({ data: { flatId, category, description, raisedByUserId } });
		res.status(201).json(complaint);
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};

export const updateComplaintStatus = async (req, res, next) => {
	try {
		const { complaintId, status } = updateStatusSchema.parse(req.body);
		const updated = await prisma.complaint.update({ where: { id: complaintId }, data: { status } });
		res.json(updated);
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};