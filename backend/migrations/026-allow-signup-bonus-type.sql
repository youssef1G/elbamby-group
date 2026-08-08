-- Signup bonus (docs/13 §5.1, migration 024): allow the welcome-bonus
-- ledger type. The original CHECK only allowed the five order/admin types,
-- so createCustomer insert of a 'signup_bonus' row was silently rejected.

alter table points_transactions
  drop constraint if exists points_transactions_type_check,
  add constraint points_transactions_type_check
    check (type in ('earn','redeem','refund_reversal','manual_grant','manual_deduct','signup_bonus'));