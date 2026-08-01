# 11 — Non-Functional Requirements

## Performance

- Target Lighthouse scores (mobile, throttled): Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Largest Contentful Paint < 2.5s on a simulated 4G connection.
- All images served through Cloudinary transformations sized to their actual rendered dimensions (no shipping a 2000px image into a 300px card) — use Cloudinary's `f_auto,q_auto` for automatic format/quality and explicit `w_`/`h_` per breakpoint/usage.
- Route-level code splitting: admin bundle (`pages/admin/*`) is a separate lazy-loaded chunk from the customer storefront — a customer never downloads admin JS.
- Lazy-load below-the-fold images (`loading="lazy"`) and non-critical sections (e.g. related products, footer content on slow connections).
- Skeleton loading everywhere data is fetched (per `01-brand-design-system.md` / `06-pages-functional-spec.md`) — no blank white flashes.
- Debounce all search inputs (400ms) to avoid request spam.

## Accessibility

- WCAG 2.1 AA baseline: color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text/UI components — verify brand pink (`--bg-primary-500`) against white/dark backgrounds meets this for text use; use darker `--bg-primary-600/700` shades for text-on-white where 500 falls short.
- Full keyboard navigation: every interactive element reachable and operable via Tab/Enter/Space/Escape, visible focus ring at all times.
- Screen reader support: semantic HTML landmarks (`<nav>`, `<main>`, `<footer>`), `aria-label`s on icon-only buttons, `aria-live` regions for toasts and cart-count updates, modal focus trapping (Cart drawer, Quick View, Confirm dialogs).
- RTL correctness is itself an accessibility requirement, not just a visual one — screen readers depend on correct `dir`/`lang` attributes to pronounce content correctly (see `08-i18n-rtl.md`).

## SEO

- Server-renderable meta per page via `SEO.jsx` (title, description, canonical URL, Open Graph tags, `hreflang` alternates for `en`/`ar`) — since this is a client-rendered SPA, verify the hosting setup (Vercel) is configured so crawlers can still get meaningful content (prerendering or at minimum correct meta tags injected client-side before first paint where possible).
- `sitemap.xml` generated from active products + categories + static pages, regenerated on build or via a scheduled job.
- `robots.txt` allowing crawl of storefront, disallowing `/admin/*`.
- Structured data: `Product` JSON-LD on `ProductDetail` (name, image, price, availability, currency), `Organization` JSON-LD on `Home`/`About` with BG's name in both languages, logo, contact info.
- Clean, human-readable URLs: `/product/<slug>`, `/category/<slug>` — no ID-only URLs for anything customer-facing.

## Security

- All admin routes require valid JWT (httpOnly cookie), verified server-side on every request — never trust a client-side "isAdmin" flag alone.
- Passwords: bcrypt, 12 rounds minimum, never logged, never returned in any API response.
- Rate limiting on auth, order submission, and support forms per `05-backend-api-spec.md` — mitigates brute-force login attempts and order/complaint spam.
- All user input validated with Zod on the **backend**, even though the frontend also validates — frontend validation is a UX convenience, never the security boundary.
- `helmet()` for standard security headers (CSP, X-Frame-Options, etc.); CORS restricted to known frontend origin(s), not `*`.
- No secrets (Supabase service key, JWT secret, Resend key, Cloudinary secret) ever shipped to the frontend bundle — anything the frontend needs (Cloudinary unsigned upload preset name, public API base URL) is explicitly public-safe by design.
- SQL injection: not applicable directly (Supabase client uses parameterized queries), but any raw/dynamic query construction must still be reviewed for injection risk.
- Order/complaint/return public endpoints validate that referenced `order_number`/`phone` actually match before returning any data — prevents enumeration of other customers' orders.

## Responsiveness

- Mobile-first build order: design/implement mobile layout first, then adapt up to tablet/desktop breakpoints (`sm`/`md`/`lg`/`xl`) — not the reverse.
- Tested breakpoints minimum: 375px (small mobile), 768px (tablet), 1280px (desktop), 1920px (large desktop) — no horizontal scroll, no overlapping elements, no touch targets under 44px at any breakpoint.

## Reliability / Data Integrity

- Stock decrements happen atomically at order-creation time (single transaction/RPC on the backend, not a read-then-write race condition across two calls) to avoid overselling under concurrent checkouts.
- Every order status change is recorded in `order_status_history` — the admin/customer-facing timeline must never show a status without a corresponding audit row.
- Soft-delete by default for products/categories referenced by historical orders — hard-deleting a product must never break the display of past `order_items` (which rely on their own snapshot fields, not a live join).
