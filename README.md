# University Library SPA

A university library web application developed as the Capstone project for the Web Development course at Jala University.

The application allows users to explore books through the Open Library API, search and filter the catalog, and authenticate through a secure JWT-based authentication system.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, React Router, CSS Modules.
- **Backend:** Node.js, Express, Sequelize.
- **Database:** PostgreSQL (Docker for local development, Neon for production).
- **Authentication:** JWT (HS256), Argon2id, React Context API.
- **Testing:** Jest, React Testing Library, Node.js Test Runner.
- **Deployment:** Vercel (frontend), Render (backend), Neon (database).

## Project Structure

```text
├── frontend/          # React SPA
├── backend/           # Express REST API
├── docker-compose.yml # Local PostgreSQL
└── README.md
```

## Live Application & Repository

- **Live Application:** https://librarycapstone-frontend.vercel.app
- **Backend Health Check:** https://university-library-api.onrender.com/api/health
- **GitLab Repository:** https://gitlab.com/jala-university1/cohort-3/ES.CO.CSWB-366.GA.T2.26.M2/SB/emanuel-gamarra/capstone-project-webdev

## Local Development

**Requirements:** Node.js 22+, npm, Docker and Docker Compose.

Clone the repository and configure the environment variables using the provided `.env.example` files.

### Database

Create a `.env` file in the project root to configure the local PostgreSQL container:

```env
POSTGRES_DB=library_db
POSTGRES_USER=library_user
POSTGRES_PASSWORD=your_local_password
```

Start PostgreSQL from the project root:

```bash
docker compose up -d
```

These credentials must match the corresponding database connection variables in `backend/.env`.

### Backend

```bash
cd backend
npm ci
npm run db:migrate
npm run dev
```

Configure `backend/.env` with the PostgreSQL connection variables, `CLIENT_URL`, and a random `JWT_SECRET` (at least 32 bytes of entropy).

```dotenv
PORT=3011

# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=library_db
DB_USER=library_user
DB_PASSWORD=your_local_password

# Client URL
CLIENT_URL=http://localhost:5173

# Authentication
JWT_SECRET=your_generated_secret
```

Generate a secret using:

```bash
openssl rand -hex 32
```

### Frontend

In a separate terminal:

```bash
cd frontend
npm ci
npm run dev
```

Configure `frontend/.env` with:

```env
VITE_API_URL=http://localhost:3011/api
```

## Running Tests

### Frontend — Jest & React Testing Library

```bash
cd frontend
npm ci
npm test
```

Tests cover three critical React components (`SearchBar`, `Pagination`, `BookCard`) and the `useBookSearch` custom hook, including mocked external dependencies.

### Backend — Node.js Test Runner

```bash
cd backend
npm ci
npm test
```

Backend tests verify user registration, login, JWT generation, protected endpoint access, and rejection of invalid or expired tokens.

Additional frontend validation:

```bash
cd frontend
npm run lint
npm run build
```

## Authentication Flow

1. Users register through `POST /api/auth/register`. Passwords are hashed using Argon2id.
2. Login is performed through `POST /api/auth/login`, which returns a signed HS256 JWT valid for one hour.
3. The frontend stores the JWT in `sessionStorage` and manages authentication state through React Context API.
4. Protected API requests include the `Authorization: Bearer <token>` header.
5. `GET /api/auth/me` validates the token and retrieves the authenticated user.
6. Protected routes restrict access to authenticated users.
7. Logout clears the stored token and authentication state.

Logout is client-side. Since the backend does not maintain a token revocation list, an issued JWT remains valid until expiration unless its signature or validity checks fail.

## Deployment

The frontend is deployed on Vercel, the backend on Render, and PostgreSQL is hosted on Neon.

Production configuration uses environment variables for the database connection, JWT secret, CORS origin (`CLIENT_URL`), and API endpoint (`VITE_API_URL`).

The deployed application has been manually verified through registration, login, authenticated requests, protected routes, logout, and catalog navigation.

**Security:** Real environment files, credentials, and JWT secrets are excluded from the repository and submission.
