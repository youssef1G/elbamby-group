# 14 — Feature Roadmap (next features)

This doc holds the **features worth adding** that have been tabled for BG. The goal of this page is to decide *what*, *why*, *where*, and *how free* honestly — before any code is written. It complements `REVIEW.md` (bug/cleanup tracker); this is the **build-new-things** list.

Every feature here must still obey the bible: tokens only (`01-brand-design-system.md`), bilingual + RTL from day one (`08-i18n-rtl.md`), no new libraries without approval (`02-tech-stack.md`), server-side validation always (`11-nonfunctional-requirements.md`), consistent naming (`10-coding-conventions.md`).

Nothing on this page is implemented yet unless a row says **status: built**.

> **2026-08-07 — status update:** the **analytics CSV export** and **Row 5 (Share/SEO)** are **built**; **Row 2 (Reorder)** is **built** (see §3). All other rows remain unbuilt.

---

## 1. Priority summary

Ranked by impact for a **COD, storage-media, bilingual Egyptian storefront**:

| Rank | Feature | Why it matters | New DB | New lib | Cost (recurring) |
|---|---|---|---|---|---|
| 1 | WhatsApp order updates (free channel) | Answers "where is my order?" in the channel every Egyptian customer already has | no | no | $0 |
| 2 | Repeat-order / "Order again" | Repeat buyers are the highest-margin; removes re-entry friction for phone-customers. | no | no | $0 | **built** |
| 3 | Out-of-stock → phone notification ("Back in stock") | Captures demand that currently bounces off an OOS page. They're not logged in, so capture via phone. | **yes** (1 table) | no | $0 (WhatsApp click-to-chat) |
| 4 | PDP spec-comparison table | Reinforces the storage-first identity (capacity / speed / interface). | no | no | $0 |
| 5 | Share / richer share previews (OG + product SEO) | WhatsApp shares and Google ranking for individual products. | no | no | $0 | **built** |
| 6 | Homepage "Track order" + nav entry | Cuts support tickets; surfaces the existing lookup tool. | no | no | $0 |
| 7 | Admin efficiency: duplicate product, bulk stock edit, "inquire order" (WhatsApp) | Saves hours of manual product entry. | no | no | $0 |
| 8 | Error boundaries + retry states | Stops silently-swallowed fetch failures (REVIEW "Quality" row). | no | no | $0 |

## 2. WhatsApp order notifications — the flagship

**Requirement (from the user): the messages must be 100% free.**

### 2.1 What "free" means for WhatsApp — the honest constraint

There is **no fully-automated outbound WhatsApp sender that is 100% free**:

- **Meta (official) WhatsApp Business Cloud API** — the only supported API for
  production. Sent from the business's number. Fees apply: customer-initiated
  "service conversations" are free for 24h, but **business-initiated templates
  are per-conversation, per-message billing** (Egypt is a paid market).
  Not usable under a "100% free" rule.
- **WhatsApp Web / unofficial JS automation** (Baileys, whatsapp-web.js, old
  `text(wa.me)` — free, but violates WhatsApp ToS, needs a personal number that
  is often number-banned, breaks without notice, and cannot go in a Vercel
  serverless function reliably. **Rejected: not production-safe.**
- **SMS/other WhatsApp aggregators** (Twilio, etc.) — paid per message.

### 2.2 The 100%-free design (click-to-chat)

Everything below uses **click-to-chat links (`https://wa.me/<number>?text=...`)**
— the customer (or admin) taps a link that **opens WhatsApp pre-filled**; the
customer taps send. Free, no API, no approvals, no templates, works in Egypt,
no new dependency.

Concretely:
1. **Order success / MyOrders list** — each order gets a
   `Check status on WhatsApp` link pre-filled with
   `بوابة» طلبي رقم <orderNo> — ما أحدث حالة؟` (bilingual by UI locale).
   One tap, customer sends, shop WhatsApp receives the ticket. No server code
   needed to actually *send* — only to render the link (already the pattern on
   the PDP: `ProductDetail.jsx:121`).
2. **Out-of-stock → "Back in stock"** — the OOS card asks for a phone number
   (no login). When stock returns (admin saves stock), anyone who joined
   gets a **pre-filled click-to-chat** message the same way. Marking:
   needs a small `restock_requests(phone, product_id, created_at)` table +
   admin handling — add only after the user approves the table (rule 0/2).
3. **Admin order detail** — a one-click "Copy order WhatsApp message" button
   (prefilled text with order contents) so the shop can paste-and-send from
   the WhatsApp Business app. Still $0, still one copy-paste away from a real
   SMS.

> **If the user later wants fully-automated outbound** (no manual tap), the
> only legitimate path is the paid Meta Cloud API, which breaks the "free"
> requirement — that becomes a **new explicit instruction**, not something
> built silently.

**i18n/RTL note:** every pre-filled message renders in the UI locale (Arabic
default, English secondary) via the existing flat `i18n` dicts.

## 3. Repeat order / "Order again" — **BUILT**

- From MyOrders (per order): a **Reorder with everything** button that re-inserts the same items into `CartContext` (stock-safe, unlimited-stock aware — same guards as `Cart.jsx`).
- No new route — reuses live product data via the existing `/products` list (each snapshot's `product_id` is now exposed to the customer lookup so Reorder can resolve **live** price/stock; out-of-stock/missing products are skipped with a toast).
- New: `CartContext.reorderItems(items)` (batched merge, dedupes by product id, opens drawer) + `OrderCard` "Reorder" button + i18n `common.myOrders.reorder*`.
- Edge: if items changed/disappeared, they're skipped rather than re-added.

## 4. PDP spec comparison

- On `ProductDetail.jsx`, a compact comparison band (capacity · type/interface · read/write speed · warranty) directly under the buy box, sourced from the existing `spec*` columns (migration 015) — markup-only, tokens only, RTL-neutral (columns flip with row direction).

## 5. Share + richer link previews — **BUILT**

- **Share button on PDP**: WhatsApp (`wa.me` prefilled `shareText`+name+URL) + **copy-link** (clipboard, "Link copied" state).
- Products get **`schema.org/Product` JSON-LD** (name, image, price, EGP, availability, url) + **`og:image`** + canonical/`og:url`. `Home` gets **`Organization` JSON-LD**.
- `SEO.jsx` now injects `og:title/og:description/og:image/og:url` + `link[rel=canonical]`.
- `public/robots.txt` (allow storefront, disallow `/admin`, sitemap ref) + `public/sitemap.xml` **generated by `backend/scripts/generate-sitemap.js`** (static pages + live active categories/products; re-run to refresh).

## 6. Homepage / nav track-order shortcut

- Wrap the existing MyOrders lookup in a **"Track order" nav action** (+ a hero link) so customers don't go hunting — the only is low-risk routing, both UI links point at an existing route.

## 7. Admin efficiency (fast wins)

- Duplicate-product action (clone including images, new slug).
- Bulk stock edit across filtered products.
- "Chat about this order" → opens order-ready WhatsApp to the customer's phone.
- These touch `07-admin-panel-spec.md` screens only; no API/DB changes.

## 8. Error resilience

- Per-page **ErrorBoundary** + retry action for the "silently-swallowed"
  fetches listed in `REVIEW.md` ("Quality" row); `Skeleton` already exists for loading.

---

## ✅ Out of scope (explicitly not building unless requested)

The original scope list in `00-index.md` still rules:

- Online payments (COD only) · customer login accounts (points 📱 only) · wishlist · product reviews · promo coupons · loyalty/VIP tiers · live chat widget.

## 9. Decision log

| Date | Decision | Note |
|---|---|---|
| 2026-08-07 | WhatsApp channel = click-to-chat (wa.me prefilled), 100% free | Automated outbound = paid Meta API = separate later decision |

## 10. Where each feature will land

| Feature | Backend | Frontend | Doc to extend | Status |
|---|---|---|---|
| WhatsApp status link (`fulfilled` flow only) | backend already exposed | `MyOrders.jsx`, `CheckoutSuccess.jsx`, `OrderCard` | `05` |
| Restock-notify (needs table) | new table + routes | PDP OOS card, admin badge | `04`, `05`, `07` |
| Reorder | none (custom snapshot id exposed) | `CartContext` + OrderCard button | `06` | **BUILT** |
| Spec comparison | none | `ProductDetail.jsx` | `01`, `06` | — |
| Share/SEO | robots/sitemap static (+ script) | PDP meta + OG + share | `11` | **BUILT** |
| Track-order entry points | none | Navbar/Footer/Home | `06` |
| Admin dup/bulk/inquire | none | admin product/orders screens | `07` |
| ErrorBoundary | none | App route boundaries | `09`, `11` |