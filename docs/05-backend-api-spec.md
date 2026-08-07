# 05 — Backend API Spec

Base URL: `/api`. All responses JSON. All list endpoints support pagination via `?page=1&limit=20` and return:

```json
{ "data": [...], "meta": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 } }
```

All errors follow one shape (from `middleware/errorHandler.js`):

```json
{ "error": { "message": "Human readable message", "code": "VALIDATION_ERROR", "details": [ { "field": "price", "message": "Must be a positive number" } ] } }
```

Standard HTTP status codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate-limited, `500` server error.

## Auth

Admin sessions only (no customer accounts). JWT issued on login, sent as `httpOnly` cookie (not localStorage — safer against XSS) named `bg_admin_token`, 7-day expiry, refreshed on activity.

| Method | Path | Auth | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/login` | none | `{ username, password }` | rate-limited (5/15min per IP), sets cookie |
| POST | `/api/auth/logout` | admin | — | clears cookie |
| GET | `/api/auth/me` | admin | — | returns current admin (id, username, role) |

Middleware `auth.js` exports `requireAdmin` (any active admin) and `requireSuperAdmin` (role === `super_admin`), used per-route in `server.js`.

## Products

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/products` | none | Query: `category`, `search`, `sort` (`newest`/`price_asc`/`price_desc`/`featured`), `featured=true`, `new=true`, `page`, `limit`. Only returns `is_active=true` rows for non-admin callers. |
| GET | `/api/products/:slug` | none | Single product + images + category, active only |
| GET | `/api/admin/products` | admin | All products incl. inactive, admin filters (low stock, out of stock) |
| GET | `/api/admin/products/:id` | admin | By id, incl. inactive |
| POST | `/api/admin/products` | admin | Validated by `schemas/product.schema.js`; accepts `images: [{url, sort_order}]` |
| PUT | `/api/admin/products/:id` | admin | Partial update allowed |
| DELETE | `/api/admin/products/:id` | admin | Soft — sets `is_active=false` unless `?hard=true` (super_admin only) and no order_items reference it |
| PATCH | `/api/admin/products/:id/toggle` | admin | Body: `{ field: 'is_active' \| 'is_featured' \| 'is_new_arrival', value: boolean }` — quick toggles from the admin table |

## Categories

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/categories` | none | Active only, ordered by `sort_order` |
| GET | `/api/admin/categories` | admin | All, incl. inactive |
| POST | `/api/admin/categories` | admin | |
| PUT | `/api/admin/categories/:id` | admin | |
| DELETE | `/api/admin/categories/:id` | admin | Blocked with `409` if products reference it — response includes count, admin must reassign first |

## Orders

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/orders` | none, rate-limited | Public checkout submission. Validates stock availability at submit time, decrements `stock_quantity`, generates `order_number`, snapshots line items, sends an email confirmation (Gmail SMTP) if email provided, writes `order_status_history` row (`pending`) |
| GET | `/api/orders/track` | none, rate-limited | Query: `order_number`, `phone` — both required, must match, returns order + items + status history (public order tracking, no auth) |
| GET | `/api/orders/lookup` | none, rate-limited | Query: `phone` — returns list of orders for that phone (MyOrders page) |
| PATCH | `/api/orders/:id/cancel` | none, rate-limited | Public — customer can cancel only while status is `pending`; requires matching `phone` in body. Atomically restocks the order's items (`cancel_order_and_restock`, migration 020); idempotent — a retry on an already-cancelled order returns success instead of an error |
| GET | `/api/admin/orders` | admin | Filters: `status`, `date_from`, `date_to`, `search` (name/phone/order_number) |
| GET | `/api/admin/orders/:id` | admin | Full detail incl. items, status history, admin_note |
| PATCH | `/api/admin/orders/:id/status` | admin | Body: `{ status, note? }` — writes `order_status_history`, triggers email if status is customer-relevant (`confirmed`, `shipped`, `delivered`, `cancelled`). Cancel/return also restocks the order's items atomically (`cancel_order_and_restock`, migration 020) |
| PATCH | `/api/admin/orders/:id/note` | admin | Internal note only, no customer notification |

## Banners

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/banners` | none | Query: `position`, active only, ordered |

The admin CRUD (`/api/admin/banners`*) was removed — the storefront still reads hero/secondary banners, but there is no admin editor for them (banners are managed directly in the database until the editor is rebuilt).

## Settings

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/settings` | none | Public-safe subset only (no internal fields — currently all settings fields are public-safe, but route explicitly whitelists to prevent future accidental leaks) |
| GET | `/api/admin/settings` | admin | Full row |
| PUT | `/api/admin/settings` | admin, super_admin for `default_shipping_fee`/`currency_code` | Single-row upsert |

## Admin Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/admin/admins` | super_admin | List |
| POST | `/api/admin/admins` | super_admin | Create, hashes password |
| PUT | `/api/admin/admins/:id` | super_admin | Update role/active status |
| DELETE | `/api/admin/admins/:id` | super_admin | Cannot delete self, cannot delete last remaining super_admin |

## Support (optional module — complaints + returns)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/support/complaints` | none, rate-limited | From Contact page |
| POST | `/api/support/returns` | none, rate-limited | Body incl. `order_number`, `phone` for verification |
| GET | `/api/admin/support/complaints` | admin | Filters: `status` |
| PATCH | `/api/admin/support/complaints/:id` | admin | Update status / admin_response |
| GET | `/api/admin/support/returns` | admin | |
| PATCH | `/api/admin/support/returns/:id` | admin | |

## Analytics (optional module)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/admin/analytics/overview` | admin | Total orders, revenue (delivered only), pending count, low-stock count — powers `AdminDashboard` stat cards |
| GET | `/api/admin/analytics/sales` | admin | Query: `period` (`7d`/`30d`/`90d`) — time series for a chart |
| GET | `/api/admin/analytics/top-products` | admin | Best sellers by quantity sold, in `period` |

## Uploads

Images upload **directly from the frontend to Cloudinary** (unsigned upload preset) — the backend never proxies image bytes. The backend only ever stores/receives the resulting Cloudinary URL as a string field. `lib/cloudinary.js` on the frontend handles this; no `/api/upload` route exists on the backend.

## Middleware Applied Globally

- `helmet()` — security headers
- `cors()` — restricted to the frontend's origin(s) from env
- `express.json({ limit: '2mb' })`
- Request logging (method, path, status, duration) — simple, no external APM needed for this scale
- `errorHandler` — last middleware, catches everything, never leaks stack traces in production responses

## Rate Limits

| Scope | Limit |
|---|---|
| `POST /api/auth/login` | 5 requests / 15 min / IP |
| `POST /api/orders` | 10 requests / 15 min / IP |
| `GET /api/orders/track`, `/lookup` | 20 requests / 15 min / IP |
| `POST /api/support/*` | 10 requests / 15 min / IP |
| All other public GET routes | 100 requests / 15 min / IP |
