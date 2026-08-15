-- 028-product-variant-images.sql
-- Extra photos per color variant (docs/14-product-variants.md §3 extension,
-- requested by the owner): a variant can carry several photos besides its
-- cover. `product_variants.image_url` remains the COVER (first) photo;
-- additional photos live here, ordered by sort_order.

create table if not exists product_variant_images (
  id          uuid primary key default gen_random_uuid(),
  variant_id  uuid not null references product_variants(id) on delete cascade,
  image_url   text not null,               -- Cloudinary URL
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_product_variant_images_variant_id
  on product_variant_images(variant_id);
