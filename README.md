# University Library SPA

Final project for the Web Development course.

## Structure

- `frontend/` — React + TypeScript + Vite
- `backend/` — Node.js + Express + JavaScript
- PostgreSQL — local development database using Docker

## Development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend requires `CLIENT_URL` and a random `JWT_SECRET` of at least 32
bytes. Generate a development secret, for example, with
`openssl rand -base64 48`, and add it only to `backend/.env`.

Authentication uses a one-hour HS256 JWT returned by `POST /api/auth/login`.
Authenticated requests send it in the `Authorization: Bearer <token>` header.
The future React authentication flow will keep the token in `sessionStorage`,
remove it and clear `AuthContext` on logout, and discard it after a `401` from
`GET /api/auth/me`.

Logout is client-side because the backend does not keep sessions or a token
revocation list. A copied JWT therefore remains valid until its one-hour
expiration.
