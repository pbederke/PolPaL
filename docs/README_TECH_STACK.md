# PolPaL — Tech Stack

PolPaL (**Pol**itical **Pa**rty **L**inks) is a political entities linkage database built as a unified Next.js 16 full-stack application. The App Router provides both React UI pages and server-side Route Handlers, all backed by a PostgreSQL database via Prisma ORM.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4.3 (App Router) |
| Language | TypeScript 6.0.3 |
| Database | PostgreSQL 17 |
| DB Client | pg 8.16.3 |
| ORM | Prisma 7.10 (driver adapter: `@prisma/adapter-pg`) |
| Containerisation | Docker (multi-stage on Node 24 Alpine), Docker Compose |
| UI | React 19.2.8, Tailwind CSS 4.3, shadcn/ui, Radix UI, Lucide icons |
| Charts | Recharts 3.10 |
| Auth | JWT (`jose` 6.2), bcrypt 6, HTTP-only cookies |
| Validation | Zod 4.6 |
| Email | Nodemailer 10.3 |
| Logging | Pino 10.3 |
| Rate Limiting | rate-limiter-flexible 11.2 |
| CSV handling | PapaParse 5.5.4 |
| Markdown | react-markdown 10, react-syntax-highlighter 16 |
| Testing | Vitest 5.0 |
| Linting | ESLint 9 |
| Misc | disposable-email-detector, country-flag-icons |

---