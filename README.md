# University Library - LibraryApp

**University Library Management Web Application**  
Web Development Capstone · Jala University

A full-stack web application for discovering books and managing personal library activity. LibraryApp combines bibliographic information from the public **Open Library API** with library-specific data stored in **PostgreSQL**, including authenticated users, inventory, loans, reservations, reading statuses, and wishlists.

## Live application and source code

| Resource             | Link                                                                                                                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Web application      | [LibraryApp — Vercel](https://librarycapstone-frontend.vercel.app)                                                                              |
| Backend health check | [REST API health](https://university-library-api.onrender.com/api/health)                                                                       |
| Source repository    | [GitLab — Capstone Project](https://gitlab.com/jala-university1/cohort-3/ES.CO.CSWB-366.GA.T2.26.M2/SB/emanuel-gamarra/capstone-project-webdev) |

## Features

- **Book discovery:** trending and recently added books; searchable, filterable, sortable, paginated catalog.
- **Book details:** titles, authors, covers, descriptions, and publication information obtained from Open Library where available.
- **Authentication:** registration, login, protected personal pages, and JWT-based API access.
- **Loans:** borrow eligible books, view due dates and loan history, and return books.
- **Reservations:** reserve unavailable books, track reservation statuses, and manage eligible reservations.
- **Reading tracker:** mark borrowed books as `READING` or `COMPLETED`; preserve reading history after return.
- **Wishlist:** save and remove books independently of loan status.
- **Personalized Home summary:** currently reading / last read, upcoming or overdue loans, and personal activity counts.
- **Responsive UI:** React components styled with CSS Modules and shared design tokens.

Availability, stock, loans, reservations, reading statuses, and wishlist membership are managed by LibraryApp's backend, **not** inferred from Open Library metadata.

## Technology stack

| Layer                       | Technology                                             |
| --------------------------- | ------------------------------------------------------ |
| Frontend                    | React, TypeScript, Vite, React Router, CSS Modules     |
| Client state                | React Context (authentication) and component state     |
| Backend                     | Node.js, Express, JavaScript (ES modules), REST API    |
| Persistence                 | PostgreSQL, Sequelize ORM, Sequelize migrations        |
| Authentication / validation | JWT, Argon2id, Zod                                     |
| External book metadata      | Open Library API                                       |
| Frontend testing            | Jest, React Testing Library                            |
| Backend testing             | Node.js built-in test runner (`node:test`)             |
| Local database              | Docker Compose (PostgreSQL)                            |
| Deployment                  | Vercel (frontend), Render (backend), Neon (PostgreSQL) |

## Architecture

```text
Browser / React SPA
   |-- Open Library API ----------> Public bibliographic metadata
   |
   `-- Express REST API ---------> Business rules / JWT authentication
              |
              `-- Sequelize -----> PostgreSQL
                                   Users, Books, Loans,
                                   Reservations, ReadingStatus,
                                   WishlistItems
```

The backend follows a layered structure: **routes → controllers → services → models**. Book records are associated with Open Library **Work IDs** (`OL…W`). Open Library Edition IDs (`OL…M`) are not valid identifiers for library operations.

### Repository structure

```text
.
├── backend/
│   ├── config/               # Sequelize CLI configuration
│   ├── migrations/           # Database schema migrations
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── validators/
│   └── test/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── styles/
│   │   └── types/
│   └── test/
├── docker-compose.yml
└── README.md
```

## Local setup

### Prerequisites

- Node.js and npm compatible with the versions specified by `backend/package.json` and `frontend/package.json` (check any `engines` fields).
- Docker and Docker Compose for local PostgreSQL, **or** an existing PostgreSQL instance.
- Git.

### 1. Clone the repository

```bash
git clone <REPOSITORY_CLONE_URL>
cd capstone-project-webdev
```

Use the HTTPS or SSH clone URL available in GitLab; access may depend on repository permissions.

### 2. Configure the local database

Create a `.env` file **in the repository root**, used by Docker Compose:

```dotenv
POSTGRES_DB=library_db
POSTGRES_USER=library_user
POSTGRES_PASSWORD=replace-with-a-local-password
```

Start PostgreSQL:

```bash
docker compose up -d
```

If using an external PostgreSQL server instead, skip Docker Compose and supply the correct connection values in the backend environment file.

### 3. Configure and start the backend

Create `backend/.env`:

```dotenv
NODE_ENV=development
PORT=3011
DB_HOST=localhost
DB_PORT=5432
DB_NAME=library_db
DB_USER=library_user
DB_PASSWORD=replace-with-the-same-local-password
CLIENT_URL=http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
```

Generate a development JWT secret, for example, using `openssl rand -hex 32`. Keep secrets out of Git.

```bash
cd backend
npm ci
npm run db:migrate:status
npm run db:migrate
npm run dev
```

**Notes:** `db:migrate` applies pending migrations, including the tables for users, books, loans, reservations, reading statuses and wishlist items. Check your migration status and database target before running it, especially in production. The `npm run dev` command is the expected development start.

The API defaults to port **3011** in the documented local configuration. The health endpoint is expected at:

```text
http://localhost:3011/api/health
```

### 4. Configure and start the frontend

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:3011/api
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

**Important:** `VITE_API_URL` must include the `/api` suffix. Values prefixed with `VITE_` are embedded in the public frontend build: never put passwords, tokens, or database secrets in them.

## Verification and tests

From `frontend/`:

```bash
npm run lint
npm run build
npm test
```

From `backend/`:

```bash
npm test
npm run db:migrate:status
```

The frontend uses Jest + React Testing Library; the backend uses Node's built-in test runner. Existing automated tests complement manual verification of cross-service workflows; they are not a substitute for production integration and accessibility testing.

## Deployment configuration

The production architecture used for the capstone is:

- **Vercel:** React/Vite SPA.
- **Render:** Express REST API.
- **Neon:** hosted PostgreSQL.

### Backend (Render)

Configure the backend's environment variables in the hosting dashboard:

```dotenv
NODE_ENV=production
DB_HOST=<production-database-host>
DB_PORT=5432
DB_NAME=<production-database-name>
DB_USER=<production-database-user>
DB_PASSWORD=<production-database-password>
JWT_SECRET=<production-random-secret>
CLIENT_URL=https://librarycapstone-frontend.vercel.app
```

Allow the hosting provider to inject its `PORT` when appropriate. Configure production PostgreSQL TLS/SSL as required by Neon and the actual Sequelize configuration. Set `CLIENT_URL` to the exact deployed frontend origin (normally **without a trailing slash**). Verify production migrations carefully against the correct database before applying new ones.

### Frontend (Vercel)

```dotenv
VITE_API_URL=https://university-library-api.onrender.com/api
```

After changing `VITE_API_URL`, **rebuild/redeploy** the frontend: Vite resolves that variable at build time. Also configure the host to serve the SPA's entry point for client-side routes so refreshing a path such as `/catalog` or `/wishlist` works.

### Deployment smoke check

- Verify the public frontend URL in a private/incognito window.
- Verify `/api/health` on the public backend.
- Confirm registration/login, an authenticated API request, and persistence after reload.
- Check CORS and browser console for failed requests.
- Verify loan/reservation/wishlist/reading-status routes against the deployed database.

## Security and data handling

- JWT-protected endpoints control access to personal resources.
- Passwords are stored as Argon2id hashes; request payloads are validated on the backend.
- Database credentials and JWT secrets belong in local `.env` files or hosting secrets, never in the frontend or Git.
- Logout is handled on the client side; token expiration is enforced by the backend.
- Open Library supplies bibliographic metadata; application business records are maintained separately.

## Project scope

This is an academic capstone project. Its purpose is to demonstrate full-stack SPA development, external API integration, authentication, persistence, business rules, testing, and deployment. The application is not presented as an official library service.

### External services

- [Open Library](https://openlibrary.org/developers/api) — public bibliographic data.
- [Vercel](https://vercel.com/) — frontend hosting.
- [Render](https://render.com/) — backend hosting.
- [Neon](https://neon.tech/) — PostgreSQL hosting.

## Author

Developed by Emanuel Gamarra, as an individual Web Development Capstone project at **Jala University**.
