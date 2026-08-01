# 02 — Tech Stack (Locked)

No substitutions. If a library listed here is unavailable/deprecated at implementation time, stop and flag it — don't silently swap to something similar.

## Frontend

| Technology | Version | Purpose |
|---|---|---|
| JavaScript (ESM) | — | Language (no TypeScript, matches tictoc-xpoint convention) |
| React | ^18.0.0 | UI framework |
| React DOM | ^18.0.0 | DOM rendering |
| React Router | ^6.0.0 | Client-side SPA routing |
| Vite | ^5.0.0 | Build tool & dev server |
| @vitejs/plugin-react | ^4.0.0 | Fast Refresh |
| Tailwind CSS | ^3.4.0 | Utility-first CSS |
| PostCSS | ^8.0.0 | CSS processing |
| Autoprefixer | ^10.0.0 | Vendor prefixes |
| motion (framer-motion v12) | ^12.42.2 | Animation |
| lucide-react | ^0.4xx | Icons |
| **react-hook-form** | ^7.51.0 | All forms: checkout, contact, admin CRUD, login |
| **zod** | ^3.23.0 | Schema validation — frontend forms only (backend schemas are inlined in `server.js`) |
| **@hookform/resolvers** | ^3.3.0 | Wires Zod schemas into React Hook Form |
| Google Fonts | — | Space Grotesk, Inter, Cairo |

## Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js (ESM) | — | Runtime |
| Express | ^4.18.0 | HTTP server |
| @supabase/supabase-js | ^2.0.0 | Supabase client (service role on backend) |
| jsonwebtoken | ^9.0.0 | JWT auth for sessions |
| bcryptjs | ^2.4.3 | Password hashing |
| cookie-parser | ^1.4.6 | Parse httpOnly cookies from request |
| cors | ^2.8.5 | CORS middleware |
| helmet | ^8.2.0 | Security headers |
| express-rate-limit | ^8.5.2 | Rate limiting (auth + public write endpoints) |
| **zod** | ^3.23.0 | Server-side logged validation (schemas inlined in `server.js`) |
| resend | ^6.18.0 | Transactional emails (order confirmation) |
| dotenv | ^16.0.0 | Environment variables |
| nodemon (dev) | ^3.0.0 | Dev auto-restart |

## Database & Services

| Service | Role |
|---|---|
| Supabase (PostgreSQL) | Primary database — see `04-database-schema.md` |
| Cloudinary | Image hosting — unsigned uploads directly from frontend (products, banners, categories, logo) |
| Resend | Order confirmation emails (optional; no-ops without `RESEND_API_KEY`) |
| Vercel | Hosting — frontend as static SPA, backend as serverless functions |

## Why the tictoc-xpoint Pattern (Plain Context + Single api.js + 4-File Backend)

BG was originally designed with a richer state/data layer (TanStack Query, Zustand, i18next, 8-folder backend). after implementation proved the layering added indirection without value for a single-store, ~25-page app, it was **flattened** to match the tictoc-xpoint convention:

- **Plain React Context** for cart/theme/locale/auth — no external state library (no TanStack Query, no Zustand). Context is enough for this scope and avoids re-render cascades.
- **Single `src/api.js`** for all data access — every part that calls `fetch()` goes through one file. Components use `useState` + `useEffect` with `cancelled` flags — consistent pattern, no hidden cache/invalidation complexity.
- **Plain-JS `ar.js`/`en.js`** flat dictionaries serviced by `LocaleContext` — no i18next namespaces, no pluralization library, no language detector. Simple key-value lookup with `{{variable}}` interpolation and English fallback.
- **Backend: 4 files** — `server.js` (routes + handlers + schemas + limiters + error handler inline), `db.js` (supabase client + all data functions), `auth.js` (JWT sign/verify + guards), `email.js` (Resend). See `03-file-architecture.md` for the full tree.

The tradeoff (no caching layer, no automatic refetch-on-focus) is acceptable because BG is a single-store COD-only site with no real-time stock contention — stale cart data is re-validated at checkout, not mid-browse.

## Explicitly NOT Used (do not introduce)

- No TypeScript
- No Next.js / SSR framework — this is a client-rendered SPA (Vite)
- No CSS-in-JS (styled-components, emotion) — Tailwind only
- No TanStack Query (`@tanstack/react-query`) — removed
- No Zustand — removed
- No i18next / react-i18next — removed
- No Redux / Redux Toolkit
- No payment SDK (Stripe, Paymob, etc.) — COD only, out of scope
- No GraphQL — REST via Express