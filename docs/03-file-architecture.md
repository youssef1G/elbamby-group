# 03 — File & Folder Architecture

BG follows a **deliberately simple, single-file-per-concern** layout — the tictoc-xpoint style, kept lean. No multi-brand branching, no state-management libraries, no query cache layer, no namespaced i18n JSON folders. State lives in React Context; data access goes through one `api.js` on the frontend and four files on the backend.

```
bg-store/
├── .gitignore
├── README.md
├── AGENTS.md
├── docs/                                # project bible (this file lives here)
│
├── backend/
│   ├── .env.example
│   ├── .env                             # gitignored
│   ├── package.json
│   ├── vercel.json                      # serverless config — routes /api/* -> server.js
│   ├── server.js                        # Express app: ALL routes + handlers, zod schemas, rate limiters, validate middleware, error handler (inline)
│   ├── db.js                            # Supabase client (service role) + toCamelCase + ALL data functions, grouped by table
│   ├── auth.js                          # JWT sign/verify + requireAdmin / requireSuperAdmin middleware
│   ├── email.js                         # Resend — sendOrderConfirmation (no-op without RESEND_API_KEY)
│   ├── migrations/                      # 000…013 SQL — schema Bootstrap (KEPT; see 04-database-schema.md)
│   └── scripts/
│       └── hash-password.js             # CLI bcrypt utility for creating admins
│
└── frontend/
    ├── .env.example
    ├── .env                             # gitignored
    ├── package.json
    ├── vite.config.js                   # manualChunks: react / motion / vendor only
    ├── tailwind.config.js               # brand tokens mapped from 01-brand-design-system.md
    ├── postcss.config.js
    ├── vercel.json                       # SPA rewrites
    ├── index.html                        # Google Fonts, meta tags
    ├── public/
    │   ├── logo.png
    │   └── favicon.ico
    └── src/
        ├── main.jsx                      # React entry: BrowserRouter > LocaleProvider > ThemeProvider > AuthProvider > CartProvider
        ├── App.jsx                       # Route definitions (storefront + admin), Layout component
        ├── index.css                     # Tailwind directives, CSS variable tokens, RTL base rules
        ├── api.js                        # SINGLE data-access module — every fetch function (products, orders, auth, admin, …) lives here
        ├── client.js                     # fetch wrapper (base URL, JSON headers, 401 handling) — consumed by api.js
        ├── context/                      # React Context only — NO Zustand, NO Redux
        │   ├── AuthContext.jsx           # admin JWT session (login/logout/me) via raw fetch
        │   ├── CartContext.jsx           # cart items + UI flags (drawer/mobile-nav/quick-view), persisted to localStorage 'bg-cart'
        │   ├── LocaleContext.jsx         # t() / lang / setLang — plain JS dicts (ar.js/en.js), persisted 'bg-lang'
        │   └── ThemeContext.jsx          # dark/light, persisted 'bg-theme', matchMedia listener
        ├── i18n/                         # flat plain-JS dictionaries (NO i18next)
        │   ├── en.js
        │   └── ar.js
        ├── hooks/
        │   └── useFocusTrap.js          # the ONLY hook kept (used by Modal / CartDrawer / QuickViewModal)
        ├── schemas/                      # Zod schemas for FRONTEND FORMS only — backend schemas are inlined in server.js
        │   ├── auth.schema.js
        │   ├── banner.schema.js
        │   ├── category.schema.js
        │   ├── checkout.schema.js
        │   ├── contact.schema.js
        │   ├── product.schema.js
        │   └── settings.schema.js
        ├── lib/
        │   ├── animations.js             # motion presets from 01-brand-design-system.md
        │   ├── cloudinary.js             # unsigned upload helper
        │   ├── formatters.js             # currency, date, phone formatting (locale-aware)
        │   └── constants.js              # order statuses, shipping defaults, low-stock threshold default
        ├── components/
        │   ├── layout/
        │   │   ├── Navbar.jsx
        │   │   ├── Footer.jsx
        │   │   └── ScrollToTop.jsx
        │   ├── ui/                        # generic, brand-styled primitives
        │   │   ├── Button.jsx
        │   │   ├── Input.jsx
        │   │   ├── Select.jsx
        │   │   ├── Badge.jsx
        │   │   ├── Toast.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Skeleton.jsx
        │   │   └── EmptyState.jsx
        │   ├── shop/
        │   │   ├── ProductCard.jsx
        │   │   ├── ProductGrid.jsx
        │   │   ├── ProductGallery.jsx
        │   │   ├── QuickViewModal.jsx
        │   │   ├── FiltersSidebar.jsx
        │   │   ├── FilterChips.jsx
        │   │   ├── SortDropdown.jsx
        │   │   └── CategoryPills.jsx
        │   ├── cart/
        │   │   ├── CartDrawer.jsx
        │   │   ├── CartItem.jsx
        │   │   └── CartSummary.jsx
        │   ├── common/
        │   │   ├── ContactButton.jsx      # floating WhatsApp / phone contact
        │   │   ├── HeroVisual.jsx         # home hero banner visual (ink-band system)
        │   │   ├── LanguageSwitcher.jsx
        │   │   ├── ThemeToggle.jsx
        │   │   └── SEO.jsx                # per-page meta tag injector
        │   └── admin/
        │       ├── AdminRoute.jsx         # protected route wrapper
        │       ├── AdminSidebar.jsx
        │       ├── DataTable.jsx          # reusable admin table (sort, paginate, actions)
        │       ├── StatCard.jsx
        │       └── ConfirmDialog.jsx
        └── pages/
            ├── Home.jsx
            ├── Shop.jsx                   # all products, filters, sort, search
            ├── ProductDetail.jsx
            ├── Cart.jsx
            ├── Checkout.jsx
            ├── CheckoutSuccess.jsx
            ├── MyOrders.jsx               # lookup by phone (no customer accounts)
            ├── About.jsx
            ├── Contact.jsx
            ├── NotFound.jsx
            ├── AdminLogin.jsx
            └── admin/
                ├── AdminLayout.jsx
                ├── AdminDashboard.jsx     # pulls analytics overview + sales chart
                ├── AdminProducts.jsx
                ├── ProductForm.jsx        # create/edit (was AdminProductForm.jsx)
                ├── AdminCategories.jsx
                ├── AdminOrders.jsx
                ├── AdminOrderDetail.jsx   # was OrderDetail.jsx; status update + note
                ├── AdminBanners.jsx
                ├── AdminSettings.jsx       # super_admin-only fields restricted server-side
                ├── AdminAdmins.jsx         # manage admin users (super_admin only)
                ├── AdminSupport.jsx        # complaints + return requests
                └── AdminAnalytics.jsx      # sales stats, top products
```

## What changed (and why) — from the original layered design

The docs originally specified a heavier stack (TanStack Query, Zustand, i18next namespaced JSON, an 8-folder backend with `routes/`/`controllers/`/`schemas/`/`middleware/`/`services/`/`config/`/`lib/`). After implementation proved the layering added indirection without value for a single-store, ~25-page app, BG was **flattened** to the tictoc-xpoint style. Functionality, designs, endpoints, and bilingual keys were all preserved — only the plumbing simplified.

| Original design | Current (flattened) | Reason |
|---|---|---|
| `api/*.api.js` (8 files) + `hooks/queries` + `hooks/mutations` (TanStack Query) | single `src/api.js` + `src/client.js`; components use `useState`+`useEffect` with `cancelled` flags | One data layer is easier to locate and audit; the cache/loading boilerplate wasn't earning its keep for this scope |
| `store/cartStore.js` / `uiStore.js` / `themeStore.js` (Zustand, 3 files) | `context/CartContext.jsx` (cart + UI flags in one) + `ThemeContext.jsx` + `LocaleContext.jsx` | React Context is enough; no external state lib. localStorage keys: `bg-cart`, `bg-theme`, `bg-lang` |
| `i18n/index.js` + `i18n/{en,ar}/*.json` namespaced | `i18n/en.js` + `i18n/ar.js` flat plain-JS dicts, consumed by `LocaleContext` | One flat file per language; `t()` resolves raw key → `common.<key>` fallback → English dict → last segment |
| `i18next` + `react-i18next` + `i18next-browser-languagedetector` deps | none | i18next removed entirely |
| `@tanstack/react-query`, `zustand` deps | none | Removed; `package.json` slimmed accordingly, vite manualChunks trimmed to `react`/`motion`/`vendor` |
| backend: `routes/` → `controllers/` → `services/db.js` + `middleware/` + `schemas/` + `config/` + `lib/caseMapper.js` (≈28 files) | backend: `server.js` (routes + handlers + schemas + limiters + error handler inline) + `db.js` (supabase client + toCamelCase + all data functions) + `auth.js` (JWT) + `email.js` (Resend) — **4 files** | tictoc-xpoint convention: the whole app is small enough to live in four files; an agent finds "where do I add order status logic" by searching `server.js` for `/api/admin/orders` |
| `schemas/` mirrored on BOTH frontend and backend | frontend `schemas/` = **form-only** Zod schemas (checkout, contact, etc.); backend Zod schemas are **inlined in `server.js`** (login, createAdmin, banner, category, order, product, return, complaint, settings) | Backend schemas are only used by `server.js`, so inlining removes a folder + import indirection. Frontend form schemas stay because React Hook Form + Zod run in the browser |

## Folder Placement Rules (for the agent)

- A new **page** → `pages/` (or `pages/admin/` if admin-only).
- A component used by **exactly one page** → still goes in the matching feature folder under `components/` (e.g. `components/shop/`), not inline in the page file, unless it's a trivial fragment.
- A component reused across **2+ feature areas** → `components/ui/` (pure primitives) or `components/common/` (branded helpers like `SEO`, `ThemeToggle`).
- Any frontend function that calls the API → add it to `src/api.js`. Never inline a `fetch` in a component.
- Any frontend Zod schema used by a **form** (RHF) → `src/schemas/`. Do NOT put API-validation schemas there — those live inlined in `backend/server.js`.
- Any backend data query → add an `export async function` to `backend/db.js`, grouped under its table section. Never use the Supabase client directly in `server.js` for a read/write — go through `db.js` (the only exception is `auth`'s `login`/`me`, which read the `admins` table inline for JWT flow clarity; if more admin-lookup logic appears, move it to `db.js`).
- State that needs to persist or cross pages → a `context/` provider in `main.jsx`'s tree. Do NOT add a state library.

## Backend File Responsibilities

| File | Owns | Does NOT do |
|---|---|---|
| `server.js` | Express app bootstrap, ALL routes, all handler functions (controller bodies inline), all zod schemas, the `validate(schema)` middleware, the 4 rate limiters, the `errorHandler`. ~70 handlers across auth/products/categories/orders/banners/settings/support/admins/analytics. | No direct Supabase queries except `login`/`me` admin lookups. Re-exports `app` for test harnesses. |
| `db.js` | `supabase` client (service role, nullable if env missing), `toCamelCase()` deep snake→camel mapper, `TABLE` map, and every data function (admins, categories, products + images, orders + items + status history, banners, settings, complaints, return requests, analytics aggregates). | No Express, no routes, no req/res. Throwing `STOCK_CHECK_FAILED` errors is the only error-shaping it does. |
| `auth.js` | `signToken`, `verifyToken`, `requireAdmin`, `requireSuperAdmin` middleware. Reads `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`. | No login handler (that's in `server.js`), no bcrypt (that's in `server.js`). |
| `email.js` | `sendOrderConfirmation({email, orderNumber, customerName})` via Resend. No-ops gracefully if `RESEND_API_KEY` missing. | No other email types yet (status-change emails reuse the same function — see `server.js` `adminUpdateOrderStatus`). |

## Frontend Data-Access Convention

```
component
   └── useEffect → api.js.fetchProducts(...)        // returns plain JSON
                       └── client.js.apiClient(...)    // fetch wrapper, base URL, JSON, 401
```

- `client.js` exports `apiClient(path, opts)` — wraps `fetch`, prefixes `VITE_API_URL`, sends `credentials: 'include'`, parses JSON, throws on non-2xx.
- `api.js` exports named functions (`fetchProducts`, `getProduct`, `submitOrder`, `login`, `fetchOrders`, `createOrder`, `updateProduct`, `getSettings`, `getBanners`, `fetchComplaints`, `fetchAdmins`, `fetchAnalyticsOverview`, …) — every endpoint the app calls. Components/hooks import these, never `client.js` directly.
- Loading/empty/error states are local `useState` in each page/component, set inside the same `useEffect` (guarded by a `cancelled` flag). Admin lists refetch by bumping a `reload` counter in the effect deps.

## What's NOT here (out of scope, see `02-tech-stack.md` / `06-pages-functional-spec.md`)

- Customer accounts/login, wishlist, reviews, coupons, loyalty, live chat, online payments.
- A `pages/admin/AdminCustomers.jsx` — no customer entity exists (orders are looked up by phone).
- A standalone `MobileNav.jsx` — mobile nav is part of `Navbar.jsx`.
- `WhatsAppButton.jsx` → renamed `ContactButton.jsx` (handles phone + WhatsApp).
