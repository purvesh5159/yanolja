FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy Prisma schema to allow generate
COPY prisma ./prisma
RUN npx prisma generate || true

# App source mounted by volume in compose during dev
EXPOSE 4000
CMD ["npm", "run", "dev"]