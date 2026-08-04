-- 014: estimated_delivery on orders + unlimited_stock on products
-- Feature parity with tictoc-xpoint admin (est-delivery date per order, unlimited-stock products).
-- Decrement of stock for unlimited products is skipped app-side (backend/db.js createOrder).

alter table orders
  add column if not exists estimated_delivery date;

alter table products
  add column if not exists unlimited_stock boolean not null default false;

create index if not exists idx_products_unlimited_stock on products (unlimited_stock)
  where unlimited_stock = true;
