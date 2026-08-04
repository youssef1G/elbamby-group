-- 016: Points / loyalty system (Stage A — schema)
-- Spec: docs/13-points-system.md
--
-- Additive only. Does not modify any existing column, constraint, or the
-- existing stock-decrement logic. Adds:
--   1. customers table
--   2. points_transactions append-only ledger + FKs + index
--   3. trigger keeping customers.points_balance in sync with the ledger
--   4. additive columns on orders  (customer_id, points_earned, points_redeemed, points_discount_egp)
--   5. additive columns on settings (points_earn_rate default 1, points_redeem_rate default 0.1)
--
-- The decrement_stock RPC extension (docs/13 §4) lives in migration 017 —
-- it must be applied after this one (it depends on customers +
-- points_transactions + this trigger).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. customers
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text not null,
  email        text,
  password_hash text,
  points_balance integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Unique index on phone = login identifier. matches the spec's "same normalization
-- rules as existing order phone fields": Egyptian 01xxxxxxxxx is stored verbatim,
-- comparison is exact text. (Existing orders.phone column has no normalization
-- function either, so this is consistent.)
create unique index if not exists idx_customers_phone on customers (phone);

-- updated_at trigger (same set_updated_at() pattern every other table uses,
-- per docs/04-database-schema.md "All tables get a `updated_at` trigger").
drop trigger if exists trg_customers_updated_at on customers;
create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. points_transactions (append-only ledger)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists points_transactions (
  id                  uuid primary key default gen_random_uuid(),
  customer_id         uuid not null references customers(id) on delete restrict,
  order_id            uuid references orders(id) on delete restrict,
  type                text not null check (type in ('earn','redeem','refund_reversal','manual_grant','manual_deduct')),
  points              integer not null,
  balance_after       integer not null,
  note                text,
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- History queries: paginate a customer's ledger newest-first.
create index if not exists idx_points_tx_customer_created
  on points_transactions (customer_id, created_at desc);

-- Admin "show me all movements for a given order" lookups.
create index if not exists idx_points_tx_order
  on points_transactions (order_id)
  where order_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger: keep customers.points_balance in sync with the ledger
--
-- Spec 2.2: "after insert on points_transactions, update
-- customers.points_balance by += NEW.points in the same transaction".
-- balance_after (per-row snapshot) is computed here as
--   current points_balance + NEW.points
-- which is correct because:
--   - the trigger runs FOR EACH ROW in INSERT order
--   - the only path that ever inserts two ledger rows "at the same logical
--     instant" is the in-store grant / order redemption, which are serialized
--     by the FOR UPDATE lock in the RPC, so no concurrent +N / -N race on the
--     same customer row.
-- Application code NEVER writes points_balance directly.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function points_transactions_balance_sync()
returns trigger as $$
declare
  v_current integer;
  v_next   integer;
begin
  -- Lock the row so two concurrent ledger inserts on the same customer
  -- serialize (one applies, then the other reads the post-apply balance).
  select points_balance into v_current
    from customers
    where id = new.customer_id
    for update;

  v_next := coalesce(v_current, 0) + new.points;

  update customers
    set points_balance = v_next
    where id = new.customer_id;

  new.balance_after := v_next;
  return new;
end;
$$ language plpgsql;

-- The ABOVE function fills balance_after BEFORE the row is inserted.
-- Use a BEFORE INSERT trigger so NEW.balance_after is populated for the
-- INSERT itself (the row's stored balance_after must equal what we computed).
drop trigger if exists trg_points_transactions_balance_sync on points_transactions;
create trigger trg_points_transactions_balance_sync
  before insert on points_transactions
  for each row execute function points_transactions_balance_sync();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Additive columns on orders (all nullable / default-0 → no impact on
--    existing rows or the existing verified order flow)
-- ─────────────────────────────────────────────────────────────────────────────

alter table orders
  add column if not exists customer_id        uuid references customers(id) on delete set null;

alter table orders
  add column if not exists points_earned      integer not null default 0;

alter table orders
  add column if not exists points_redeemed    integer not null default 0;

alter table orders
  add column if not exists points_discount_egp numeric(10,2) not null default 0;

create index if not exists idx_orders_customer on orders (customer_id)
  where customer_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Settings: two new columns (settings is a single-row table, per
--    docs/04-database-schema.md — not a key/value or JSON blob).
-- ─────────────────────────────────────────────────────────────────────────────

alter table settings
  add column if not exists points_earn_rate  numeric(10,4) not null default 1;

alter table settings
  add column if not exists points_redeem_rate numeric(10,4) not null default 0.1;

-- Backfill defaults onto the existing single row if it already exists.
update settings
  set points_earn_rate   = coalesce(points_earn_rate, 1),
      points_redeem_rate = coalesce(points_redeem_rate, 0.1)
  where id = 1;

