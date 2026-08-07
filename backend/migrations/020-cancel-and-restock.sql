-- 020: Atomic cancel/return → restock + status flip + history entry.
--
-- BUG: cancelling (or returning) an order only flipped `orders.status` in the
-- app (backend/db.js updateOrderStatus). Products were decremented by the
-- decrement_stock RPC (017) at creation time, but nothing ever incremented
-- them back — a cancelled order permanently leaked its stock, so an item
-- could sit "out of stock" after a sale was never fulfilled.
--
-- This function owns the whole transition in ONE transaction:
--   1. Lock the order row.
--   2. Restock every item on non-unlimited products (mirroring the
--      decrement_stock guard that skips unlimited products at checkout).
--   3. Flip orders.status.
--   4. Insert the order_status_history entry.
--
-- Idempotent by design: if the order is already cancelled/returned it returns
-- `{ ok: true, already_cancelled: true }` and touches NOTHING. That makes a
-- retried/double-tapped transition safe (no double-restock) and lets the app
-- treat "already cancelled" as a success instead of a confusing 409.
--
-- The app still handles the points ledger (refund_reversal / manual_deduct)
-- in JS after this call, with its own ledger-row idempotency guards (doc
-- docs/13-points-system.md §3.3).

create or replace function public.cancel_order_and_restock(
  p_order_id uuid,
  p_status text,
  p_changed_by uuid,
  p_note text default null
) returns jsonb
language plpgsql
as $function$
declare
  v_current_status text;
  v_returning_order jsonb;
begin
  if p_status not in ('cancelled', 'returned') then
    return jsonb_build_object('ok', false, 'error', 'INVALID_STATUS');
  end if;

  select status into v_current_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;

  -- terminal already → no-op (idempotent: the transition already happened)
  if v_current_status in ('cancelled', 'returned') then
    return jsonb_build_object('ok', true, 'already_cancelled', true, 'status', v_current_status);
  end if;

  -- restore quantities for every non-unlimited product on the order
  update products
  set stock_quantity = stock_quantity + oi.quantity
  from order_items oi
  where oi.order_id = p_order_id
    and oi.product_id = products.id
    and products.unlimited_stock = false;

  update orders
  set status = p_status
  where id = p_order_id
  returning to_jsonb(orders.*) into v_returning_order;

  insert into order_status_history (order_id, status, changed_by, note)
  values (p_order_id, p_status, p_changed_by, p_note);

  return jsonb_build_object('ok', true, 'already_cancelled', false, 'order', v_returning_order);
end;
$function$;