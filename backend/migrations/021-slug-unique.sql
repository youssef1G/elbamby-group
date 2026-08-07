-- 021: Enforce unique product + category slugs.
--
-- BUG: docs/04-database-schema.md defines `slug` as `unique, not null`, but
-- the database only ever got a plain (non-unique) btree index. Two products
-- can therefore share a slug. The storefront resolves the detail page with
-- PostgREST `.single()`; on duplicate rows that returns a 406 and the page
-- renders as "not found", so the second copy becomes un-purchasable. The
-- admin "slug uniqueness checked server-side" claim (docs/05) was also never
-- enforced at the database layer, only in the app (which a race or a direct
-- insert can bypass).
--
-- Safe on existing data and re-runnable:
--   1. Backfill empty/NULL slugs from the row id (guaranteed unique, never a
--      real URL, and cannot collide with the generated `name-en` slugs).
--   2. De-duplicate real slugs: keep the earliest row (`created_at`, then
--      `id`), suffix later copies with `-2`, `-3`, … — matching the naming
--      scheme the app uses when it auto-generates from `name_en`.
--   3. Drop the legacy btree index and create a UNIQUE index, then enforce
--      NOT NULL.
--
-- The whole migration runs in one transaction: if any step fails (e.g. an
-- unsalvageable collision), everything rolls back and the operator decides.

begin;

-- 1. backfill missing slugs from the row id
update products
set slug = 'product-' || replace(id::text, '-', '')
where slug is null or trim(slug) = '';

update categories
set slug = 'category-' || replace(id::text, '-', '')
where slug is null or trim(slug) = '';

-- 2. de-duplicate existing slugs (keep the earliest row, suffix the rest)
update products p
set slug = p.slug || '-' || d.rn
from (
  select id, row_number() over (partition by slug order by created_at, id) as rn
  from products
) d
where p.id = d.id
  and d.rn > 1;

update categories c
set slug = c.slug || '-' || d.rn
from (
  select id, row_number() over (partition by slug order by created_at, id) as rn
  from categories
) d
where c.id = d.id
  and d.rn > 1;

-- 3. swap the legacy non-unique index for a UNIQUE one
drop index if exists idx_products_slug;
drop index if exists idx_categories_slug;
create unique index if not exists idx_products_slug_unique on products (slug);
create unique index if not exists idx_categories_slug_unique on categories (slug);

-- 4. slug is NOT NULL (matches the schema doc)
alter table products alter column slug set not null;
alter table categories alter column slug set not null;

commit;