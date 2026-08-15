-- 027: Product variants (color) system.
-- Spec: docs/14-product-variants.md  (section 3 — Database Schema)
--
-- Purpose:
--   Generic `product_variants` table so any category (starting with Medals)
--   can offer color swatches on PDP / cart / checkout / order / tracking / email.
--   Extensible to size/style later via `variant_group`; this phase is color only.
--
-- What this adds (additive, backward compatible):
--   1. `product_variants` table — id, product_id->products, variant_group
--      (default 'color'), value (slug), label_en, label_ar, hex_code, image_url,
--      is_default, sort_order, is_active, created_at/updated_at,
--      unique(product_id, variant_group, value).
--   2. `idx_product_variants_product_id` index (variant lookups are by product).
--   3. Three nullable snapshot columns on `order_items` (variant_id,
--      variant_label_en, variant_label_ar) — mirrors the existing
--      product_name_snapshot / unit_price_snapshot pattern so historical orders
--      keep the color the customer actually picked even if an admin later renames
--      or deactivates it.
--
-- Deliberately NOT added (per docs/14 §3 Notes):
--   * A trigger to enforce "one is_default per product" — §3 says enforce that in
--     application code (db.js), "keep this simple, don't over-engineer with
--     triggers". db.js createVariant/updateVariant are responsible for the
--     single-default invariant.
--   * Per-variant stock / pricing / multi-image galleries (out of scope per §2).
--
-- Safe & re-runnable: `create table if not exists`, `create index if not exists`,
-- and `alter table ... add column if not exists` — re-running is a no-op.
-- Everything is transactional: if any step fails, the whole migration rolls back.
--
-- (Note: a standard `set_updated_at` maintenance trigger is intentionally
-- omitted here to match docs/14 §3's "don't over-engineer with triggers" rule.
-- If the maintainers prefer the docs/04 "all tables get an updated_at trigger"
-- convention for this new table, add it in a follow-up migration — it is not
-- required by the feature spec.)

begin;

-- 1. The variant table (docs/14 §3, lines 32-47)
create table if not exists product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  variant_group text not null default 'color',
  value         text not null,          -- slug, e.g. 'gold'
  label_en      text not null,          -- 'Gold'
  label_ar      text not null,          -- 'ذهبي'
  hex_code      text,                   -- nullable, e.g. '#D4AF37'
  image_url     text not null,          -- Cloudinary URL
  is_default    boolean not null default false,
  sort_order    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (product_id, variant_group, value)
);

-- 2. Index used by getVariantsForProduct(productId) / admin list / reorder
create index if not exists idx_product_variants_product_id on product_variants(product_id);

-- 3. order_items snapshot columns (docs/14 §3, lines 58-65) — nullable, so
--    existing rows are unaffected.
alter table order_items
  add column if not exists variant_id      uuid references product_variants(id) on delete set null,
  add column if not exists variant_label_en text,
  add column if not exists variant_label_ar text;

commit;
