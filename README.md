# Society/Flat Management System

Tech stack: Node.js (Express), PostgreSQL (Prisma), React (Vite)

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or use your own DB and update `DATABASE_URL`)

## Backend

Env: `backend/.env`
```
PORT=4000
DATABASE_URL=postgresql://society:society_pass@localhost:5432/society_mgmt?schema=public
JWT_SECRET=dev_secret_change
```

Install and run:
```
cd backend
npm i
npx prisma generate
# Ensure Postgres is running and DATABASE_URL is valid
npx prisma migrate dev --name init
npm run start
```
Healthcheck: `GET http://localhost:4000/health`

Seed data:
```
node prisma/seed.js
```
Creates admin user: admin@society.local / admin123

## Frontend

Env: `frontend/.env.local`
```
VITE_API_BASE_URL=http://localhost:4000/api
```

Install and run:
```
cd frontend
npm i
npm run dev
```

## API Highlights
- POST /api/auth/register
- POST /api/auth/login
- GET/POST /api/towers
- GET/POST /api/flats, POST /api/flats/assign
- GET/POST /api/bills, POST /api/bills/pay
- GET/POST /api/complaints, POST /api/complaints/status

Use `Authorization: Bearer <token>` after login.

## Docker (optional)
A `docker-compose.yml` is provided for Postgres and dev backend. If Docker is installed:
```
docker compose up -d db
```
Then configure `DATABASE_URL` to use `db` host when running backend inside compose.
