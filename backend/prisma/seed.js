import 'dotenv/config';
import prismaInstance from '../src/config/prisma.js';
import bcrypt from 'bcrypt';

async function main() {
	const adminEmail = 'admin@society.local';
	const adminPass = 'admin123';
	const passwordHash = await bcrypt.hash(adminPass, 10);

	const admin = await prismaInstance.user.upsert({
		where: { email: adminEmail },
		update: {},
		create: { name: 'Admin', email: adminEmail, passwordHash, role: 'ADMIN' },
	});

	const tower = await prismaInstance.tower.upsert({
		where: { name: 'A' },
		update: {},
		create: { name: 'A' },
	});

	const flat = await prismaInstance.flat.upsert({
		where: { towerId_number: { towerId: tower.id, number: '101' } },
		update: {},
		create: { number: '101', floor: 1, towerId: tower.id },
	});

	console.log('Seeded:', { admin: admin.email, tower: tower.name, flat: flat.number });
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });