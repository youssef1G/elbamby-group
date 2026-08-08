-- Account deletion (customer self-delete + admin remove-customer):
-- a customers row may be fully deleted when the account owner asks for it.
--   orders.customer_id            -> ON DELETE SET NULL (already the case; orders keep name/phone snapshot)
--   points_transactions.customer_id -> was ON DELETE RESTRICT, blocking deletion;
--                                     relaxed to CASCADE so the whole ledger (append-only per
--                                     docs/13 §2.2, but the account as a whole is removed) goes
--                                     with the customer row.

alter table points_transactions
  drop constraint if exists points_transactions_customer_id_fkey,
  add constraint points_transactions_customer_id_fkey
    foreign key (customer_id) references customers(id) on delete cascade;