# 07 — Admin Panel Spec

All admin routes live under `/admin/*`, protected by `AdminRoute.jsx` (checks `AuthContext`, redirects to `AdminLogin` if unauthenticated). Layout: fixed `AdminSidebar` (collapsible on mobile) + content area via `AdminLayout.jsx`.

## AdminLogin

- Username + password form (RHF + Zod). On success, `POST /api/auth/login`, redirect to `AdminDashboard`. Rate-limit errors surfaced clearly ("Too many attempts, try again in X minutes").

## AdminDashboard

- Stat cards (via `GET /api/admin/analytics/overview`): total orders, pending orders, revenue (delivered), low-stock product count, out-of-stock count.
- Recent orders table (last 10, link to `OrderDetail`).
- Low-stock products list (link to `ProductForm` for quick restock).
- **Marked optional module** (per `04-database-schema.md`): sales chart (`GET /api/admin/analytics/sales`) and top products — build if time allows, dashboard must still be fully functional without them (graceful fallback: hide the chart section if the endpoint errors, don't break the page).

## AdminProducts

- `DataTable`: thumbnail, name (current language), category, price, stock (with Low/Out badges), featured/new/active toggle switches (inline, calls `PATCH /toggle`, optimistic update in local state), edit, delete.
- Filters: category, status (active/inactive), stock (in stock/low/out), search by name/SKU.
- Bulk actions: none required for v1 (out of scope unless requested later).
- Delete: soft-delete by default with confirmation dialog (`ConfirmDialog`); explains it will hide the product from the storefront, not permanently erase it.

## ProductForm (create/edit)

- Fields (RHF + Zod, `schemas/product.schema.js`): SKU (optional), name_en, name_ar, slug (auto-generated from name_en, editable), category (select), description_en, description_ar (rich-enough textarea, not a full WYSIWYG — out of scope unless requested), price, compare_at_price (optional), stock_quantity, low_stock_threshold (defaults from settings), images (`ImageUploader`, drag-to-reorder, first = primary), is_featured, is_new_arrival, is_active toggles.
- Validation: price > 0, stock_quantity ≥ 0, at least one image required, slug uniqueness checked server-side on save (surfaced as a field error, not a generic failure).
- Autosave: not required — explicit Save button, with unsaved-changes warning on navigation away.

## AdminCategories

- `DataTable`: image thumbnail, name, product count, active toggle, sort order (drag-to-reorder), edit, delete.
- Delete blocked (with clear message + product count) if any products reference the category — matches `05-backend-api-spec.md` `409` behavior.

## CategoryForm

- Fields: name_en, name_ar, slug (auto from name_en), description_en/ar (optional), image, is_active, sort_order.

## AdminOrders

- `DataTable`: order number, customer name, phone, total, status (colored badge), date, actions (view detail).
- Filters: status, date range, search (name/phone/order number).
- Status quick-change dropdown inline in the table (calls `PATCH /:id/status`), with confirmation for terminal states (`delivered`, `cancelled`).

## OrderDetail

- Full order info: customer/delivery details, line items (using snapshotted name/price — with a link to "view current product" if it still exists), status timeline (`order_status_history`), status-change control, internal admin_note field (separate save action, no customer notification), print/export not required for v1.

## AdminBanners

- `DataTable`: image thumbnail, position, active toggle, sort order, edit, delete.

## BannerForm

- Fields: image (`ImageUploader`), title_en/ar (optional), subtitle_en/ar (optional), link_url (optional), position (select), is_active, sort_order.

## AdminSettings

- Single form (not a table) mapping directly to the `settings` table: store names, logo, contact phone/whatsapp/email, address, social links, default shipping fee, free shipping threshold, low-stock default, currency code (currency code + default shipping fee editable by `super_admin` only per API spec — regular `admin` sees these fields disabled/read-only with a tooltip explaining why).

## AdminAdmins (super_admin only)

- `DataTable`: username, email, role, active status, last login.
- Create/edit form: username, email, password (create only — reset via a separate "change password" action, not exposed in the edit form as plaintext), role, is_active.
- Guardrails enforced (per API spec): can't delete self, can't delete the last active super_admin.

## AdminSupport (optional module)

- Two tabs: Complaints, Return Requests.
- Complaints table: name, phone, message preview, status, date → detail view with admin_response field and status change.
- Returns table: order number, reason preview, status, date → detail view with admin_note and status change (approve/reject/complete).
- If this module is deprioritized for a later phase, `AdminSidebar` simply omits the link — no broken references elsewhere (support routes are never called from core flows).

## AdminAnalytics (optional module)

- Sales over time chart (line/bar, `period` selector 7d/30d/90d), top products by quantity sold table. Nice-to-have, not a blocker for launch — build after core admin CRUD is complete and stable.

## Cross-Cutting Admin Rules

- Every list page: skeleton rows while loading, `EmptyState` if zero results (with a "Create your first X" CTA where relevant, e.g. empty products table).
- Every create/edit form: disable Save while submitting, show inline field errors from Zod (client) and surface server-side validation errors (e.g. duplicate slug) mapped back to the correct field.
- Every destructive action (delete, hard-delete, cancel order) goes through `ConfirmDialog` — no destructive action fires on a single click.
- All admin tables paginated server-side (never fetch-all-then-client-filter for products/orders, which could grow into the thousands).
- Toggles (is_active, is_featured, etc.) are optimistic: UI updates immediately, rolls back with a toast error if the server call fails.
