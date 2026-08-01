# 12 — Deployment & Environment

## Environments

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local dev | Vite dev server (`localhost:5173`) | Express via nodemon (`localhost:5000`) | Supabase project (shared dev instance or local Supabase CLI) |
| Production | Vercel (static SPA build) | Vercel (serverless functions, same repo/`vercel.json`) | Supabase project (production) |

Single Supabase project is sufficient at this scale — no separate staging DB required for v1, but the schema in `04-database-schema.md` is written to be reproducible via SQL migration files (`backend/migrations/` — agent should generate one `.sql` file per schema change, not hand-edit the live DB ad hoc) so a staging project can be spun up later if needed.

## Environment Variables

### `backend/.env.example`

```
PORT=5000
NODE_ENV=development

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
JWT_EXPIRES_IN=7d

RESEND_API_KEY=
RESEND_FROM_EMAIL=orders@bg-store.com

FRONTEND_URL=http://localhost:5173

RATE_LIMIT_WINDOW_MS=900000
```

### `frontend/.env.example`

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

**Rule:** the Supabase service role key, JWT secret, and Resend API key exist **only** in `backend/.env` — they must never appear in any `frontend/` file, `VITE_`-prefixed variable, or client-side bundle (Vite exposes all `VITE_`-prefixed vars to the client by design — this is a hard boundary, not a style preference).

## Third-Party Setup Checklist

1. **Supabase:** create project, run schema migrations from `backend/migrations/`, enable RLS per `04-database-schema.md`, copy `SUPABASE_URL` + `service_role` key (backend only — never the `anon` key is needed since the frontend never talks to Supabase directly).
2. **Cloudinary:** create account, create an **unsigned upload preset** scoped to an `bg-store/` folder, note cloud name + preset name for `VITE_CLOUDINARY_*` vars. Configure allowed formats and a max file size on the preset itself (defense against abuse since it's unsigned).
3. **Resend:** create account, verify sending domain, generate API key for `RESEND_API_KEY`.
4. **Vercel:** two projects (or one monorepo with two build configs) — `frontend` (static build, output `dist/`) and `backend` (serverless functions per `vercel.json`), both pointed at the same repo. Set all env vars above per project in the Vercel dashboard (never commit real values).

## Build & Deploy

- `frontend`: `npm run build` → `dist/` → Vercel static hosting, SPA rewrite rule (`vercel.json`) so all client routes fall back to `index.html`.
- `backend`: Vercel serverless functions per route group, or a single catch-all function wrapping the Express app (`server.js` exported as a handler) — whichever `vercel.json` pattern the agent implements, it must be consistent and documented in `backend/README.md`.
- CI (optional for v1, recommended): lint + build check on every push before merge — not a blocker for launch but should be set up once the core app is stable.

## Admin Bootstrap

Since there's no public admin signup, the **first super_admin** is created via the CLI script `backend/scripts/hash-password.js` + a one-off manual insert (documented in `backend/README.md`), not through the API. Subsequent admins are created via `AdminAdmins` in-app by an existing `super_admin`.

## Backups

- Supabase automatic daily backups (available on paid tiers) should be enabled before go-live — flag this to the client as an operational requirement, not something the codebase itself needs to implement.
- Cloudinary media is not deleted when a product/banner is deleted in the app (soft-delete pattern) — a periodic manual review of orphaned Cloudinary assets is an operational task, not a v1 feature.

## Domain & DNS

- Production domain pointed at Vercel per Vercel's standard DNS instructions (A/CNAME records) — client-provided domain, configured at go-live, not before.
