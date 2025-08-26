import { PrismaClient } from '../generated/prisma/index.js';

let prismaClientInstance;

export const getPrismaClient = () => {
	if (!prismaClientInstance) {
		prismaClientInstance = new PrismaClient();
	}
	return prismaClientInstance;
};

export default getPrismaClient();