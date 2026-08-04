-- 017: EXTENSION of the existing decrement_stock RPC for points redemption
-- Spec: docs/13-points-system.md Section 4
-- Requires: migration 016 (customers + points_transactions + balance trigger).
--
-- The original RPC (migration 013) is reproduced below VERBATIM — same
-- signature order, same declarations, same stock-decrement loop, same return
-- shape ({success: true} or `raise exception`). Two NEW optional parameters
-- are appended with defaults, and a points-redemption block is PREPENDED
-- inside the function, before any stock work:
--
--   p_customer_id      uuid    DEFAULT NULL   (null for guest)
--   p_points_to_redeem integer DEFAULT 0
--
-- New behavior, ONLY when p_points_to_redeem > 0:
--   1. Lock the customer row (SELECT ... FOR UPDATE).
--   2. Verify points_balance >= p_points_to_redeem; if not, raise
--      INSUFFICIENT_POINTS → the whole transaction (nothing stock-related has
--      run yet) rolls back — the same failure path the stock-insufficient
--      case uses, so the frontend's existing error handling applies.
--   3. Insert a 'redeem' ledger row. The 016 before-insert trigger debits
--      customers.points_balance within this transaction.
--   4. Fall through to the existing stock loop unchanged. If stock fails, the
--      redeem row rolls back together with the stock decrements.
--
-- Points debit and stock decrement therefore succeed or fail together —
-- the spec's core atomicity requirement — because both live in this one
-- function's transaction.
--
-- Guest orders (both params omitted/defaulted) take none of the new branches:
-- byte-identical behavior to the pre-points function. PostgREST applies the
-- defaults for omitted named args, so the existing JS call shape
-- rpc('decrement_stock', { order_items }) still works.
--
-- NOTE: per docs/13 §4 the discount computation (points_discount_egp) and the
-- order-row insert remain app-side (backend/db.js createOrder), because the
-- order insert has always been a separate JS step after this RPC — this
-- extension preserves that architecture rather than moving the insert into
-- the function (which would be a behavior change to the verified flow).

create or replace function public.decrement_stock(
  order_items jsonb,
  p_customer_id uuid default null,
  p_points_to_redeem integer default 0
)
returns jsonb
language plpgsql
as $function$
declare
  item record;
  current_stock integer;
  errors jsonb[] := '{}';
  v_customer_points integer;
begin
  -- ── NEW (docs/13 §4): points redemption — before any stock work, so a
  --    points failure aborts before anything is decremented, and a stock
  --    failure below rolls the redeem row back too.
  if p_points_to_redeem > 0 then
    if p_customer_id is null then
      raise exception 'INVALID_REDEMPTION: points require a customer';
    end if;

    select points_balance into v_customer_points
    from customers
    where id = p_customer_id
    for update; -- lock customer row; the 016 trigger's FOR UPDATE re-locks harmlessly

    if not found then
      raise exception 'CUSTOMER_NOT_FOUND';
    end if;

    if coalesce(v_customer_points, 0) < p_points_to_redeem then
      raise exception 'INSUFFICIENT_POINTS: balance %, requested %',
        v_customer_points, p_points_to_redeem;
    end if;

    insert into points_transactions (customer_id, type, points, balance_after, note)
    values (p_customer_id, 'redeem', -p_points_to_redeem, 0, 'Redeemed at checkout');
    -- balance_after is computed by the 016 before-insert trigger, which also
    -- debits customers.points_balance — all in this transaction.
  end if;

  -- validate and decrement in one loop  (EXISTING — preserved verbatim)
  for item in select * from jsonb_to_recordset(order_items) as x(product_id uuid, quantity integer)
  loop
    select stock_quantity into current_stock
    from products
    where id = item.product_id
    for update; -- lock row to prevent race conditions

    if not found then
      errors := array_append(errors, jsonb_build_object(
        'product_id', item.product_id,
        'error', 'PRODUCT_NOT_FOUND'
      ));
      continue;
    end if;

    if current_stock < item.quantity then
      errors := array_append(errors, jsonb_build_object(
        'product_id', item.product_id,
        'error', 'INSUFFICIENT_STOCK',
        'available', current_stock,
        'requested', item.quantity
      ));
      continue;
    end if;

    update products
    set stock_quantity = stock_quantity - item.quantity
    where id = item.product_id;
  end loop;

  if array_length(errors, 1) > 0 then
    raise exception 'STOCK_CHECK_FAILED'; -- will roll back the entire block above
  end if;

  return jsonb_build_object('success', true);
end;
$function$;
