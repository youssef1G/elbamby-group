-- 022: Drop orders.governorate.
--
-- The governorate field was removed from checkout (user request). It was
-- `text, not null` with no default, so an order insert no longer supplies a
-- value would fail the NOT NULL constraint. The column has no business
-- meaning left (nothing reads it), so drop it rather than relaxing to
-- nullable.
--
-- This drops the stored governorate value for existing orders. If that
-- historical data must be kept, skip this migration and make the column
-- nullable instead.

alter table orders drop column if exists governorate;