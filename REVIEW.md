# BG — Code Review Tracker

Full-project review (backend + frontend), captured so we can see what's been fixed or added. Status legend: **open** = not addressed, **fixed** = done, **partial** = mostly done. Items are grouped by severity/theme, not by file order.

---

## Critical bugs (break real user flows)

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 1 | **Unlimited-stock products are unpurchasable.** `outOfStock = stock === 0` ignores `unlimitedStock`, so `stock_quantity: 0 + unlimited_stock: true` products show "Out of Stock" and can't be added to cart. | `ProductCard.jsx:14-15`, `CartContext.jsx:34-40`, `CartItem.jsx` | **fixed** |
| 2 | **Cart stock check only looks at the first 20 products.** Any cart item outside page 1 gets live `stock: 0` → checkout button permanently disabled ("Stock changed" warning). | `pages/Cart.jsx:21-35` | **fixed** — fetches all pages (loop until `meta.total`) |
| 3 | **Return-request API payload mismatch.** Frontend posts `{ order_id, reason, details }`; backend requires `{ order_number, phone, reason }`. Every return submission fails with a validation error. | `pages/MyOrders.jsx:50` vs `backend/server.js:323-331` | **fixed** — post `{ order_number, phone, reason }`, details folded into reason |
| 4 | **Cancel-order refresh throws a TypeError.** `OrderCard` calls `onRefresh()` with no args but the handler does `e.preventDefault()`; also the list doesn't refresh after cancel. | `pages/MyOrders.jsx:96,305-306` | **fixed** — `e?.preventDefault()`, `onRefresh={() => handleLookup()}` |
| 5 | **Admin orders list hard-capped at 20 rows** (server default `limit`) with no pagination or server-side filters — newer/older orders silently invisible. | `pages/admin/AdminOrders.jsx:32` | **fixed** — server-side pagination, status filter & search pushed to API, prev/next controls |

## Functional bugs (medium)

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 6 | Featured / new-arrival flags can't be changed — `toggleProduct` is never wired in the UI. | `src/api.js:29`, `pages/admin/AdminProducts.jsx` | **fixed** — per-row toggle chips now call `toggleProduct` |
| 7 | Regular admins see "Admins" page/menu; 403 is swallowed so it shows "No additional admins." | `AdminSidebar.jsx:31`, `AdminManage.jsx` | **fixed** — link hidden unless `role === 'super_admin'`; page shows access-denied card |
| 8 | Saving the estimated-delivery date re-sends a **stale status** and can revert a just-changed status. | `pages/admin/AdminOrders.jsx:298-302` | **fixed** — per-order `liveStatus` used for the date save |
| 9 | Admin product sort (name/category/stock) only reorders the currently loaded 20 rows. | `pages/admin/AdminProducts.jsx:92-100` | **fixed** — server-side sort keys (`name_en/ar`, `category_en/ar`, `stock`, `price`) pushed to the API; sort now spans every page |
| 10 | `ProductGallery` active index not reset when the product changes (stale slide/blank image after navigating product→product). | `components/shop/ProductGallery.jsx` | **fixed** — resets to slide 0 on `name` change |
| 11 | Race in Shop search/filter pump: an old request can overwrite newer filter results. | `pages/Shop.jsx:64-104` | **fixed** — monotonic `requestSeq` guard discards stale responses |
| 12 | One shared auth limiter (max 5/15min) across `auth/login`, `customers/login` and `customers/register` — failed logins can lock out the whole panel. | `backend/server.js:165,549,1856-1857` | **fixed** — new `customerAuthLimiter`; admin login keeps its own bucket |
| 13 | MyOrders 30s polling (2/min) can exhaust the shared `trackingLimiter` (20/15min). | `pages/MyOrders.jsx:291-304`, `backend/server.js:167` | **fixed** — tracking/support limiter raised to 60/15min |
| 14 | Checkout stock errors show raw RPC codes (`INSUFFICIENT_STOCK` etc.) + English product name; only the last conflicting item is shown. | `pages/Checkout.jsx:135-141` | **fixed** — localized product name + aggregated bilingual message (all items) |
| 15 | Price `>` comparisons on possibly-string `numeric` columns → discount badge may silently vanish. | `pages/ProductDetail.jsx:16-18` | **fixed** — `Number()` coercion in discount + compareAt display |
| 16 | **Raw server error messages** surface in English inside the Arabic UI. | `Login.jsx:42`, `Register.jsx:55`, `MyOrders.jsx:58`, checkout, admin toasts | **fixed** — Login/Register map `RATE_LIMITED`/`VALIDATION_ERROR` to localized strings; return form maps `NOT_FOUND`/`VALIDATION_ERROR` + rate-limit |
| 17 | Live-poll fails and keeps last snapshot — transient vanish conflation. | `CustomerAuthContext.jsx` | **fixed** — poll treats `401/UNAUTHORIZED` as logged-out (ghost session cleared); network/5xx still keep last customer |

## Validation / data

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 18 | Phone regex `[0-2,5]` includes a literal comma → `"01,23456789"` passes validation. | `backend/server.js:194`, `Login/Register/Checkout/Contact` | **fixed** — `[0-25]` in all 5 spots |
| 19 | No tests exist in either package (no `test` script); migrations are hand-run files and `020` is still untracked. | root/backend | open |
| 20 | No unique constraint on product/category `slug` (duplicate slug → 404 on the detail page). | migrations | **fixed** — `migrations/021-slug-unique.sql` drafted (dedupes + backfills + UNIQUE index + NOT NULL, transactional); **must be run manually** |

## i18n / RTL / branding

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 21 | Hardcoded English skipping `t()`: "Failed to load products / Try Again", "No options", "Remove {{key}} filter", admin `placeholder="superadmin"`, HeroVisual fallback copy, WhatsApp message always Arabic on English UI. | `ProductGrid.jsx`, `Select.jsx`, `FilterChips.jsx`, `AdminLogin.jsx`, `HeroVisual.jsx`, `ProductDetail.jsx:118` | **fixed** — HeroVisual "WRITE" readout + AdminLogin username placeholder now `t()`-driven (bilingual) |
| 22 | `ar.js` stray `{{ category }}` placeholder in `admin.categories.deleteBlocked` renders blank. | `i18n/ar.js:362` | **fixed** |
| 23 | Branding mismatch: frontend "El Bamb Group BG" vs email "El Bamby Group". | `i18n/en.js` vs `backend/email.js:26` | **fixed** — email `BRAND.name` → "El Bamb Group BG" |
| 24 | Admin detail **back-arrow never flips** in RTL. | `pages/admin/AdminOrderDetail.jsx:115` | **fixed** — `rtl:-scale-x-100` |
| 25 | Raw Tailwind palette colors (`amber-50`, `blue-50`, …) in status badges instead of design tokens. | `AdminOrders.jsx:13-17`, `AdminDashboard.jsx:25-29`, `Cart.jsx:67`, `Checkout.jsx:365`, `ProductDetail.jsx:244` | **fixed** — all badges/hints now token-based (`bg-bg-warning`, `bg-bg-info`, `bg-bg-success`, `bg-bg-primary-500` tints) |
| 26 | Status label fallback renders raw backend status string for `processing`/`returned` in MyOrders. | `pages/MyOrders.jsx:120-136` | **fixed** — uses `ORDER_STATUSES` lookup |

## Accessibility

| # | Issue | Location | Status |
|---|-------|----------|--------|
| 27 | Form labels not associated with inputs (no `htmlFor`/`id`/`aria-label`) on login/register/account/checkout. | `ui/Input.jsx`, `Checkout.jsx:235`, `Login.jsx`, etc. | **fixed** — `ui/Input.jsx` now generates an `id` and links the label via `htmlFor`/`aria-describedby` |
| 28 | Custom `Select` trigger lacks `role="combobox"`/`aria-expanded`; dialog has no `aria-label`; ContactButton social anchors unlabeled. | `ui/Select.jsx:26-36`, `ui/Modal.jsx:40`, `ContactButton.jsx` | **fixed** — combobox/listbox semantics on Select; `ariaLabel` prop on Modal; `aria-label` on Instagram + WhatsApp anchors |
| 29 | CartDrawer: clickable backdrop `aria-hidden`, no body-scroll lock. | `CartDrawer.jsx:23-29` | **fixed** — body-scroll lock on open (restored on close); backdrop `aria-hidden`; qty buttons use token-safe `available` cap (unlimited-stock safe) |

## Dead code / cleanup

| # | Issue | Status |
|---|-------|--------|
| 30 | Unused Zod schema files: `schemas/{auth,category,product,settings,contact}.schema.js` | **fixed** — all 5 deleted (`checkout.schema.js` kept, it's the only one imported) |
| 31 | `toggleProduct()` API dead; `compact` prop always false; `QuickViewModal.jsx`/`CategoryPills.jsx` absent but referenced | **fixed** — `toggleProduct` is wired (see #6); `compact` prop removed from `CartItem`/`Cart`; `QuickViewModal`/`CategoryPills` had no references (stale note) |
| 32 | Banner admin UI removed — `banners` routes/schema stay live on the backend with no admin editor | **fixed** — `/api/admin/banners*` routes + `bannerSchema` + unused `db.js` CRUD fns removed; public `GET /api/banners` kept (Home hero/secondary still depend on it); docs/05 updated |
| 33 | `incrementViewCount` un-awaited fire-and-forget; `view_count` never surfaced in analytics | **fixed** — `view_count` now returned by `/api/admin/analytics/top-products` and shown as a "Views" column in the new Top Products card on the analytics page |
| 34 | `AddPointsModal` `+201…` regex branch unreachable (input `maxLength={11}`) | **fixed** — regex simplified to `/^01[0-25]\d{8}$/` (also removes the `[0-2,5]` comma bug there); matches `normalizePhone()` output |

## Features worth adding (not bugs)

| Area | Suggestion | Status |
|------|-----------|--------|
| Storefront | Product spec comparison (capacity/speed/interface) — reinforces storage-first identity | open |
| Storefront | WhatsApp/phone order-status alerts for COD customers without an email | open |
| Storefront | Share-product button (WhatsApp), "recently viewed" strip | open |
| Storefront | Cart price-drift notice (client preview vs server snapshot at submit) | open |
| Images | Cloudinary transformations (`w_`, `q_auto`) on product URLs | open |
| Admin | Rebuild banner manager UI (backend routes still exist) | open |
| Admin | Orders/customers server-side pagination + CSV export | open |
| Admin | Duplicate-product action, bulk stock edit, surface `view_count` | open |
| Admin | Admin 2FA / harder auth | open |
| Catalog/SEO | `robots.txt`, `sitemap.xml`, product `schema.org`, per-page OG images | open |
| Points | Show earn/redeem-rate hints on product/cart; earn preview | open |
| Quality | Error boundaries + retry states for silently-swallowed fetches | open |
| Infra | Test setup + CI; migration runner; commit migration 020 | open |

---
**Tracker updated:** first pass + second pass (2026-08-07) — see "fixed" / "partial" marks above.

### Fixed in this pass (functional)
- **Unlimited stock** now honored everywhere: `ProductCard`, cart `addItem`/`updateQuantity`, `CartItem`, `Cart` live-stock revalidation, `ProductDetail` (qty/out-of-stock/low-stock).
- **Cart live-stock check fetches every page** (loops on `meta.total`) instead of only page 1, so items beyond the first 20 no longer fake `stock: 0`.
- **Return request** now posts `{ order_number, phone, reason }` (details folded into reason); friendly "missing info" guard.
- **Cancel refresh** no longer throws; list re-fetches after a cancel.
- **Admin orders**: server-side pagination + status/search filters + prev/next controls; per-order `liveStatus` stops the delivery-date save from reverting a status flip.
- **Featured / New-arrival** flags toggle in the product table (was dead).
- **Admins** menu/page gated to super_admin (sidebar hides it; page shows an access-denied card).
- **ProductGallery** resets to slide 0 when switching products.
- **Checkout stock conflicts** show every affected item locally with the localized product name.
- **Discount %** no longer breaks on numeric strings.
- **Account logout** stays on `/` instead of racing the `Navigate → /login` guard.

### Fixed in this session (infra / i18n / polish)
- `phoneRegex` comma bug fixed in backend + all 4 frontend schemas.
- Split admin vs customer auth rate-limit buckets; raised tracking/support limiter 20 → 60 so 30s polling no longer 429s users.
- Email brand name synced to "El Bamb Group BG" (matches frontend).
- `ar.js` stray `{{ category }}` placeholder removed.
- Localized: `ProductGrid` error/retry, `Select` empty state, `FilterChips` remove-label aria, WhatsApp message, checkout stock-conflict text, MyOrders `processing`/`returned` labels.
- Admin order-detail back arrow flips in RTL.

### Second pass (2026-08-07) — see updated statuses above
- **Shop search/filter race** (#11): each request claims a monotonic id; stale responses are thrown away, so a slow page-2 reply can't overwrite newer filtered results.
- **Auth error localization** (#16): Login/Register map `RATE_LIMITED`/`VALIDATION_ERROR` (login also `AUTH_FAILED`/`UNAUTHORIZED`) to bilingual strings; return form maps `NOT_FOUND`/`VALIDATION_ERROR`/rate-limit.
- **a11y** (#27–29): `ui/Input` label ↔ input associated via generated id (`htmlFor`/`aria-describedby`); `ui/Select` gets `role="combobox"`/`aria-expanded`/listbox semantics; `ui/Modal` accepts `ariaLabel`; CartDrawer locks body scroll while open. ContactButton labels (part of #28) still pending.
- **Badges → tokens** (#25): AdminDashboard statuses, Cart stock-changed banner, Checkout free-shipping hint, ProductDetail WhatsApp icon, ProductForm dirty-flag all switched from bare Tailwind palette to design-token tints.

### Third pass (2026-08-07)
- **Admin product sort spans all pages** (#9): added `name_*`, `category_*`, `stock_*` sort keys to `listProducts` (category orders via the `categories` foreign table); the admin table drops its client-side re-sort and pushes the sort to the API.
- **Ghost customer session** (#17): the profile poll now clears the customer on `401/UNAUTHORIZED` instead of silently keeping a dead session; transient network/5xx still keep the last customer.
- **Last hardcoded strings** (#21): `HeroVisual` "WRITE" readout and the AdminLogin username placeholder are now `t()`-driven; new `common.contact.instagram/whatsapp` + `admin.login.placeholderUsername` + `home.heroWrite` keys.
- **ContactButton anchors** (#28): Instagram + WhatsApp links get bilingual `aria-label`s.
- **AddPoints phone regex** (#34): dead `+201…` branch removed and the `[0-2,5]` comma bug there fixed → `/^[0-25]\d{8}$/`.

### Cleanup pass (2026-08-07)
- **Dashboard low-stock card now actually shows low-stock items** (was a static "all well-stocked" placeholder) — fetches `admin/products?low_stock=true`, lists items with an "Only X left" badge, links to the edit page.
- **Fixed the low-stock 500** behind it: `listProducts` tried a PostgREST column-to-column compare (`stock_quantity ≤ 'low_stock_threshold'`) that the stack rejects. Stock predicates are now applied in JS over the complete filtered set in `adminListProducts`, then paginated — totals/pageCount stay correct.
- **Unused schemas** (#30) deleted — only `checkout.schema.js` remains.
- **Dead `compact` prop** (#31) removed from `CartItem`/`Cart`.
- **Orphaned banner routes** (#32): `/api/admin/banners*` + `bannerSchema` + unused `db.js` CRUD removed; public `GET /api/banners` kept (Home hero/secondary depend on it). docs/05 route table updated.
- **`view_count` surfaced** (#33): returned by `/api/admin/analytics/top-products`; analytics page now shows a Top Products card with units sold + lifetime views.
- **Slug uniqueness enforced** (#20): drafted `migrations/021-slug-unique.sql` (dedupe + backfill + UNIQUE index + NOT NULL, single transaction, re-runnable). **Must be run manually.**

### Feature pass (2026-08-07) — roadmap `docs/14`
- **Analytics CSV export**: each analytics table (orders by status/category, top products) downloads a UTF-8-BOM CSV via `lib/csv.js`; export button per card; disabled when empty. Client-side — no new endpoint. docs/07 updated.
- **Share/SEO** (docs/14 §5): `SEO.jsx` now injects `og:title/og:description/og:image/og:url` + `link[rel=canonical]`; PDP gets `schema.org/Product` JSON-LD + WhatsApp/copy-link share + `og:image`; Home gets `Organization` JSON-LD; `public/robots.txt` + `public/sitemap.xml` generated via `backend/scripts/generate-sitemap.js`.
- **Reorder "Order again"** (docs/14 §3): customer-facing order lookups now include `product_id` on `order_items` (snapshots); `OrderCard` gains a bilingual "Reorder" button that maps snapshots to **live** catalog products (stock-safe, skips OOS/missing with a toast) and `CartContext.reorderItems` bulk-adds + opens the drawer.

### Checkout pass — governorate removed (2026-08-07)
- **Governorate dropped end-to-end:** `checkout.schema.js`, `Checkout.jsx` (defaults, validation map, submit payload, the Select block), `constants.js` (`EGYPT_GOVERNORATES` deleted), `AdminOrderDetail` address display, i18n (en/ar), backend `createOrderSchema` (`server.js`), `db.js` (selects/JSDoc/insert), `email.js` address join, docs/04 + docs/06.
- **Mobile ordering:** "Place Order" button moved out of the form into the sticky summary card (submit button with `form="checkout-form"`), so on phone the button is the **last** element, under the items preview.
- **Schema:** `orders.governorate` was `NOT NULL` → drafted `migrations/022-drop-orders-governorate.sql` to drop it. **Must be run manually.**

### Hero pass — editorial spec plate (2026-08-07)
- **Direction change (client-approved override of docs/01):** the no-banner hero is now an **editorial spec plate on warm paper** instead of the fixed ink band. `HeroVisual.jsx` v3 is a printed-catalogue plate: hairline frame that draws on once (stroke reveal), printer's crop ticks, `FIG.01` + registration disc, phone line-art with a `256GB` mono readout, and a `BG — 01 / ACCESSORIES` caption. One quiet settle, then stillness — no loop, orbit, scan, glow, spring, or parallax.
- **Warm-paper hero in `Home.jsx`:** removed the `bg-bg-ink` band, dot-matrix pulse, radial glow, glass pills and magnetic CTA. Eyebrow + second headline line now ink (`text-bg-text-secondary`, `text-bg-primary-600`), chips are bordered paper pills (`bg-bg-surface-raised`), CTA is a plain filled button (no glow shadow), and `CapacityMarquee` is plain (never on-ink). Masked word-by-word headline reveal kept as the single typeset entrance.
- **Cleanup:** dropped orphaned v2 keyframes (`dot-pulse`, `float-slow`, `scan-line`, `tick-in`) from `tailwind.config.js`, orphaned i18n keys (`home.heroWrite`, `home.heroSpec.*`) from en/ar, the unused `onInk` prop, and a duplicate `isLoading` block in `Home.jsx`.
- **Overrides docs/01's fixed ink-band rule (lines 72-75)** — deviation flagged and accepted by the client. The trust strip and out-of-stock overlay ink-band uses are untouched.

### Open / deferred (next candidate pass)
Status shown above: #19 (tests / CI / migration runner) remains, plus the "Features worth adding" table.