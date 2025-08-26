import prisma from '../config/prisma.js';
import { z } from 'zod';

const createBillSchema = z.object({
	flatId: z.string().uuid(),
	monthStart: z.string().transform((d) => new Date(d)),
	amountCents: z.number().int().positive(),
	dueDate: z.string().transform((d) => new Date(d)),
});

const markPaidSchema = z.object({ billId: z.string().uuid(), amountCents: z.number().int().positive() });

export const listBills = async (req, res, next) => {
	try {
		const { flatId, status } = req.query;
		const where = {
			...(flatId ? { flatId: String(flatId) } : {}),
			...(status ? { status: String(status).toUpperCase() } : {}),
		};
		const bills = await prisma.maintenanceBill.findMany({ where, orderBy: { monthStart: 'desc' }, include: { flat: true, payments: true } });
		res.json(bills);
	} catch (err) {
		next(err);
	}
};

export const createBill = async (req, res, next) => {
	try {
		const { flatId, monthStart, amountCents, dueDate } = createBillSchema.parse(req.body);
		const bill = await prisma.maintenanceBill.create({ data: { flatId, monthStart, amountCents, dueDate } });
		res.status(201).json(bill);
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};

export const markBillPaid = async (req, res, next) => {
	try {
		const { billId, amountCents } = markPaidSchema.parse(req.body);
		const payment = await prisma.payment.create({ data: { billId, amountCents, status: 'SUCCESS', paidAt: new Date() } });
		await prisma.maintenanceBill.update({ where: { id: billId }, data: { status: 'PAID' } });
		res.json(payment);
	} catch (err) {
		if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => e.message).join(', ') });
		next(err);
	}
};