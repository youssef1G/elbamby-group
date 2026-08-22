-- Password reset codes (customer forgot-password flow):
-- a 6-digit code is emailed to the customer's address on file; they submit it
-- alongside a new password to rotate password_hash. Codes are stored HASHED
-- (bcrypt) — never plaintext — expire after 10 minutes, allow max 5 verify
-- attempts, and are single-use (consumed_at set on success). Requesting a new
-- code invalidates all previous unconsumed ones.
--
-- The table only ever holds short-lived secrets; old consumed/expired rows are
-- pruned opportunistically by the server on each forgot-password request.

create table if not exists password_reset_codes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_codes_customer_created_idx
  on password_reset_codes (customer_id, created_at desc);
