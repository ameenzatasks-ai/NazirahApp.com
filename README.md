# Nazirah — Quran Reading Progress Tracker

> **Nazirah** (نَظِيرَة) — reading the Quran by looking at the text, as opposed to recitation from memory.

Nazirah is a web application for traditional Islamic learning circles. Students log how many times they have read each of the 604 pages of the Mushaf; Ustadhs (teachers) create classes, monitor student progress, and post announcements.

![Screenshot placeholder — run the app and capture your own]()

---

## Setup

### Prerequisites
- Node.js 18+
- npm 9+

### Install & run

```bash
# 1. Clone the repository
git clone <repo-url>
cd nazirah

# 2. Install all workspace dependencies
npm install

# 3. Start both server (port 3001) and client (port 5173)
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for production

```bash
npm run build
npm start
```

The production server serves the built client as static files and listens on port 3001.

---

## Environment Variables

Create a `.env` file inside the `server/` directory (or copy `.env.example`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes (production)** | Insecure dev default | Secret for signing JWTs |
| `PORT` | No | `3001` | Server port |
| `DATABASE_PATH` | No | `./nazirah.db` | Path to the SQLite file |
| `FRONTEND_ORIGIN` | No (production) | — | Allowed CORS origin in production |

In development, if `JWT_SECRET` is not set the server uses an insecure default and logs a warning.  
**In production the server will refuse to start without `JWT_SECRET`.**

---

## Seed Accounts (development only)

Seed data is inserted automatically on first run when the database is empty.

| Role | Email | Password |
|---|---|---|
| Ustadh | `ustadh@nazirah.app` | `password123` |
| Student | `student1@nazirah.app` | `password123` |
| Student | `student2@nazirah.app` | `password123` |

The class **"Morning Hifz Circle"** is created with join code `ABC123` and both students enrolled.  
Student 1 (Fatimah Ali) has varied page reads across pages 1–40 covering all five statuses.

---

## API Reference

All routes are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.  
Errors return `{ "error": string }` with the appropriate HTTP status code.

### Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, role }` | `role` ∈ `'ustadh' \| 'student'` |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| GET | `/api/auth/me` | — | Returns current user (protected) |

### Classes

| Method | Path | Description |
|---|---|---|
| POST | `/api/classes` | Create a class (Ustadh only). Body: `{ name }`. |
| GET | `/api/classes` | List my classes |
| GET | `/api/classes/:id` | Class details (Ustadh only, must own) |
| POST | `/api/classes/join` | Body: `{ joinCode }` — Student joins |
| DELETE | `/api/classes/:id/leave` | Student leaves a class |

### Pages

| Method | Path | Description |
|---|---|---|
| GET | `/api/pages` | All 604 pages with status for current student |
| PATCH | `/api/pages/:pageNumber` | Body: `{ incrementBy }` (1–21). Log reads. |
| GET | `/api/pages/summary` | `{ black, red, amber, green, yellow }` counts |

### Ustadh Views

| Method | Path | Description |
|---|---|---|
| GET | `/api/classes/:id/students` | Students with summary counts |
| GET | `/api/classes/:id/students/:studentId/pages` | Full page list for one student |

### Announcements

| Method | Path | Description |
|---|---|---|
| POST | `/api/classes/:id/announcements` | Body: `{ body }`. Ustadh (owner) only. |
| GET | `/api/classes/:id/announcements` | Newest-first. Members only. |

---

## Page Status Legend

| Status | Colour | Condition |
|---|---|---|
| Black | `#1C1C1E` | Never read (read count = 0) |
| Red | `#E24B4A` | Read 1–9 times |
| Amber | `#F59E0B` | Read 10–20 times |
| Green | `#22C55E` | Read 21+ times, last read ≤ 10 days ago |
| Yellow | `#EAB308` | Read 21+ times, but not read in the last 10 days |

Status is always computed on the fly from `read_count` and `last_read_at`; it is never stored.

---

## Out of Scope for v1

- Push notifications
- File uploads / profile pictures
- Surah/Juz navigation overlay on the page grid
- Hifz progress tracking beyond Green status
- In-app messaging between students
- Parent/Guardian observer role
- React Native mobile app

---

## Implied Decisions (not explicit in the spec)

- **`nanoid` version 3** is used (CommonJS-compatible with `better-sqlite3`'s synchronous environment) rather than v4+ which is ESM-only. The server uses `customAlphabet` to produce unambiguous uppercase codes.
- **`ts-node-dev`** is used for the dev server watch loop as it requires no separate compilation step.
- The Student profile page (`/student/profile`) is added as a landing target for the mobile bottom-nav "Profile" tab, showing name, email, role, dark-mode toggle, and sign-out.
- In dark mode the background switches to `gray-900`; status colours remain the same.
