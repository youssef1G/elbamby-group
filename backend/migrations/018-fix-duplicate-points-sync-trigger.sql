-- 018: Fix duplicated points balance-sync trigger + reconcile balances
-- Spec: docs/13-points-system.md
--
-- CAUSE (verified live, 2026-08-03): two triggers on points_transactions both
-- fire per insert, so every balance movement applies twice. A single +7
-- insert moved the balance by +14 and stored balance_after = 14. Likely
-- origin: an earlier version of migration 016 created the trigger under a
-- different name; re-applying a revised 016 added the current one without
-- dropping the old one.
--
-- FIX: drop EVERY non-internal trigger on points_transactions (the sync
-- trigger is the only legitimate one — FK/constraint triggers are internal
-- and untouched), recreate exactly one, then recompute every stored
-- balance_after and every customer's points_balance from the ledger's sum of
-- points (the double trigger inflated both).
--
-- Apply in the Supabase SQL editor. Safe to run even when no duplicate exists.

-- 1. Drop ALL user triggers on points_transactions (any name, any function)
do $$
declare t record;
begin
  for t in
    select tgname
    from pg_trigger
    where tgrelid = 'points_transactions'::regclass
      and not tgisinternal
  loop
    execute format('drop trigger if exists %I on points_transactions', t.tgname);
    raise notice 'dropped points trigger: %', t.tgname;
  end loop;
end $$;

-- 2. Recreate exactly one
drop trigger if exists trg_points_transactions_balance_sync on points_transactions;
create trigger trg_points_transactions_balance_sync
  before insert on points_transactions
  for each row execute function points_transactions_balance_sync();

-- 3. Recompute every stored balance_after as the true running sum per customer
update points_transactions pt
set balance_after = r.cum
from (
  select id,
         sum(points) over (partition by customer_id order by created_at, id) as cum
  from points_transactions
) r
where r.id = pt.id;

-- 4. Reconcile customer balances with the (now honest) ledger
update customers c
set points_balance = coalesce((
  select sum(points) from points_transactions pt where pt.customer_id = c.id
), 0);
