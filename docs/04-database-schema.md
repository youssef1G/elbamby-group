# 04 — Database Schema (Supabase / PostgreSQL)

## Conventions

- All primary keys: `id uuid primary key default gen_random_uuid()`
- All tables: `created_at timestamptz not null default now()`, and `updated_at timestamptz not null default now()` (kept current via a trigger — see below)
- Bilingual fields always come in pairs: `_en` / `_ar` suffixes (e.g. `name_en`, `name_ar`)
- Money stored as `numeric(10,2)` in EGP, never float
- All tables get a `updated_at` trigger:

```sql
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;
-- applied per table: create trigger trg_<table>_updated_at before update on <table> for each row execute function set_updated_at();
```

---

## Core Tables

### `admins`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| username | text, unique, not null | |
| email | text, unique, not null | |
| password_hash | text, not null | bcrypt, 12 rounds |
| role | text, not null, default `'admin'` | enum: `super_admin`, `admin` |
| is_active | boolean, not null, default true | disable without deleting |
| last_login_at | timestamptz, nullable | |
| created_at / updated_at | timestamptz | |

### `categories`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| name_en | text, not null | |
| name_ar | text, not null | |
| slug | text, unique, not null | URL-safe, lowercase, generated from `name_en` |
| description_en | text, nullable | |
| description_ar | text, nullable | |
| image_url | text, nullable | Cloudinary URL |
| sort_order | integer, not null, default 0 | manual ordering in admin |
| is_active | boolean, not null, default true | hidden from storefront if false |
| created_at / updated_at | timestamptz | |

### `products`

| Column | Type | Notes |
|---|---|---|---|
| id | uuid, PK | |
| sku | text, unique, nullable | optional internal code |
| name_en | text, not null | |
| name_ar | text, not null | |
| slug | text, unique, not null | |
| description_en | text, nullable | |
| description_ar | text, nullable | |
| category_id | uuid, FK → categories.id, not null | `on delete restrict` (don't allow deleting a category with products; admin must reassign first) |
| price | numeric(10,2), not null | current selling price |
| compare_at_price | numeric(10,2), nullable | original price, for showing a strikethrough discount |
| stock_quantity | integer, not null, default 0 | |
| **unlimited_stock** | boolean, not null, default false | `true` = infinite stock — storefront never shows out-of-stock, checkout skips stock validation/decrement, admin shows "∞". Added in migration 014. |
| low_stock_threshold | integer, not null, default 5 | below this → "Low Stock" badge in admin |
| is_featured | boolean, not null, default false | |
| is_new_arrival | boolean, not null, default false | |
| is_active | boolean, not null, default true | visibility toggle; inactive = hidden from storefront entirely |
| sort_order | integer, not null, default 0 | optional manual featured/homepage ordering |
| view_count | integer, not null, default 0 | incremented on product detail view (cheap popularity signal) |
| **capacity_gb** | integer, nullable | Storage capacity in GB — optional, only for storage products. Displayed on product cards and detail pages as a spec chip ("256GB"). |
| **speed_class** | text, nullable | Speed rating (e.g. "U3", "V30", "A2", "C10"). Displayed as a spec chip on product cards for memory cards and SD cards. |
| **interface_type** | text, nullable | Interface type ("USB 3.2 Gen 1", "USB-C", "SATA III", "NVMe PCIe 4.0"). Displayed on product cards and detail pages for storage devices. |
| **form_factor** | text, nullable | Physical form factor ("2.5\"", "M.2 2280", "microSD", "USB-A"). Helps customers identify compatibility. |
| created_at / updated_at | timestamptz | |

**Stock rule:** `stock_quantity = 0` → storefront shows "Out of Stock," Add to Cart disabled, regardless of `is_active`.

### `product_images`

Separate table (not a JSON array column) so images have stable ordering, individual delete, and don't bloat the `products` row.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| product_id | uuid, FK → products.id, not null | `on delete cascade` |
| image_url | text, not null | Cloudinary URL |
| sort_order | integer, not null, default 0 | first image (sort_order 0) = primary/thumbnail |
| created_at | timestamptz | |

### `orders`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_number | text, unique, not null | human-readable, e.g. `BG-20260729-0001`, generated server-side |
| customer_name | text, not null | |
| phone | text, not null | primary contact + lookup key for `MyOrders`/tracking |
| alt_phone | text, nullable | |
| email | text, nullable | for optional Resend confirmation |
| address_line | text, not null | |
| city | text, not null | |
| governorate | text, not null | |
| notes | text, nullable | customer-provided delivery notes |
| subtotal | numeric(10,2), not null | |
| shipping_fee | numeric(10,2), not null | snapshot from settings at order time |
| total | numeric(10,2), not null | subtotal + shipping_fee |
| status | text, not null, default `'pending'` | enum: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned` |
| payment_method | text, not null, default `'cod'` | fixed value, kept as column for future-proofing only |
| **estimated_delivery** | date, nullable | admin-set expected delivery date, shown in admin orders list + public tracking. Added in migration 014. |
| admin_note | text, nullable | internal note, not shown to customer |
| created_at / updated_at | timestamptz | |

### `order_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK → orders.id, not null | `on delete cascade` |
| product_id | uuid, FK → products.id, nullable | `on delete set null` — keep the order item even if product later deleted |
| product_name_snapshot | text, not null | captured at order time (product name may change later) |
| product_image_snapshot | text, nullable | |
| unit_price_snapshot | numeric(10,2), not null | captured at order time (price may change later) |
| quantity | integer, not null, check (quantity > 0) | |
| line_total | numeric(10,2), not null | unit_price_snapshot × quantity |

**Rule:** order line items always snapshot name/price/image at time of purchase. Never join live to `products` for historical order display — only for admin convenience links ("view current product").

### `banners`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| image_url | text, not null | Cloudinary URL |
| title_en | text, nullable | |
| title_ar | text, nullable | |
| subtitle_en | text, nullable | |
| subtitle_ar | text, nullable | |
| link_url | text, nullable | internal path or external URL |
| position | text, not null, default `'home_hero'` | enum: `home_hero`, `home_secondary`, `shop_top` |
| sort_order | integer, not null, default 0 | |
| is_active | boolean, not null, default true | |
| created_at / updated_at | timestamptz | |

### `settings`

Single-row table (id fixed) rather than key-value — simpler to read/validate as one object.

| Column | Type | Notes |
|---|---|---|
| id | integer, PK, default 1, check (id = 1) | enforces single row |
| store_name_en | text, not null, default `'BG'` | |
| store_name_ar | text, not null, default `'البمبي جروب'` | |
| logo_url | text, nullable | |
| contact_phone | text, not null | |
| whatsapp_number | text, not null | default `'01020999911'` |
| contact_email | text, nullable | |
| address_en | text, nullable | |
| address_ar | text, nullable | |
| facebook_url | text, nullable | |
| instagram_url | text, nullable | |
| tiktok_url | text, nullable | |
| default_shipping_fee | numeric(10,2), not null, default 50 | |
| free_shipping_threshold | numeric(10,2), nullable | null = no free shipping offer active |
| low_stock_threshold_default | integer, not null, default 5 | fallback if a product doesn't override it |
| currency_code | text, not null, default `'EGP'` | |
| updated_at | timestamptz | |

---

## Optional Modules (build, but keep cleanly separable)

These weren't in the original SRS but are recommended for a real COD operation. Each is its own table/routes/admin page and can be disabled without touching core flows.

### `order_status_history`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK → orders.id, not null, on delete cascade | |
| status | text, not null | the status it changed to |
| changed_by | uuid, FK → admins.id, nullable | null = system/customer action |
| note | text, nullable | |
| created_at | timestamptz | |

Written automatically every time `orders.status` changes (trigger or controller logic) — powers the audit trail shown on `OrderDetail` and the tracking timeline in `MyOrders`.

### `complaints`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK → orders.id, nullable | complaints can be general, not always order-tied |
| name | text, not null | |
| phone | text, not null | |
| email | text, nullable | |
| message | text, not null | |
| status | text, not null, default `'open'` | enum: `open`, `in_progress`, `resolved`, `closed` |
| admin_response | text, nullable | |
| created_at / updated_at | timestamptz | |

Fed by the `Contact` page form.

### `return_requests`

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| order_id | uuid, FK → orders.id, not null | |
| reason | text, not null | |
| status | text, not null, default `'pending'` | enum: `pending`, `approved`, `rejected`, `completed` |
| admin_note | text, nullable | |
| created_at / updated_at | timestamptz | |

Requested via `MyOrders` once an order is `delivered`.

---

## Row Level Security (RLS)

RLS is enabled on **every** table. The Express backend connects with the **service role key**, which bypasses RLS entirely — so RLS here exists purely as a defense-in-depth safety net (e.g. if the anon key were ever exposed, or for any future direct-from-frontend reads).

If the frontend ever reads Supabase directly (not currently planned — all reads go through Express — but as a safety net):

```sql
-- Example pattern applied to products, categories, banners:
create policy "public read active rows"
on products for select
using (is_active = true);

-- Everything else (insert/update/delete) has NO public policy — only service role can write.
```

`orders`, `order_items`, `complaints`, `return_requests`, `admins`, `settings`, `order_status_history` get **no public policies at all** — reads and writes only via the backend (service role), since orders contain personal data (phone, address) and must never be publicly queryable.

## Indexes

```sql
create index idx_products_category on products(category_id);
create index idx_products_slug on products(slug);
create index idx_products_active_featured on products(is_active, is_featured);
create index idx_products_active_new on products(is_active, is_new_arrival);
create index idx_product_images_product on product_images(product_id);
create index idx_orders_phone on orders(phone);
create index idx_orders_order_number on orders(order_number);
create index idx_orders_status on orders(status);
create index idx_order_items_order on order_items(order_id);
create index idx_categories_slug on categories(slug);
create index idx_categories_active on categories(is_active);
```
