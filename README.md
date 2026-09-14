# CampusConnect: College Academic Collaboration Platform

CampusConnect is a private web application scoped exclusively to the students and professors of one college. Every feature is structured around academic workflows: sharing study notes, organizing course communication, managing timetables, and doubt solving.

This repository is split into two directories:
1. `backend/`: Express.js API server using Prisma ORM, JWT authentication, and Socket.io.
2. `frontend/`: React (Next.js App Router) web client styled with Tailwind CSS.

---

## Technical Stack & Configuration

### Ports
- **Frontend App**: `http://localhost:3000`
- **Backend API Server**: `http://localhost:5000`

### Authentication Domain Restriction
Signups are restricted to the college email domain (configurable in the backend `.env` file). The default is `college.edu`.

---

## Local Setup Instructions

### 1. Database & Backend Setup

1. Open a terminal and navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Copy the `.env` settings (already configured for local zero-setup testing using SQLite):
   ```env
   PORT=5000
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="college_app_super_secret_jwt_key_2026_!"
   COLLEGE_EMAIL_DOMAIN="college.edu"
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run migrations to initialize the SQLite database:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed the database with official college data (Departments, Subjects, Sections):
   ```bash
   npm run db:seed
   ```
6. Start the API development server (runs on port 5000):
   ```bash
   npm run dev
   ```

### 2. Frontend Client Setup

1. Open a new terminal and navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server (runs on port 3000):
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser to access the app.

---

## Database Migration to Production (PostgreSQL)

Prisma abstracts database drivers. To deploy this application to production with PostgreSQL, follow these simple steps:

1. Open `backend/prisma/schema.prisma` and edit the `datasource db` block:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Open `backend/.env` and update `DATABASE_URL` with your PostgreSQL server connection string:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/campusconnect?schema=public"
   ```
3. Regenerate the Prisma client and apply migrations:
   ```bash
   npx prisma db push
   # OR generate a production migration
   npx prisma migrate dev --name prod-init
   ```
4. Run the seed script to populate the production tables:
   ```bash
   npm run db:seed
   ```
