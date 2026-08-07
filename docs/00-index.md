# BG (El Bamby Group) — Project Bible

**Store name:** BG
**Full name:** El Bamby Group / البمبي جروب
**Sub-name (Arabic):** بيت الميموري — *Bayt Al Memory* ("House of Memory"), used as the colloquial brand voice in Arabic copy.
**Business:** Flash drives, memory cards, SSDs, RAM, card readers, and adjacent mobile/computer storage accessories e-commerce (single store, bilingual AR/EN, COD only). The store's primary product focus is **storage media** (flash drives + memory cards) — phone cases/chargers/etc. remain supported as adjacent categories but should never be the visual focus of the homepage or first impression.

---

## What This Is

This folder is the **single source of truth** for the BG e-commerce project. It exists so that an AI coding agent (opencode) — or any developer — can implement the entire system **without making a single architectural, structural, or design decision on its own.**

Every decision that would normally require "creative judgment" — colors, file structure, DB schema, API shapes, naming, validation rules, page behavior — has already been made and written down here. If the agent has a question that isn't answered in these docs, that is a bug in the bible, not a green light to improvise. Stop and flag it rather than guessing.

## Rules for the Agent

1. **Read the relevant doc(s) before writing any code for that area.** Don't implement `AdminProducts.jsx` without reading `04-database-schema.md` and `07-admin-panel-spec.md` first.
2. **Do not deviate from the tech stack in `02-tech-stack.md`.** No swapping libraries "because it's easier."
3. **Do not invent new database columns, tables, or API routes.** If something seems missing, that's a signal to stop and ask, not to add it silently.
4. **Follow `10-coding-conventions.md` exactly** — file naming, folder placement, component patterns, import style.
5. **Match `01-brand-design-system.md` for every visual decision.** No ad-hoc colors, spacing, or fonts.
6. **Arabic is not an afterthought.** Every page/component must work correctly in RTL from the first implementation, per `08-i18n-rtl.md`.
7. **When a doc says "optional / recommended," it means: build it, but keep it cleanly separable** (its own table, its own routes, its own admin page) so it can be disabled without breaking core flows.

## Reading Order

| # | Doc | Purpose |
|---|---|---|
| 01 | `01-brand-design-system.md` | Colors, typography, spacing, tokens, motion, component look |
| 02 | `02-tech-stack.md` | Exact libraries + versions, why each was chosen |
| 03 | `03-file-architecture.md` | Full repo/folder/file layout for frontend + backend |
| 04 | `04-database-schema.md` | Every Supabase table, column, type, relationship, RLS policy |
| 05 | `05-backend-api-spec.md` | Every Express route, request/response shape, auth rules |
| 06 | `06-pages-functional-spec.md` | Every customer-facing page: behavior, states, edge cases |
| 07 | `07-admin-panel-spec.md` | Every admin screen: fields, validation, permissions |
| 08 | `08-i18n-rtl.md` | Translation key structure, RTL rules, font switching |
| 09 | `09-state-management.md` | What lives in React Context vs local state vs URL (no TanStack Query, no Zustand) |
| 10 | `10-coding-conventions.md` | Naming, structure, patterns, lint/format rules |
| 11 | `11-nonfunctional-requirements.md` | Performance, accessibility, SEO, security checklists |
| 12 | `12-deployment-env.md` | Environments, env vars, deploy targets, third-party setup |
| 14 | `14-features-roadmap.md` | Planned next features (priorities, WhatsApp free-channel rule, out-of-scope) |

## Project Snapshot

- **Frontend:** React 18 + Vite, Tailwind CSS, React Hook Form + Zod, Framer Motion (motion), plain-JS i18n via React Context
- **Backend:** Node.js + Express, JWT auth, Supabase (service role) as data layer
- **Database:** Supabase (PostgreSQL)
- **Images:** Cloudinary (unsigned uploads from frontend, URLs stored in Supabase)
- **Email:** Gmail SMTP via nodemailer (order confirmations)
- **Hosting:** Vercel (frontend SPA + backend as serverless functions)
- **Payment:** Cash on Delivery only — no payment gateway, ever, in v1
- **Languages:** Arabic (default, RTL) + English (LTR)
- **Primary product focus:** storage media (flash drives, memory cards, SSDs, RAM, card readers) — secondary: adjacent phone/computer accessories. The visual identity (homepage, category mix, product card spec treatment, hero copy) must reinforce the storage-media-first positioning.
- **Design direction (revised v2):** **technical-precise, hardware-influenced.** Think Crucial, Samsung SSD product pages, Western Digital spec sheets — generous whitespace, monospaced accents for capacity/speed data, big numerical callouts, subtle motion, lots of grid, restrained color. Plays to the technical nature of storage products. The brand color (magenta/pink) is used as an accent — never as the dominant surface color. A secondary "ink-on-paper" neutral (warm off-white) reads as more "spec sheet" than "consumer e-commerce template."
- **Scope boundary:** No online payments, no customer accounts/login, no wishlist, no product reviews, no coupons, no loyalty program, no live chat. (Same exclusions as the original SRS — do not add these without an explicit new instruction.)

## Relationship to Reference Projects

This bible was derived from two sources:
1. **BG's own SRS/planning doc** (client requirements, scope, initial tech stack list)
2. **tictoc-xpoint** — a prior sibling project whose architecture is the direct template for BG (same 4-Context pattern, same single `api.js` data layer, same plain-JS i18n flat dicts, same 4-file backend)

After implementation in the original layered design (TanStack/Zustand/i18next) proved to add indirection without value, BG was flattened to match the tictoc-xpoint style. `03-file-architecture.md` documents the change-table mapping old→\to.
