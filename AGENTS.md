# AGENTS.md — BG (El Bamby Group) E-commerce Project

You are implementing **BG**, a bilingual (Arabic/English) phone-accessories e-commerce site for El Bamby Group (البمبي جروب). This file is your entry point. It is intentionally short — the real specification lives in `docs/`.

## Before You Do Anything

**Read `docs/00-index.md` first, every session.** It tells you which doc governs which part of the app. Then read the specific doc(s) relevant to the task in front of you before writing code for that area:

- Touching colors, spacing, fonts, motion, component look → `01-brand-design-system.md`
- Adding a dependency, unsure what's in the stack → `02-tech-stack.md`
- Creating a file, unsure where it goes → `03-file-architecture.md`
- Touching the database, adding a column/table → `04-database-schema.md`
- Adding/changing an API route → `05-backend-api-spec.md`
- Building/changing a customer-facing page → `06-pages-functional-spec.md`
- Building/changing an admin screen → `07-admin-panel-spec.md`
- Anything text-facing, layout direction, forms → `08-i18n-rtl.md`
- Deciding where a piece of state lives → `09-state-management.md`
- Naming, file patterns, component/controller structure → `10-coding-conventions.md`
- Performance, accessibility, SEO, security concerns → `11-nonfunctional-requirements.md`
- Env vars, deploy, third-party service setup → `12-deployment-env.md`

If a task doesn't map cleanly to a doc, or the doc doesn't answer your question, **stop and ask** — do not invent the missing piece. A gap in the bible is a bug in the bible, not permission to improvise.

## Non-Negotiable Rules

0. **Never delete, move, overwrite, or run any destructive command (`rm`, `rm -rf`, force-overwrite scaffolding flags, `git clean`, etc.) on anything in this repository — especially `AGENTS.md` and everything under `docs/` — without asking first and getting an explicit yes.** This applies even when running a scaffolding tool (`npm create vite@latest`, `create-react-app`, etc.): if that tool wants to initialize into a non-empty directory, do not let it wipe the directory. Instead, either scaffold into a temporary location and move only the generated files in by hand, or use the tool's non-destructive/merge flags, or scaffold directly inside an already-created empty `frontend/`/`backend/` subfolder rather than at the project root. If you are ever unsure whether a command is destructive, treat it as destructive and ask first.
1. **No architectural decisions of your own.** Tech stack, folder structure, DB schema, API shapes, and page behavior are already decided. Implement them; don't redesign them.
2. **No new libraries, tables, columns, or routes** beyond what's specified, without flagging it to the user first.
3. **Every visual decision uses the tokens in `01-brand-design-system.md`.** No ad-hoc hex colors, no default Tailwind palette colors, no arbitrary spacing.
4. **RTL is not optional or a later pass.** Every component you build must work correctly in Arabic/RTL the first time, per `08-i18n-rtl.md` — logical Tailwind properties only (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`), never `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right`.
5. **Both languages, always.** No page, form, admin screen, or error message ships in only one language.
6. **Server-side validation is mandatory even when client-side exists.** Never trust the frontend as the security boundary (see `11-nonfunctional-requirements.md`).
7. **Secrets never reach the frontend.** Supabase service role key, JWT secret, Gmail app password stay in `backend/.env` only — never a `VITE_`-prefixed variable.
8. **Follow `10-coding-conventions.md` exactly** — naming, file placement, component/controller patterns. Consistency across ~25+ pages and ~15+ forms matters more than any individual file being "clever."

## Working Process

For any non-trivial task (a new page, a new admin screen, a schema change):

1. **State your plan** briefly before writing code: which bible doc(s) you read, what files you'll create/touch, any assumption you're making. Keep this short — a few lines, not an essay.
2. **Build it.**
3. **Self-check against the relevant doc(s)** before considering it done: did you hit every field/state/behavior listed? Loading/empty/error states handled? Bilingual? RTL-correct?
4. **Flag anything you had to guess on**, rather than silently shipping a guess.

For small, obviously-scoped tasks (fix a typo, adjust a spacing value already defined in the tokens), just do it — don't over-process trivial work.

## Project Snapshot (see `02-tech-stack.md` for full detail)

- Frontend: React 18 + Vite, Tailwind, TanStack Query, Zustand, React Hook Form + Zod, i18next, motion (Framer Motion)
- Backend: Node.js + Express, JWT (httpOnly cookie) auth, Supabase (service role) as the data layer
- DB: Supabase/PostgreSQL — see `04-database-schema.md`
- Images: Cloudinary, unsigned upload from frontend
- Email: Gmail SMTP (nodemailer)
- Hosting: Vercel (frontend SPA + backend serverless)
- Payment: Cash on Delivery only — never add a payment gateway without explicit new instruction
- Default language: Arabic (RTL), English secondary
- Out of scope (do not build unless explicitly asked later): online payments, customer accounts/login, wishlist, product reviews, coupons, loyalty program, live chat

## Dev Environment

- `frontend/` and `backend/` are separate npm projects — run/install each independently (see `12-deployment-env.md` for env var setup and `03-file-architecture.md` for the full tree).
- Don't commit `.env` files; keep `.env.example` current whenever you add a new variable.
- Lint/format before considering any task complete (ESLint + Prettier, both packages) — see `10-coding-conventions.md` for the exact config.