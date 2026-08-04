# 13 — Points / Loyalty System

Status: NEW — additive to the existing locked Bible. Does not modify any
already-verified backend controller, RPC function signature (only extends it),
or existing checkout flow beyond the redeem control described here.

Scope change note: the original SRS listed "loyalty" as explicitly out of
scope. This document supersedes that line item only — every other
out-of-scope item (online payments, reviews, coupons, wishlist, live chat)
still stands.

---

## 1. Goals & non-goals

Goals:
- Customers earn points on completed (delivered) orders.
- Customers can optionally create an account (phone + password) to track and
  redeem points.
- Guest checkout (no account) remains fully supported — guests never earn or
  redeem points.
- Admins can view any customer's points balance and full transaction history.
- Admins can manually grant or deduct points, primarily to cover in-store
  (offline) purchases that never go through the online order flow.
- Every points movement is auditable — no balance is ever hand-edited; it is
  always the sum of a ledger.

Non-goals (explicitly not building):
- Tiered membership levels / VIP status
- Points expiration (can be added later without schema changes, since the
  ledger already timestamps every entry)
- Referral points
- Points on top of manual admin order edits beyond the in-store grant flow
  described here

---

## 2. Data model

### 2.1 New table: `customers`

| column | type | notes |
|---|---|---|
| id | uuid, PK, default gen_random_uuid() | |
| name | text, not null | |
| phone | text, not null, UNIQUE | login identifier, same normalization rules as existing order phone fields |
| email | text, nullable | |
| password_hash | text, nullable | null for customers created via in-store admin grant who never registered online |
| points_balance | integer, not null, default 0 | denormalized cache — always must equal SUM(points) from points_transactions for this customer; recomputed by trigger, never written directly by application code |
| created_at | timestamptz, not null, default now() | |
| updated_at | timestamptz, not null, default now() | |

Index: unique index on `phone`.

`password_hash` being nullable matters: the in-store flow (Section 6) can
create a customer record with no password. That customer can later "claim"
their account online via a "register with this phone number" flow that
detects the existing phone, verifies it's them (see Section 7 open item), and
sets a password — at that point their existing balance is already theirs,
nothing to migrate.

### 2.2 New table: `points_transactions`

Append-only ledger. No UPDATE or DELETE from application code, ever.

| column | type | notes |
|---|---|---|
| id | uuid, PK, default gen_random_uuid() | |
| customer_id | uuid, not null, FK -> customers.id | |
| order_id | uuid, nullable, FK -> orders.id | null for manual grants/deducts |
| type | text, not null | one of: earn, redeem, refund_reversal, manual_grant, manual_deduct |
| points | integer, not null | signed: positive for earn/refund_reversal/manual_grant, negative for redeem/manual_deduct |
| balance_after | integer, not null | snapshot of customer's balance immediately after this entry — makes history display trivial and gives a self-consistency check |
| note | text, nullable | required (enforced at API layer, not DB) for manual_grant/manual_deduct — e.g. "In-store purchase — EGP 250" |
| created_by_admin_id | uuid, nullable, FK -> admins.id | set only for manual_grant/manual_deduct |
| created_at | timestamptz, not null, default now() | |

Indexes: `(customer_id, created_at desc)` for history queries.

DB trigger: after insert on `points_transactions`, update
`customers.points_balance` by `+= NEW.points` in the same transaction. This
is what keeps the cache honest — application code never touches
`points_balance` directly.

### 2.3 Modify: `orders`

Additive columns only, all nullable, zero impact on existing rows or the
existing verified order flow:

| column | type | notes |
|---|---|---|
| customer_id | uuid, nullable, FK -> customers.id | null for guest orders |
| points_earned | integer, not null, default 0 | set when status transitions to delivered |
| points_redeemed | integer, not null, default 0 | set at order creation if customer redeemed points |
| points_discount_egp | numeric, not null, default 0 | = points_redeemed at current 1:1 rate; stored so historical orders remain correct even if the rate changes later |

### 2.4 Modify: `settings`

Add two rows (or a `points_config` JSON blob, match whatever pattern
`settings` already uses). These two rates are independent of each other and
both admin-editable — earning and redemption are not required to mirror one
another:
- `points_earn_rate` — points earned per 1 EGP spent. Default: `1`
  (100 EGP order = 100 points, as specified by the client).
- `points_redeem_rate` — EGP value per 1 point redeemed. Default: `0.1`
  (100 points = 10 EGP, per the client's example). This is the "how
  generous is a point when cashed in" lever — separate from how fast points
  are earned.

Both are configurable from the admin Settings screen — hardcoding either in
application code turns any future "run a 2x points promo" or "points are
worth more this month" request into a deploy instead of a toggle.

---

## 3. Points lifecycle rules

These are the business rules that must be implemented exactly as described —
they are the parts most likely to have edge-case bugs if implemented loosely.

### 3.1 Earning

- Points are credited **only when an order's status transitions to
  `delivered`**, not at order placement.
- Why: crediting at placement would let a customer place an order, earn
  points, redeem those points on a second order, then cancel the first —
  free points. Tying earn to delivered closes this.
- Calculation: `points_earned = floor(order_total_egp * points_earn_rate)`.
  Use the order's total *after* any points discount was applied — i.e.
  points are earned on what was actually paid/owed, not the pre-discount
  subtotal.
- This hook lives in the existing order-status-update controller, as an
  additional branch on the status transition, not a new endpoint.
- Idempotency requirement: if an order's status is set to `delivered` more
  than once (e.g. admin double-click, retry), do not double-credit. Guard by
  checking `orders.points_earned = 0` before crediting, and set it
  atomically in the same statement that inserts the ledger row.

### 3.2 Redeeming (at checkout)

- Only available to logged-in customers.
- Customer chooses how many points to redeem, up to their full balance —
  no cap, per client requirement. A fully-points order (0 EGP due) is valid;
  since this is a COD store, nothing is collected on delivery in that case.
- Redemption happens inside the **same atomic RPC** that currently handles
  order creation + stock decrement (see Section 4). Points debit and stock
  decrement succeed or fail together — never one without the other.
- `orders.points_redeemed` and `orders.points_discount_egp` are set at
  creation time; a `redeem` (negative) ledger entry is inserted in the same
  transaction.

### 3.3 Reversal (on cancellation)

- If an order with `points_redeemed > 0` is cancelled (or moved to any
  terminal "not fulfilled" status your existing order state machine defines),
  a `refund_reversal` (positive) ledger entry is inserted crediting those
  points back.
- If an order with `points_earned > 0` (i.e. it was already delivered, then
  later somehow reverted/cancelled — check whether your existing state
  machine even allows this transition; if not, this branch is unreachable
  and can be a no-op) — deduct the earned points back via a
  `manual_deduct`-style reversal. Flag to me if delivered orders can be
  un-delivered in your current flow; if they can't, skip this case.

### 3.4 Manual grant / deduct (in-store purchases & corrections)

Covered in full in Section 6.

---

## 4. Backend — RPC / atomic order creation

The existing atomic order-creation function (stock decrement + order insert)
gets extended, not replaced:

New optional parameters:
- `p_customer_id uuid` (null for guest)
- `p_points_to_redeem integer` (default 0)

New logic inside the existing transaction, before commit:
1. If `p_points_to_redeem > 0`: lock the customer row (`SELECT ... FOR
   UPDATE`), verify `points_balance >= p_points_to_redeem`. If not, raise an
   exception and roll back the whole order — same failure path the existing
   stock-insufficient case already uses, so the frontend error handling
   pattern is identical.
2. Compute `points_discount_egp = p_points_to_redeem * points_redeem_rate`.
3. Apply the discount to the order total before inserting the order row.
4. Insert the order row with `customer_id`, `points_redeemed`,
   `points_discount_egp` set.
5. Insert a `redeem` row into `points_transactions` (this fires the balance
   trigger from Section 2.2).
6. Proceed with the existing stock-decrement logic unchanged.

---

## 5. Backend — new API endpoints

### 5.1 Customer auth (separate from admin auth)

Separate JWT and separate httpOnly cookie name from the admin token (e.g.
`customer_token` vs the existing `admin_token`). Separate middleware file
(`customerAuth.js`), not merged into the existing `auth.js`. Do not let a
customer token pass admin middleware or vice versa.

- `POST /api/customers/register` — body: name, phone, password. If a
  `customers` row already exists for that phone with `password_hash IS
  NULL` (created via in-store grant), this endpoint sets the password on
  that existing row instead of erroring — see the "claim" note in 2.1.
- `POST /api/customers/login` — body: phone, password. Sets httpOnly cookie.
- `POST /api/customers/logout`
- `GET /api/customers/me` — returns customer profile + current
  points_balance. Requires customer auth.
- `GET /api/customers/me/points-history` — paginated list from
  points_transactions for the logged-in customer. Requires customer auth.

### 5.2 Points (customer-facing)

- Redemption itself is not a separate endpoint — it's a parameter passed
  into the existing order-creation endpoint, which forwards it to the RPC
  from Section 4.

### 5.3 Admin

- `GET /api/admin/customers` — list, searchable by phone/name, shows
  points_balance per customer. Requires admin auth.
- `GET /api/admin/customers/:id/points-history` — full ledger for one
  customer. Requires admin auth.
- `POST /api/admin/customers/:id/points-adjust` — body: `direction`
  (grant/deduct), `egp_amount` (for grant — see Section 6), OR `points`
  (for deduct/correction), `note` (required). Requires admin auth. Inserts
  the appropriate ledger row with `created_by_admin_id` set to the acting
  admin.
- `POST /api/admin/customers` — create a customer with just name + phone,
  no password (the in-store "customer not found" path — Section 6).
- `PUT /api/admin/settings/points` — update `points_earn_rate` /
  `points_redeem_rate`.

---

## 6. Admin panel — in-store purchase flow

This is the flow for a physical-store sale that never touches the online
order system.

1. Admin opens "Add Points" (or similar) from the Customers section.
2. Admin searches by phone number.
   - **Found**: existing customer selected, current balance shown for
     context.
   - **Not found**: inline "create customer" form — name + phone only, no
     password required. Created via `POST /api/admin/customers`.
3. Admin enters the **EGP amount spent in-store** — not raw points. This is
   deliberate: the conversion always goes through `points_earn_rate`, so
   in-store and online purchases are always calculated the same way and a
   future rate change doesn't require admins to remember new math.
4. System computes `points = floor(egp_amount * points_earn_rate)`, shows a
   confirmation ("Grant 250 points for EGP 250 in-store purchase?"), then on
   confirm calls `POST /api/admin/customers/:id/points-adjust` with
   `direction: grant`, `egp_amount`, and an auto-filled note ("In-store
   purchase — EGP 250") which the admin can edit before submitting.
5. Same screen exposes a `deduct` mode for corrections — admin enters raw
   points to remove and a required note (e.g. "Correction — duplicate
   entry").

This flow does not create an `orders` row — in-store sales are not part of
the orders table. `points_transactions.order_id` is null for these, exactly
as modeled in Section 2.2.

---

## 7. Frontend

### 7.1 New context: `CustomerAuthContext`

Mirrors the existing `AuthContext` pattern used for admin auth, but fully
separate — separate storage key, separate provider, no shared state with
admin auth.

### 7.2 New pages

- `Login.jsx` — phone + password
- `Register.jsx` — name, phone, password
- `Account.jsx` — points balance, transaction history (paginated), basic
  profile info

### 7.3 Navbar

- Login/Account entry point alongside existing cart/theme/language controls
- Points balance badge shown when logged in

### 7.4 Checkout integration

- If a customer is logged in, show their current points balance and a
  redeem control (slider or numeric input, clamped to their balance) above
  the order summary.
- Order total recalculates live as redeemed points change.
- On submit, `points_to_redeem` is passed through to the existing
  order-creation call, which now accepts it per Section 4.
- Guest checkout UI is entirely unchanged — no redeem control shown.

### 7.5 Admin panel additions

- Customers list view (new) — searchable, shows points_balance column
- Customer detail — full points_transactions history
- "Add Points" flow per Section 6, including inline customer creation
- Settings screen gets two new fields: points earn rate, points redeem rate

---

## 8. Open items to confirm before/while opencode implements

Flagging these rather than deciding silently, since each one has a real
behavioral consequence:

1. **Minimum order value or minimum redemption amount** — not specified yet.
   Current spec allows redeeming any number of points, including a 1-point
   redemption. Confirm if that's fine or if you want a floor (e.g. must
   redeem at least 50 points at a time).
2. **Un-delivering a delivered order** — Section 3.3 flags that if your
   existing order state machine doesn't allow reverting a `delivered` order,
   the earned-points-reversal branch is unreachable and can be simplified
   out. Needs a quick check against the existing order status transitions
   before opencode builds it.
3. **Claiming an in-store-created account online** — Section 2.1/5.1
   describes a customer registering with a phone number that already has a
   points balance from an in-store grant. As specified, anyone who knows
   that phone number can register and claim the balance — there's no OTP
   step in this version. Worth a deliberate yes/no given points have real
   monetary value, same category of concern as the original phone-identity
   question.
