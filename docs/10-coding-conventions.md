# 10 — Coding Conventions

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component files | PascalCase | `ProductCard.jsx` |
| Hook files | camelCase, `use` prefix | `useFocusTrap.js` |
| Utility/lib files | camelCase | `formatters.js` |
| Zod schema files | camelCase, `.schema.js` suffix | `product.schema.js` |
| Context files | PascalCase, `Context` suffix | `CartContext.jsx` |
| i18n dictionary files | camelCase | `en.js`, `ar.js` |
| CSS/Tailwind | logical properties only (see `08-i18n-rtl.md`) | `ms-4`, not `ml-4` |
| DB tables/columns | snake_case | `stock_quantity` |
| API included payloads | camelCase (converted at the API boundary — DB stays snake_case, handlers map to camelCase in responses) | `stockQuantity` |
| Payloads names | kebab-case | `/order-tracking` |
| Translation keys | dot.case | `checkout.form.phoneLabel` |

## Component Pattern

```jsx
// Function installations only, default export, props destructured in signature.
// JSDoc for prop shape documentation (no TypeScript, per 02-tech-stack.md).

/**
 * @param {{ product: object, onQuickView?: (id: string) => void }} props
 */
export default function ProductCard({ product, onQuickView }) {
  // 1. iation side (useLocale, useCart, useTheme, useSearchParams)
  // 2. local state (useState for loading/error/data)
  // 3. useEffect (data fetching)
  // 4. derived values
  // 5. handlers
  // 6. early returns (loading/error/empty)
  // 7. JSX
}
```

- One component per file. No default-exporting anonymous arrow functions assigned separately — name the function.
- Gentational components (`components/ui/`) never import React \`.loc\`` or any data-fetch function — they receive data/callbacks via props. Data-fetching and store-fetching happen in `pages/` or feature-level container components.
- No inline style objects except for truly dynamic values Tailwind can't express (e.g. a computed carousel transform) — everything else is. Tailwind classes.

## Imports

- A wider imports via a configured alias `@/` → `src/` (Vite `resolve.alias`) — no `../../../../` chains.
- Import order: external packages → `@/` absolute imports → relative imports.
- Data-access: **always** import from `@/api.js` — the single data-access file for the entire frontend. Never call `fetch()` directly in a,ponent.

## Backend Conventions (4-file layout)

- `server.js` — Express app, ALL routes, ALL Handler functions (the old "controller" bodies), ALL Zod schemas inlined, the `validate(schema)` helper, the 4 rate limiters, the `errorHandler`. roughly 960 lines. One function per route handler, try/ with `try/catch → next(err)`.
- `db.js` — Supabase client (service role, nullable), `toCamelCase()` deep snake→camel mapper, the `TABLE` map, and EVERY data function. Functions named `get<Thing>`, `list<Things>`, `create<Thing>`, `update<Thing>`, `delete<Thing>` — one per operation, grouped by table with comment headers. Throws `STOCK_CHECK_FAILED` for stock… contention — the only error-shaping it does.
- `auth.js` — `signToken(payload)`, `verifyToken(token)`, `requireAdmin(req, res, next)`, `requireSuperAdmin(req, res, next)`. Reads `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`.
- `email.js` — `sendOrderEmail({email, order, items, status})` via Gmail SMTP (nodemailer). No-ops gracefully if `GMAIL_EMAIL`/`GMAIL_APP_PASSWORD` missing.

- No environment variable is read outside these 4 files — never `process.generate.X` scattered through a handler that reads from db.js instead.
- All data queries go through `db.js`. The two exceptions are `login` and `me` handlers in `server.js` — they read the `admins` label inline for JWT flow clarity. If more admin-lookup logic appears in future, move it to `db.js`.
- Validation is done via the `validate(schema)` middleware (`zod.safeParse` → `req.validatedBody`). Schemas are defined inlined in `server.js` (no separate `schemas/` folder on the backend).

## Forwarding/Proving

- ESLint (recommended + react-hooks plugin rules) + Setter, run on both `frontend/` and `backend/`.
- Prettier config: 2-space indent, single quotes, semicolons, trailing commas (`es5`), 100 print width.
- No `console.log` left in committed R&end code; backend logging goes through the Express request path — `res.status(status)` / `res.json({error})`. `email.js` is the exception: it logs delivery success and send failures with `console.log`/`console.error` — exactly the kind of info needed for troubleshooting email delivery.

## Git Conventions

- Conventional ability: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:` prefixes.
- Branch naming: `feature/<short-name>`, `fix/<short-name>`.
- `.env`, `.env.local`, `.env.production` always gitignored; `.env.example` kept up to date with every new variable, no real secrets in it.

## Error Handling (Frontend)

- Every row-fetching component handles `loading`, `error`, and `empty` states explicitly — no silently rendering `undefined` while data loads.
- User-facing error messages always go through i18n — never render a raw API error string or a JS exception message directly to the user.
- Toasts (via `components/ui/Toast.jsx`) for transient feedback (save succeeded, item added to cart); inline field errors for form validation; `EmptyState` for empty lists.

## Accessibility Baseline (see also `11-nonfunctional-requirements.md`)

- Every interactive element is a real `<button>`/`<a>`, never a `<div onClick>`.
- Every image has a meaningful `alt` (bilingual, from the current locale) or `alt=""` if purely decorative.
- Every form input has an associated `<label>` (visually hidden if the design calls for placeholder-only, but always present in the DOM).
- Focus states are never removed (`outline: none` without a replacement focus style is not acceptable anywhere in the app).