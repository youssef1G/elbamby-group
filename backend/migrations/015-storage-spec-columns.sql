-- 015: storage spec columns on products (capacity_gb, speed_class, interface_type, form_factor)
-- Spec per docs/04-database-schema.md lines 76-79 — required by backend server.js product schema
-- and the admin ProductForm "Storage product" section. Without these columns, admin product
-- create/update fails with PGRST204 (column not in schema cache).

alter table products
  add column if not exists capacity_gb integer;

alter table products
  add column if not exists speed_class text;

alter table products
  add column if not exists interface_type text;

alter table products
  add column if not exists form_factor text;
