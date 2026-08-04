# 06 — Pages Functional Spec (Customer-Facing)

For every page: purpose, data needed, states to handle (loading/empty/error), and key behaviors. The agent should not invent behavior beyond what's listed — if something's ambiguous, it defaults to the simplest interpretation consistent with `01-brand-design-system.md`.

**Design direction (v2):** Technical-precise, hardware-influenced. Think Crucial, Samsung SSD product pages, Western Digital spec sheets. Generous whitespace, restrained color, monospaced accents for capacity/speed/interface data. The brand magenta is an accent never a dominant surface.

## Global (applies to every page)

- Loading state → skeleton matching final layout (never a spinner for content areas; spinners only for button-level actions).
- Error state → `EmptyState` component with a retry action, localized message.
- Empty state (e.g. no products match filter) → `EmptyState` with an illustration/icon, localized message, and a clear next action (e.g. "Clear filters").
- Every page sets document title + meta description via `SEO.jsx`, localized to current language.
- Every page must render correctly with 0 network requests completed yet (no layout shift once data arrives — skeletons reserve the real space).
- The copy and visual tone of the homepage and category headers should reinforce the store's specialization in **storage media and flash memory**. The Arabic sub-name "بيت الميموري" should appear prominently on the homepage.

## Home (`Home.jsx`)

- **Data:** hero banners (`position=home_hero`), featured products (`is_featured=true`, limit 8), new arrivals (`is_new_arrival=true`, limit 8), active categories.
- **Sections (in order):**
  1. **Hero section** — gradient background with brand title, sub-name "بيت الميموري" (Arabic copy), tagline in English/Arabic, brief description of the store's focus (storage media / flash drives), and a solid CTA button. If banners exist in the DB, the hero switches to a banner carousel (auto-rotate 6s, swipeable, RTL-aware).
  2. **Category icon-strip** — a compact horizontal row of category chips (name only, no images). Calls out the store's core categories: flash drives, memory cards, SSDs, card readers, phone accessories.
  3. **Featured products** — 8-product grid with "View All → Shop" link. Product cards follow the v2 design (see ProductCard spec below). Section header should use restrained hierarchy — smaller title text, lighter weight.
  4. **Trust strip** — three items: COD payment, fast delivery, premium quality. Compact, horizontal. Dark bar at very bottom before footer. Uses lucide icons, not text.
- Scroll-reveal (`fadeUp`, margin `-80px`) on each section as it enters viewport. Each category chip fades in individually (stagger).
- **Hero fallback (no banners):** a large section with the brand-name, the tagline "بيت الميموري / House of Memory", a brief description, and a CTA button. The fallback hero must look intentional, not like placeholder copy.

## ProductCard v2 (shared component, used on Home, Shop, Product Detail, QuickView, and Cart related-products)

- **Card body:** no default shadow, only border. Hover adds subtle shadow + lift. No "sale badge" overlay — stock status and discount go below the image, not over it. Badges use the standard Badge component (pill, semantic colors).
- **Image:** 1:1 aspect-ratio with `object-cover`. Lazy loading. No hover zoom-in; the card as a whole lifts.
- **Technical spec row:** Below the product name, if the product has spec data (`capacity_gb`, `speed_class`, `interface_type`, or `form_factor`), show a row of tiny monospaced chips in a muted ink-on-paper style. Each chip is a `.font-mono` text-xs chip with a rounded-full border and subtle padding. Example layout:
  ```
  [USB 3.2 Gen 1] [64GB] [U3 V30]
  ```
  This is the key differentiator from a "phone accessories" card — storage products tell you their specs at a glance.
- **Price + Add to Cart:** The price row includes the compare-at strikethrough price and the current price in bold. The "Add to Cart" button is a discreet icon button aligned on the right side, not blocking product information.
- **Quick View:** quick-view icon appears on hover (desktop) or always-visible (mobile), placed as a floating eye icon. Clicking it opens the `QuickViewModal`.

## Shop (`Shop.jsx`)

- **Data:** paginated products, filtered by category/search/sort via URL query params (so filters are shareable/bookmarkable and survive refresh).
- **Controls:** category filter (sidebar desktop / bottom sheet mobile), sort dropdown (`newest`, `price_asc`, `price_desc`, `featured`), search input (debounced 400ms), active filter chips with individual clear + "clear all."
- **Grid:** `ProductGrid` (2/3/4 columns responsive), skeleton grid while loading, `EmptyState` if zero results.
- **Pagination:** infinite scroll (load more on intersection) preferred over numbered pagination, per premium-minimal direction — but must have a manual "Load more" fallback button for accessibility/no-JS-scroll-detection edge cases.
- Quick View: clicking a quick-view icon on `ProductCard` opens `QuickViewModal` without navigating away (images, price, stock, quantity selector, add to cart, "View full details" link).

## Product Detail (`ProductDetail.jsx`)

- **Data:** single product by slug, related products (same category, excluding self, limit 4).
- **Gallery:** `ProductGallery` — multiple images, thumbnail strip, swipeable on mobile, zoom-on-hover on desktop (optional nice-to-have, not blocking).
- **Info panel:** name, price (+ strikethrough `compare_at_price` if present, with a "X% off" badge), stock badge (`In Stock` / `Low Stock` / `Out of Stock`), category link, description (bilingual, current-language only), quantity selector (min 1, max = `stock_quantity`, disabled entirely if out of stock), Add to Cart (adds + opens `CartDrawer`), WhatsApp "Ask about this product" quick link pre-filled with product name.
- **Behavior:** view increments `view_count` (fire-and-forget, non-blocking). If product `is_active=false` or not found → 404 page, not a broken detail page.
- Related products section below the fold, scroll-reveal.

## Cart (`Cart.jsx`)

- **Data:** entirely from `useCart()` (CartContext, backed by `localStorage` key `bg-cart`) — no server call needed to view cart (cart is local until checkout).
- Line items: image, name, unit price, quantity stepper (respects current known stock — re-validated against live stock at checkout, not just cart-add time), remove button, line subtotal.
- Summary: subtotal, shipping fee (from settings, show "Free" if `free_shipping_threshold` met), total.
- Empty cart → `EmptyState` with "Continue Shopping" CTA to Shop.
- "Proceed to Checkout" disabled if cart is empty or any item's quantity exceeds currently fetched stock (re-check on page load).

## Checkout (`Checkout.jsx`)

- **Form (RHF + Zod, `schemas/checkout.schema.js`):** customer_name, phone (required, validated format), email (optional, validated format if provided), address_line, city, governorate (select, Egypt governorates list), notes (optional).
- **Order summary sidebar:** cart items (read-only here), shipping fee, total — sticky on desktop, collapsible on mobile.
- **Submit:** `POST /api/orders`. On success → clear cart, redirect to `CheckoutSuccess` with order number. On stock-conflict error (item went out of stock between cart and submit) → show inline error per affected item, do not lose form data, let user adjust quantity/remove and resubmit.
- Payment method shown as fixed, non-editable "Cash on Delivery" notice — no payment fields anywhere on this page.

## CheckoutSuccess (`CheckoutSuccess.jsx`)

- Shows order number prominently, estimated delivery note, "Track your order" link (pre-filled to `OrderTracking`), "Continue Shopping" CTA. Not reachable directly without an order number in route state — direct navigation redirects to Home.

## Order Tracking (`OrderTracking.jsx`)

- Public form: order number + phone → `GET /api/orders/track`.
- Result: status timeline (visual stepper using `order_status_history`), item list, delivery address (masked/partial for privacy is not required since it's the same phone verifying), cancel button if status is `pending`.

## My Orders (`MyOrders.jsx`)

- Public form: phone only → `GET /api/orders/lookup` → list of past orders (order number, date, status, total), each linking to `OrderTracking` detail for that order.

## About (`About.jsx`)

- Static bilingual content (brand story, values) — content sourced from `settings`/hardcoded copy provided by client, no dynamic data dependency beyond `settings` for contact info reused in a CTA strip.

## Contact (`Contact.jsx`)

- Form (RHF + Zod, `schemas/contact.schema.js`): name, phone, email (optional), message → `POST /api/support/complaints`.
- WhatsApp button and contact info (phone, address, socials) sourced from `settings`, displayed alongside the form.

## 404 (`NotFound.jsx`)

- Localized message, illustration, "Back to Home" CTA. Also used as the fallback for inactive/nonexistent product or category slugs.

## Shared Components Behavior Notes

- **CartDrawer:** opens automatically on "Add to Cart" (from anywhere), closable via overlay click/esc/close button, shows live item count badge on Navbar cart icon.
- **Navbar:** sticky, condenses (reduced height + shadow) after scrolling past hero, contains logo (left), centered nav links, search icon (expands to input on desktop, navigates to Shop on mobile), language switcher, theme toggle, cart icon with badge.
- **WhatsAppButton:** fixed position (bottom-end, RTL-aware), pre-filled message includes current page context when relevant (e.g. product name on product detail page).
