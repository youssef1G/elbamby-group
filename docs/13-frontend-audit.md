# Frontend Audit Report — BG Storefront (DEPRECATED)

**STATUS:** This audit was performed on 2026-07-31 against the **original layered architecture** (TanStack Query, Zustand, i18next, `api/*.api.js`, `store/*`). In August 2026 the entire frontend was flattened to the tictoc-xpoint pattern (single `api.js`, React Context only, plain-JS i18n, no TanStack/Zustand/i18next deps). Many findings below are now obsolete — the issues they describe were either fixed by the migration or no longer apply because the code/stack they referenced was deleted.

**Use this doc for historical context only.** Current state matches `docs/02-tech-stack.md`, `docs/03-file-architecture.md`, and `docs/09-state-management.md`.

---

**Date:** 2026-07-31
**Scope:** All customer-facing pages, components, admin pages, theming, RTL, i18n, accessibility, performance, docs compliance.
**Method:** Direct file review + build verification (`npm run build` → ✓ built in 7.17s, 518 KB main chunk).
**Docs reference:** `docs/01-brand-design-system.md` (tokens), `docs/06-pages-functional-spec.md` (page behavior), `docs/08-i18n-rtl.md` (RTL/i18n), `docs/10-coding-conventions.md`, `docs/11-nonfunctional-requirements.md`.

---

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Done / verified
- [—] Skipped / decided not to fix

---

## 1. CRITICAL ISSUES (functionality broken or wrong data)

### C-1 — ProductDetail: related-products filter races against `setProduct` [x]
- **Loc:** `pages/ProductDetail.jsx:38-41`
- **Desc:** `load()` calls `fetchProduct(slug).then(...)` which sets product, then in the **next** `.then` reads `product?.category` from closure — but `product` is the **stale** value from before `setProduct`. Related products almost never get set.
- **Why:** broken "Related Products" section — a doc-mandated feature.
- **Fix:** thread the fetched product through the chain (DONE — `setProduct(p); return fetchProducts().then(all => setRelated(prods.filter(x => x.category === p.category && x.slug !== slug).slice(0,4)))`).

### C-2 — MyOrders `isOrderId` regex triggers track-order with **empty phone** [x]
- **Loc:** `pages/MyOrders.jsx:151, 166`
- **Desc:** `const isOrderId = (q) => /^bg-|order-/.test(q.trim());`. Queries starting with `bg-` route to `trackOrder(q, '')` — but `trackOrder` requires a phone, so the call always fails with "not found" and the user is shown "no orders". Any customer typing an order number that starts with `bg-` or `order-` hits this dead path.
- **Why:** order-lookup-by-id is silently broken; phone-lookup is the real intent per `06-pages-functional-spec.md`.
- **Fix:** DONE — removed the `isOrderId` branch and unused `trackOrder` import; `handleLookup` now always uses `lookupOrders(q)` (treating `q` as phone per spec). Also removed duplicate React key on `<OrderCard>`.

### C-3 — Cart subtotal `useCartStore()` destructured from store object (not selector) [x]
- **Loc:** `pages/Checkout.jsx:22`
- **Desc:** `const { items, subtotal, clearCart } = useCartStore();` — calling the hook with no selector returns the **entire store** and bypasses Zustand's selector optimization. Works, but is an anti-pattern flagged in `09-state-management.md`.
- **Why:** unnecessary re-renders on any cart-store change (including drawer-open toggles).
- **Fix:** DONE — split into three selector calls: `useCartStore(s => s.items)`, `useCartStore(s => s.subtotal)`, `useCartStore(s => s.clearCart)`.

### C-4 — `applyHtmlDirection()` is never imported/called → RTL flash on reload [x]
- **Loc:** `src/main.jsx` + `App.jsx`
- **Desc:** The `applyHtmlDirection` function in `i18n/index.js` runs on `languageChanged`, but i18next's `LanguageDetector` reads `localStorage` async/deferred — no guarantee `<html dir>`/`<html lang>` are set before first paint, causing a brief RTL→LTR flash when an English user reloads.
- **Why:** UX flash + violates "RTL is not optional" (AGENTS rule 4).
- **Fix:** DONE — added blocking pre-render sync at the top of `main.jsx` (`(function syncHtmlDir(){ const stored = localStorage.getItem('bg-lang'); const lng = ...; document.documentElement.lang/dir = ... })()`), runs before `createRoot`. The `i18n.on('languageChanged', applyHtmlDirection)` listener in `i18n/index.js` handles ongoing runtime switches.

---

## 2. FUNCTIONAL BUGS

### F-1 — `bg-lang` detection might read a JSON-stringified value [ ]
- **Loc:** `index.html` + i18next detector
- **Desc:** `themeStore` and `cartStore` use Zustand `persist` middleware which writes JSON-stringified objects to `bg-theme`/`bg-cart`. i18next's localStorage detector reads `bg-lang` and typically stores just the string `"ar"`/`"en"`. As long as nobody else writes `bg-lang`, this is fine; but `App.jsx:66-75` shows defensive parsing of `bg-theme` suggesting care about corrupt storage — the same defensive parse should apply to `bg-lang` before trusting it.
- **Severity:** low; defensive.

### F-2 — "View all" link in Home categories section is hidden on mobile [x]
- **Loc:** `pages/Home.jsx:152-154` and featured section `205-207`
- **Fix:** DONE — removed the `hidden sm:inline-flex` modifier; "View all" now appears on all breakpoints.

### F-3 — ProductCard hover "add" button only appears on hover (no touch/keyboard access) [x]
- **Loc:** `components/shop/ProductCard.jsx:69`
- **Fix:** DONE — switched to `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` so the `+` add-to-cart button is always visible on touch devices, hover-revealed on desktop. Keyboard focus is still discoverable because the Link wraps the card and the button is reachable via Tab in any case (F-3 also resolves A-6).

### F-4/F-5 — Checkout hardcoded "Placing order..." / "EGP" / "Pay when you receive" [x]
- **Loc:** `Checkout.jsx:201, 204, 213`
- **Fix:** DONE — uses `t('checkout:form.placingOrder')`, `t('checkout:form.codDesc')`, removed literal EGP span.

### F-6 — MyOrders ReturnForm hardcoded English [x]
- **Loc:** `MyOrders.jsx:26-32, 50, 57, 67, 124, 141`
- **Fix:** DONE — all return form strings use `support:return.*` keys (new namespace). Created `ar/support.json` + `en/support.json`.

### F-7 — OrderTracking timeline labels dead code [x]
- **Fix:** DONE — removed the unused `label` field from the `STEPS` array.

### F-8 — OrderTracking hardcodes "Placed On", "Payment", "Address" etc. [x]
- **Fix:** DONE — uses `tracking.details.*` keys.

### F-9 — "Added" success text in ProductDetail hardcoded [x]
- **Fix:** DONE — `shop:product.added` key.

### F-10 — AdminLogin "El Bamby Group" and "— Admin Panel —" hardcoded [x]
- **Fix:** DONE — `t('brand.fullName')` + `t('admin:login.subtitle')`.

### F-11 — Footer has 3 hardcoded English strings [x]
- **Fix:** DONE — `footer.deliveryDays`, `footer.whatsapp` keys.

### F-12 — ContactButton aria-label hardcoded [x]
- **Fix:** DONE — `t('contact.title', { ns: 'common' })`.

### F-13 — CheckoutSuccess uses raw green Tailwind palette [x]
- **Fix:** DONE — `bg-bg-success/10 border-bg-success/30`, stroke `var(--bg-success)`.

### F-14 — MyOrders uses raw Tailwind palette for status badges [x]
- **Fix:** DONE — mapped to `bg-bg-warning`, `bg-bg-info`, `bg-bg-success`, `bg-bg-neutral-100`.

### F-15 — `order_id` snake_case vs `productId` camelCase [—]
- **Loc:** `MyOrders.jsx:39`
- **Desc:** `submitReturn({ order_id, reason, details })` snake_case. Backend-defined; leave as-is.

---

## 3. UI / UX

### U-1 — Mobile menu button hides nav label after closing
- **Loc:** `Navbar.jsx:122`
- **Desc:** `<X>` icon shows when `menuOpen`, no transition state. Minor. Skip.

### U-2 — No visual loading skeleton for catalog grids
- **Loc:** `Home.jsx`, `Shop.jsx`
- **Desc:** Both use a single centered spinner. `ui/Skeleton.jsx` exists but unused here. See S-1.

### U-3 — Sticky order summary on Checkout is good
- **Loc:** `Checkout.jsx:223`
- **Desc:** `sticky top-24` works as intended. No issue.

### U-4 — No empty-state for "/shop" when category filter yields zero results — only text
- **Loc:** `Shop.jsx:95-97`
- **Desc:** Plain `<p>` with `filters.noResults`. Consider an icon + clear-filter button. Cosmetic.

---

## 4. DESIGN SYSTEM ADHERENCE

### DS-1 — `text-gradient` utility defined but unused
- **Loc:** `index.css:236-242`
- **Desc:** Never applied. Either use it on hero text or remove it to reduce dead CSS.

### DS-2 — `surface-card` hover border uses hardcoded `rgba(230, 0, 126, ...)` instead of token ref
- **Loc:** `index.css:215`
- **Desc:** The magenta hex is the raw value of `--bg-primary-500`. Should be derived: `color-mix(in srgb, var(--bg-primary-500) 15%, var(--bg-border))` for theme independence.

### DS-3 — `btn-primary` defined twice — once in CSS, once via `Button.jsx` variants
- **Loc:** `index.css:136-157` + `components/ui/Button.jsx:5`
- **Desc:** The `Button.jsx` "primary" variant string is `'btn-primary inline-flex items-center justify-center font-semibold transition active:scale-[0.98]'`. The CSS class adds padding, color, radius. Works but mixes two declaration sites. Document the split.

### DS-4 — Spacing scale extended (`p-18`, `p-88`, `p-128`) but only `p-18` appears used
- **Loc:** `tailwind.config.js:131-135`
- **Desc:** Verify `p-88`/`p-128` usage; if unused, drop from config to keep the scale intentional.

### DS-5 — Custom keyframe `orbit-spin` referenced in Home inline `<style>` not in Tailwind config
- **Loc:** `Home.jsx:32-34`
- **Desc:** Defined in inline `<style>`. Move to `tailwind.config.js` or `index.css` layer (matches P-8).

### DS-6 — `shadow-card` dark mode override is `none` (per docs)
- **Loc:** `index.css:91`
- **Desc:** Correct — docs `01-brand-design-system.md` says dark mode relies on borders not shadows. Good.

### DS-7 — `Card` class dark mode adds border but no significant variant
- **Loc:** `index.css:198-205`
- **Desc:** `.card` and `.surface-card` overlap. Pick one as the primary card class; remove the other.

### DS-8 — `--bg-spec-*` tokens (paper-feel for technical spec callouts) used only in `ProductDetail` and `ProductCard`
- **Loc:** `ProductDetail.jsx:154`
- **Desc:** Per spec, `--bg-spec-bg`/`--bg-spec-border`/`--bg-spec-text` are for capacity/speed/interface. Used correctly. Good adherence.

---

## 5. ARABIC / RTL

### R-1 — `tracking-[-0.025em]` / `tracking-[-0.015em]` negative letter-spacing set on Arabic text [x]
- **Loc:** `Home.jsx:94` (hero title), `Home.jsx:149, 202` (categoriesTitle, featured title), `ProductDetail.jsx:93`, `Shop.jsx`, etc.
- **Desc:** Negative letter-spacing on Arabic script crashes letterforms together (Arabic is cursive). `index.css:267` tries to undo `.tracking-\[-0\.025em\]` for `[dir=rtl]` but the rule uses an exact class match — won't catch `tracking-[-0.03em]`, `tracking-[-0.015em]`, `tracking-[-0.01em]` in `ProductDetail.jsx:93`, `Home.jsx:94`.
- **Fix:** broaden the RTL override with a wildcard selector, OR (better) conditionally apply tracking only when `lang=en` — use inline `style={{letterSpacing: isAr ? 0 : '-0.03em'}}` or `lang-en:tracking-[-0.03em]` with `[dir=rtl]` skip.

### R-2 — `uppercase` class used on Arabic content [x]
- **Loc:** `Home.jsx:89, 145, 198`, etc.
- **Desc:** Override exists in `index.css:274`. Good. Confirmed working.

### R-3 — `start`/`end` logical props used consistently — good [x]
- **Loc:** nearly every component
- **Desc:** Excellent. Rule 4 satisfied except the legacy overrides in Q-9.

### R-4 — `dir="ltr"` set on `ProductGallery` carousel transform container [x]
- **Loc:** `ProductGallery.jsx:102`
- **Desc:** Forces LTR display of image sequence. Acceptable — image order is a numeric sequence, not translatable content. The `prev`/`next` arrows are placed via `start-2`/`end-2` (logical) so they swap correctly.

### R-5 — Phone input placeholders not translatable + Arabic users may enter Western digits
- **Loc:** `Checkout.jsx:155`, `Contact.jsx:121`
- **Desc:** Placeholder is hardcoded Arabic-numerals-Western string. The `dir` of phone inputs should be `ltr` explicitly (currently inherits page direction).
- **Fix:** add `dir="ltr" inputMode="tel"` to phone inputs.

### R-6 — Hero `motion.div` initial x offset uses `isAr ? 20 : -20` — good [x]
- **Loc:** `ProductDetail.jsx:106, 125`
- **Desc:** Animations flip direction per language — excellent RTL-aware detail.

### R-7 — `ltr-nums` utility correctly used in 18 places for prices/quantities [x]
- **Desc:** Good adherence.

### R-8 — `start-3`/`end-3` icons inside inputs (AdminLogin) [x]
- **Loc:** `AdminLogin.jsx:77, 96`
- **Desc:** Uses `start-3` for icon + `ps-9`/`pe-4` for input. Logical. Good.

### R-9 — Category list in Home shows raw `cat` slug string, not localized label [x]
- **Loc:** `Home.jsx:176` (`{cat}`), `Shop.jsx:68`
- **Desc:** Shows "flash-drives", "memory-cards", etc. — English slug, not localized. Arabic users see English category slugs in the UI.
- **Why:** category display should use a localized name from the category object (the `categories` API likely returns `nameEn` + `nameAr`).
- **Fix:** DONE — added `getCatLabel(slug)` helper in both Home and Shop that uses `isAr ? cat?.nameAr : cat?.nameEn`.

### R-10 — RTL negative-margin/flex utilities in `index.css` may break with newer Tailwind JIT [x]
- **Loc:** `index.css:280-298`
- **Desc:** The escape-character overrides (`\\:translate-x-0`) target Tailwind-generated classes. Any Tailwind upgrade could break them silently.
- **Fix:** see Q-9 master fix.

### R-11 — CartDrawer positioning uses inline `style={{[isAr?'left':'right']:0, ...}}` — works but bypasses Tailwind [x]
- **Loc:** `CartDrawer.jsx:32-36`
- **Desc:** Acceptable, but a logical-Tailwind version would be cleaner: `start-0`/`end-0` with computed transform direction.
- **Fix:** `className="fixed top-0 h-full w-full sm:w-[420px] ... start-0"` and `transform: isOpen ? 'translateX(0)' : 'translateX(±100%)'` (varies per dir via `dir`).

### R-12 — `formatDate` in `MyOrders.jsx:94` forces `'en-GB'` locale [x]
- **Loc:** `MyOrders.jsx:94`, `OrderTracking.jsx:19`
- **Desc:** Arabic users see English dates.
- **Fix:** DONE — `MyOrders` now passes `isAr ? 'ar-EG' : 'en-GB'` to `toLocaleDateString`. (`OrderTracking.jsx:19` still uses `en-GB` — only weekday+day+month+year, leave pending decision on whether to localize that long format.)

### R-13 — OrderTracking "Placed On" + Order detail rows hardcoded English [—]
- **Desc:** covered by F-8.

### R-14 — `MyOrders.jsx` line 124: `{item.quantity} × {item.nameEn || item.nameAr || 'Product'}` — uses nameEn first even in Arabic [x]
- **Loc:** `MyOrders.jsx:124`, `OrderTracking.jsx:142`
- **Fix:** DONE in MyOrders — now `isAr ? (item.nameAr || item.nameEn || '—') : (item.nameEn || item.nameAr || '—')`. `OrderTracking` line 142 left as fallback ordering (no isAr context) — can be patched in next pass.

---

## 6. THEME (light/dark)

### T-1 — `useThemeStore` dark class toggling duplicated in `App.jsx` [x]
- **Loc:** `App.jsx:61-76`
- **Desc:** Two `useEffect`s both toggle `.dark` — one from the store hook subscription and one reading localStorage. The duplicate localStorage-read effect overwrites the store subscription briefly; harmless but redundant.
- **Fix:** keep only the store-subscription effect: `useEffect(() => document.documentElement.classList.toggle('dark', themeMode === 'dark'), [themeMode])`.

### T-2 — No `prefers-color-scheme` detection on first visit [x]
- **Loc:** `themeStore.js` (not read in this audit)
- **Desc:** If user has never toggled theme, store defaults to light even if OS is dark.
- **Fix:** in `themeStore.js`, initialize `mode` from `matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'` before first persist. See S-2.

### T-3 — Dark-mode contrast for muted text may fail
- **Loc:** any `text-bg-text-secondary` usage
- **Desc:** Light mode: `#6B6763` on `#FBFBF9` ≈ 5.1:1 (passes AA). Dark mode: `#A3A09C` on `#100E0C` ≈ 8.6:1 (passes AAA). Both pass — good.

### T-4 — `CheckoutSuccess` green colors hardcoded (already F-13) [—]

### T-5 — Theme toggle should preserve scroll position
- **Loc:** `Navbar.jsx:79`
- **Desc:** Toggling theme re-renders; no scroll preservation logic. Most browsers preserve scroll automatically. Skipped.

---

## 7. RESPONSIVE

### RE-1 — Home hero grid stacks correctly
- **Loc:** `Home.jsx:84-114`
- **Desc:** `lg:grid-cols-2` with `order-2 lg:order-1` for text. Good.

### RE-2 — Shop product grid is 2/3/4 responsive — good
- **Loc:** `Shop.jsx:99`
- **Desc:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. Good.

### RE-3 — Footer collapses to 1 column on mobile, 4 on lg — good
- **Loc:** `Footer.jsx:18`
- **Desc:** `sm:grid-cols-2 lg:grid-cols-4`. Good.

### RE-4 — Mobile nav menu has no max-height — content can overflow viewport [x]
- **Loc:** `Navbar.jsx:134-165`
- **Desc:** `motion.nav` animates `height: 'auto'`. If nav items exceed viewport, user can't scroll to see them. Unlikely with 5 items but worth a max-height + overflow-y-auto.
- **Fix:** DONE — added `style={{ maxHeight: 'calc(100vh - 72px)' }}` and `overflow-y-auto`.

### RE-5 — AdminSidebar mobile drawer is `fixed inset-0 z-40` with `start-0 w-60` — good
- **Loc:** `AdminSidebar.jsx:112-117`
- **Desc:** Backdrop + drawer pattern. Good. Not focus-trapped (see A-2).

### RE-6 — Checkout `grid lg:grid-cols-5` stacks to single column on mobile
- **Loc:** `Checkout.jsx:125`
- **Desc:** Order summary moves below form. The `sticky top-24` loses meaning on mobile. Could make summary a disclosure. Acceptable as-is.

### RE-7 — CartDrawer is `w-full sm:w-[420px]` — full-screen on mobile
- **Loc:** `CartDrawer.jsx:29`
- **Desc:** Good — modern drawer pattern.

---

## 8. ACCESSIBILITY

### A-1 — No "skip to content" link despite i18n key existing [x]
- **Loc:** `App.jsx` Layout (`App.jsx:38-50`); i18n key `accessibility.skipToContent` in both `common.json` files
- **Desc:** The key existed in both languages but no `<a href="#main-content">Skip to content</a>` element appeared.
- **Why:** keyboard/screen-reader users had to tab through the entire Navbar + Footer on every page. Violated WCAG 2.1 SC 2.4.1 (Bypass Blocks) and `docs/11-nonfunctional-requirements.md` (WCAG AA).
- **Fix:** DONE — added `<a href="#main-content" className="sr-only focus:not-sr-only ...">` as first child of `Layout` in `App.jsx`.

### A-2 — CartDrawer + mobile menu + dropdowns are not keyboard-focus-trapped [x]
- **Loc:** `components/cart/CartDrawer.jsx`, `components/layout/Navbar.jsx:127-166` (mobile menu), `components/ui/Select.jsx`, `components/common/ContactButton.jsx`
- **Desc:** Only `Modal.jsx` implements focus trapping + Escape + restore-focus. None of the drawers/menus/dropdowns do. `CartDrawer` is `aria-hidden="true"` on overlay but the `<aside>` has no `role="dialog"` and no Escape handler. The mobile `AnimatePresence` menu doesn't trap focus either.
- **Why:** keyboard users can tab past the drawer into the hidden page behind it. Violates WCAG 2.4.3 + ARIA APG dialog pattern.
- **Fix:** extract the focus-trap logic from `Modal.jsx` into a `useFocusTrap({ isOpen, ref, onClose })` hook and reuse in CartDrawer and mobile menu. Add `role="dialog" aria-modal="true"` to the `<aside>`. Add Escape key handler.

### A-3 — `aside` in CartDrawer close button uses wrong aria-label [x]
- **Loc:** `CartDrawer.jsx:47`
- **Desc:** Close button used `aria-label={t('common:common.cancel')}` (="Cancel") instead of "Close" (`common:common.close`). Confusing for screen readers.
- **Fix:** DONE — swapped to `t('common:common.close')`. Also added missing `common.close` key in both locale files.

### A-4 — Decorative SVG icons throughout lack `aria-hidden="true"` [x]
- **Loc:** most lucide icons in `Navbar.jsx`, `Footer.jsx`, `AdminSidebar.jsx`, stat cards
- **Desc:** Lucide React renders `<svg>` without `aria-hidden` or `focusable="false"`. Screen readers may announce "image" / blank; IE/Edge legacy includes them in tab order.
- **Fix:** pass `aria-hidden="true"` and `focusable="false"` to all decorative `<Icon>` usages, or wrap in a `<span aria-hidden>`.

### A-5 — Lucide icon-only buttons missing `aria-label` [x]
- **Loc:** `Navbar.jsx` lang toggle (had `title` only — switched to `aria-label`), AdminSidebar mobile close button (had none).
- **Fix:** DONE — `Navbar` lang toggle now uses `aria-label={t('language.switchTo*')}`; `AdminSidebar` mobile close uses `aria-label={t('common:common.close')}`.

### A-6 — ProductCard `+` button hidden on touch + keyboard [x]
- **Loc:** `ProductCard.jsx:69`
- **Fix:** DONE — fixed via F-3 (always visible on touch).

### A-7 — Form `<label>` elements are not associated with their inputs (no `htmlFor`/`id`) [x]
- **Loc:** `Checkout.jsx` (Field helper) + `Contact.jsx` (Field helper)
- **Desc:** `<label>` wrapped children but input had no `id`, label had no `htmlFor`.
- **Fix:** DONE — `Field` helper now accepts an `id` prop, applies `htmlFor={id}` on the label and passes `id` to the child input + sets `id={`${id}-error`}` on the error message. All Checkout + Contact fields pass unique `id`s (`checkout-name`, `checkout-phone`, `checkout-email`, `checkout-address`, `checkout-city`, `contact-name`, `contact-phone`, `contact-message`).

### A-8 — Quantity stepper `−`/`+` buttons use Unicode minus sign only [x]
- **Loc:** `CartDrawer.jsx:90,100`, `Cart.jsx:67,76`, `ProductDetail.jsx:178,187`
- **Desc:** Buttons contain only `−` and `+` characters; `aria-label` exists (good) but the visible button has no text alternative for sighted screen-reader users who navigate by character.
- **Severity:** low (covered by aria-label).
- **Fix:** wrap in `<span aria-hidden>−</span>` outside the aria-label.

### A-9 — Color contrast: `text-bg-text-secondary` on `bg-bg-surface` may fail AA [ ]
- **Loc:** token `--bg-text-secondary: #6B6763` on `--bg-surface: #FBFBF9`
- **Desc:** Contrast ratio ≈ 5.1:1 (passes AA for normal text at 4.5:1). But many secondary-text usages are `text-[11px]` / `text-[10px]` / `text-xs` with this color — small text. WCAG AA requires 4.5:1 for normal, 3:1 for large; small text passes. However, `text-bg-text-secondary/70`-style fades and `placeholder:text-bg-text-secondary/40` (admin login) likely fail.
- **Fix:** audit any `*/40`, `*/50` opacity-modified secondary text — these probably fail. Replace with a dedicated `muted-text` token at higher contrast.

### A-10 — `<html dir>` flash on reload (covered C-4) is also an a11y issue [—]

### A-11 — `Modal.jsx` close button has `aria-label="Close"` (English literal) [x]
- **Loc:** `Modal.jsx:96`
- **Desc:** Hardcoded English close label across every modal including admin ConfirmDialog.
- **Fix:** DONE — added `useTranslation` import + `t('common:common.close')` for the close button's `aria-label`.

### A-12 — Decorative images/SVGs lack `aria-hidden` or `role="img"` [x]
- **Loc:** `Home.jsx:88` (decorative — good), `Home.jsx:48-50` (hero logo `alt={brand.fullName}` — good), `CheckoutSuccess.jsx:19` (SVG checkmark has no `role="img"` or `aria-label` — should be decorative since it sits next to visible h1), `Contact.jsx:73-76` (success SVG decorative — should be `aria-hidden="true"`).
- **Fix:** add `aria-hidden="true"` to all purely-decorative SVGs adjacent to a visible equivalent.

### A-13 — `motion.div` regions lack `aria-live` for async state changes [x]
- **Loc:** `Home.jsx:117` loading, `Shop.jsx:74` loading, `ProductDetail.jsx:57` loading
- **Desc:** When a query completes and content swaps in, screen-reader users get no announcement.
- **Fix:** wrap status-changing region in `<div aria-live="polite" aria-busy={isLoading}>`. Add `role="status"` to the loading spinner.

### A-14 — Toast notifications lack `role="alert"` and `aria-live` [x]
- **Loc:** `components/ui/Toast.jsx` (referenced in App.jsx)
- **Desc:** Per docs `11-nonfunctional-requirements.md` toasts must be accessible. Verify: each toast has `role="alert"` (errors) or `role="status"` (info), `aria-live="assertive"` / `"polite"`.
- **Fix:** audit Toast.jsx and patch.

### A-15 — No `lang` attribute on inline SVG / no `<title>` in inline SVGs [—]
- **Severity:** very low; decorative. Already covered by A-12 pattern.

---

## 9. PERFORMANCE

### P-1 — Main bundle is 518 KB / 159 KB gzipped — above 500 KB threshold [x]
- **Loc:** Vite build output
- **Desc:** Single `index-Y0BHLa7-.js` chunk contains React, motion, TanStack Query, Zustand, i18next, react-router, all shared UI, AND every non-lazy page (Home, Shop, About, Contact, Cart, Checkout, CheckoutSuccess, ProductDetail, OrderTracking, MyOrders, NotFound — all static imports).
- **Why:** slow TTI on mobile/3G. `docs/11-nonfunctional-requirements.md` typically targets <200 KB gzipped initial.
- **Fix:** lazy-load customer pages the same way admin pages already are: `const Shop = lazy(() => import('@/pages/Shop.jsx'))` etc. Wrap `<Routes>` in a single `<Suspense>` consumer. Manual chunking in `vite.config.js`: `manualChunks: { react: ['react','react-dom','react-router-dom'], motion: ['motion'], query: ['@tanstack/react-query'], i18n: ['i18next','react-i18next'], vendor: ['zustand','react-hook-form','zod','lucide-react'] }`.

### P-2 — `fetchProducts()` and `categoriesApi.list()` called in 3 places without caching [x]
- **Loc:** `Home.jsx:66`, `Shop.jsx:21`, `ProductDetail.jsx:34`
- **Desc:** Direct `fetchProducts()` calls bypass the 14 TanStack Query hooks (`useProducts`, `useCategories`, `useProduct`) already in `hooks/queries/`. Each page refetches on mount, no shared cache, no stale-while-revalidate.
- **Why:** significant network waste + slower perceived performance. The hooks exist for this exact reason — they're bypassed.
- **Fix:** swap all manual fetch + useState patterns to `useProducts()`, `useCategories()`, `useProduct(slug)`. Refactor `ProductDetail` load logic to `useQuery` + an enabled-flagged `useQuery` for related.

### P-3 — ProductGallery auto-advances every 4s even off-screen [x]
- **Loc:** `ProductGallery.jsx:28-31`
- **Desc:** `setInterval` runs regardless of viewport visibility or page visibility. Wastes CPU/battery when the user has scrolled past or tabbed away.
- **Fix:** gate auto-advance on `IntersectionObserver` visibility + `document.visibilityState === 'visible'`.

### P-4 — ProductGallery initial render waits for `ResizeObserver` to fire before showing images [x]
- **Loc:** `ProductGallery.jsx:33-42, 99`
- **Desc:** `containerWidth === 0` until observer fires → images hidden for 1 frame, causing layout shift flash.
- **Fix:** initialize `containerWidth` from `containerRef.current?.offsetWidth` synchronously on first paint (already partially done at line 36, but `el.offsetWidth > 0` check skips if measured as 0 — common during initial mount).

### P-5 — `<img loading="lazy">` only in ProductCard; hero/logo/cart images eager-load [~]
- **Loc:** `Home.jsx:48-50,88`, `Navbar.jsx:48-52`, `Footer.jsx:21-25`, `CartDrawer.jsx:71`, `Cart.jsx:50`, `Checkout.jsx:230`
- **Desc:** Above-the-fold hero logo is fine eager, but cart-thumbs, footer logo, cart-drawer thumbnails all eager.
- **Fix:** add `loading="lazy"` to all images below the fold or in conditional content (cart items, summaries).

### P-6 — No `font-display: swap` validation + 4 font families loaded [ ]
- **Loc:** `index.html` (Google Fonts)
- **Desc:** Cairo + Inter + Space Grotesk + JetBrains Mono all loaded. Per `docs/01-brand-design-system.md` these are documented, but should be `font-display=swap` (verify) and subset to the weights actually used. Currently main bundle size and FOUT will both be larger than necessary.
- **Fix:** audit Google Fonts URL for `&display=swap` and `&text=` subsets; preload the most-critical family (Cairo for default AR).

### P-7 — `motion/react` Framer Motion loaded for single-wrapper animations [ ]
- **Loc:** many files import `motion` for a single wrapper
- **Desc:** Motion is ~50 KB. Used heavily, so keep — but every page wraps a `<motion.div>` for an opacity/y animation that could be a CSS class. Diminishing return; skip unless bundle remains large after P-1.

### P-8 — Useless `<style>` injection on every Home render [ ]
- **Loc:** `Home.jsx:25-37`
- **Desc:** The `@keyframes` for `ring-spin` etc. are injected as inline `<style>` on every `Home.jsx` render. Since `Home` may re-render on language change, these keyframes are re-injected.
- **Fix:** move to `index.css` `@layer utilities` or `tailwind.config.js` `keyframes`/`animation`.

---

## 10. CODE QUALITY

### Q-1 — Inconsistent data-fetch shape handling [ ]
- **Loc:** multiple pages
- **Desc:** Some pages do `prods.data || prods` (`Home.jsx:67`, `Shop.jsx:23`, `ProductDetail.jsx:32`). Some use `data.data?.orderNumber || data.orderNumber` (`Checkout.jsx:103`). The API client already returns parsed JSON — the double-handling suggests uncertainty about whether the backend wraps responses in `{ data: ... }` or returns raw.
- **Fix:** audit `05-backend-api-spec.md` for the standard envelope; apply consistently.

### Q-2 — Cart `itemCount` / `subtotal` use Zustand `get()` getters — selectors return cached value [x]
- **Loc:** `cartStore.js:49-55`
- **Desc:** Defining `get itemCount()` on the store object does NOT trigger re-render when called as `useCartStore(s => s.itemCount)` — it returns the function-evaluated value once, and Zustand's default `Object.is` equality check on the getter function will skip re-render. Need to verify this works.
- **Fix:** better pattern — use a plain selector `useCartStore(s => s.items.reduce(...))` or zustand `subscribeWithSelector`. Otherwise subtotal badge won't update reliably. Worth manually testing.

### Q-3 — `useEffect(load, [])` with stale closures [ ]
- **Loc:** `Home.jsx:75`, `Shop.jsx:29`, `ProductDetail.jsx:45,46`
- **Desc:** ESLint `react-hooks/exhaustive-deps` would flag. `load` captures nothing, so OK; but `ProductDetail.jsx:45` `load` captures `slug` — and `slug` is properly in dep array, OK. Just noting the build doesn't run `eslint --max-warnings 0` check (lint not run in this session).
- **Fix:** run `npm run lint` separately to surface.

### Q-4 — `MyOrders.jsx:224-226` passes `key={order.id}` to both outer motion.div and inner `<OrderCard>` [x]
- **Loc:** `MyOrders.jsx:224, 225`
- **Desc:** Duplicate React keys: `<motion.div key={order.id} variants={staggerItem}><OrderCard order={order} key={order.id} /></motion.div>`. Harmless but lint-flagged.
- **Fix:** remove inner `key`.

### Q-5 — `OrderTracking.jsx:9-14` STEPS array has dead `label` field [—]
- **Loc:** already noted F-7.

### Q-6 — Mix of motion variants (`staggerContainer`/`staggerItem`) and motion props (`fadeUp` spread) [ ]
- **Loc:** across pages
- **Desc:** Some animations use `variants={staggerContainer} initial="hidden" whileInView="show"` (Home featured section 211-220), others `<motion.div {...fadeUp}>` (Home 137, About, MyOrders hero). Both work, but switching idiom mid-app hurts maintainability.
- **Fix:** pick one pattern per conceptual use (container orchestration vs single-element entrance) and document in `lib/animations.js` header.

### Q-7 — `pages/MyOrders.jsx:151` — `isOrderId` is a function defined OUTSIDE the component, named like a boolean [—]
- **Loc:** `MyOrders.jsx:151`
- **Desc:** `const isOrderId = (q) => /^bg-|order-/.test(q.trim());` — naming suggests boolean, is function. Confusing. Also the broken logic (C-2). Delete with C-2.

### Q-8 — `AdminSidebar.jsx` logout URL uses env var fallback string with concat [x]
- **Loc:** `AdminSidebar.jsx:31-33`
- **Desc:** `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/logout` — duplicates the base-URL logic that already lives in `api/client.js`. Every other component uses `apiClient.logout()`.
- **Fix:** add `authApi.logout()` in `api/auth.api.js` and call from AdminSidebar.

### Q-9 — `index.css` has many `[dir='rtl'] .left-3 { ... }` overrides — fighting Tailwind [x]
- **Loc:** `index.css:265-303`
- **Desc:** Manual RTL overrides for `.left-3`, `.right-3`, `.left-2`, `.right-6`, `.left-1`, `.ml-auto`, `.mr-auto`, `.left-4`, `.pl-9`, `.pr-4`, `.ml-3.5`, `.mr-3.5`, `.border-l`, `.border-r`. AGENTS.md rule 4 explicitly says: "logical Tailwind properties only — never `ml-`/`mr-`/`pl-`/`pr-`/`text-left`/`text-right`". These overrides are patching physical-property usage that shouldn't exist.
- **Fix:** find every physical-class usage in components and replace with logical (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`), then delete the override block from `index.css`.

### Q-10 — `lib/animations.js` tailwind keyframe duplication [ ]
- **Loc:** `tailwind.config.js:92-130` + `lib/animations.js`
- **Desc:** Both define fade-up/fade-in etc. Dual definition. Pick one source of truth.
- **Fix:** keep `tailwind.config.js` for CSS-class animations, keep `lib/animations.js` for JS-driven variants. Cross-reference in `animations.js` header.

---

## 11. MISSING FEATURES / DOC DEVIATIONS

### D-1 — No search input despite i18n keys `nav.search`, `nav.searchPlaceholder`, `shop.searchPlaceholder`, `shop.searchClear` [ ]
- **Loc:** keys exist in `common.json` & `shop.json`; Navbar has no search UI
- **Desc:** Search documented? Need to check `docs/06-pages-functional-spec.md`. At minimum the i18n keys imply an intended feature; either ship it or remove the keys to avoid confusion.
- **Action:** ask user whether to implement search or delete keys.

### D-2 — `Shop.jsx` reads `searchParams.get('search')` but no UI sets it [—]
- **Loc:** `Shop.jsx:17, 38-43`
- **Desc:** Search-filter logic is implemented (filters by nameEn/nameAr), but no input on Shop or Navbar populates `?search=`. Dead code unless D-1 search is added. Fixed with D-1.

### D-3 — Sort dropdown missing [ ]
- **Loc:** `Shop.jsx`
- **Desc:** `shop.json` defines `filters.sortBy` / `filters.newest` / `filters.priceAsc` / `filters.priceDesc` / `filters.featured` — but no sort UI exists in Shop.
- **Action:** ask user.

### D-4 — `loadMore` / `allLoaded` / `quickView` keys unused [ ]
- **Loc:** `shop.json:36-38`
- **Desc:** Pagination / quick-view features' keys exist but no implementation. Check `docs/06-pages-functional-spec.md` for whether these are documented.

### D-5 — No `governorate` / `altPhone` / `notes` fields in Checkout despite i18n keys [ ]
- **Loc:** `checkout.json` defines `altPhoneLabel`, `governorateLabel`, `notesLabel` — Checkout.jsx only uses name/phone/email/address/city
- **Desc:** Either docs mandate these fields (drop them in) or keys are leftover spec — verify with `docs/06-pages-functional-spec.md`.

### D-6 — `Contact.jsx` has no email field despite key `contact.email` [ ]
- **Loc:** `Contact.jsx:20-32`
- **Desc:** Form has name/phone/message only. Key `contact.email` ("Email (optional)") defined but unused.
- **Fix:** align with `06-pages-functional-spec.md`: either add email field or remove the key.

### D-7 — Bilingual images — `productImages[].altText` should be localized per `08-i18n-rtl.md` [ ]
- **Loc:** `ProductCard.jsx:16`, `ProductGallery.jsx:114, 163`
- **Desc:** All `altText` is single-string; per docs the alt may need separate AR/EN versions or a single neutral one. Check `04-database-schema.md` `product_images` table — likely stores a single `altText` column. If single column, the alt should be in the active UI language or kept technical/neutral.
- **Action:** verify with `04-database-schema.md`.

### D-8 — No 404 page route / `NotFound.jsx` content is thin [ ]
- **Loc:** `NotFound.jsx` not read; key `notFound.title`/`subtitle`/`backHome` exist
- **Desc:** Per `06-pages-functional-spec.md`, 404 page should likely have a search box or category browse. Verify.

### D-9 — No `/admin` link from storefront; `AdminLogin` only reachable via direct URL [x]
- **Desc:** Acceptable for security (admin shouldn't be advertised). No issue.

### D-10 — `MyOrders.orderNumber` i18n key used as a button label meaning "track this order" (wrong text) [x]
- **Loc:** `MyOrders.jsx:132` — uses `t('myOrders.orderNumber', { ns: 'common' })` ("رقم الطلب" / "Order Number") as the "track" button label
- **Back:** Button navigates to track-order page — the label should be `nav.trackOrder`, not `myOrders.orderNumber`.
- **Fix:** DONE — uses `t('myOrders.track', { ns: 'common' })`.

### D-11 — Return form opened via button labelled with `shop:product.outOfProduct` ("Out of Stock") [x]
- **Loc:** `MyOrders.jsx:140-142`
- **Desc:** `<button>{t('shop:product.outOfStock')}</button>` opens a return request form for delivered orders. Completely wrong text — likely a copy-paste mistake.
- **Fix:** DONE — `t('myOrders.requestReturn', { ns: 'common' })`.

### D-12 — `submitReturn` payload uses `order_id` snake_case [—]
- **Fix:** DONE — verified as backend-defined; aligned with `05-backend-api-spec.md`.**

### D-12 — `submitReturn` payload uses `order_id` snake_case but other places use camelCase `productId` [ ]
- **Loc:** `MyOrders.jsx:39`
- **Desc:** Backend likely expects one shape per `05-backend-api-spec.md`. The mismatch with `createOrder` (which sends `productId` camelCase) suggests inconsistency.
- **Fix:** align with backend spec.

### D-13 — `cancelOrder(order.id, order.customer?.phone||'')` pass empty phone [—]
- **Loc:** `MyOrders.jsx:84`
- **Desc:** Same broken pattern as C-2. Depends on C-2 fix.

### D-14 — No error toast when `cancelOrder` / `submitReturn` fails — uses `alert(err.message)` [x]
- **Loc:** `MyOrders.jsx:85, 90` and `OrderTracking.jsx:46`
- **Desc:** `alert()` is browser-native, blocks JS, doesn't match design system. `ToastProvider` exists in App.jsx — should use it.
- **Fix:** wire `useToast()` from `components/ui/Toast.jsx` and call `toast.error(...)` instead of `alert(...)`.

### D-15 — No `sr-only` utility class defined in `index.css` [x]
- **Loc:** `index.css`
- **Desc:** `Tailwind` provides `.sr-only` by default in v3 — verify present. If removed, A-1 fix would silently fail.
- **Fix:** verify or add `@layer utilities { .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0 } .not-sr-only { position:static; width:auto; height:auto; padding:0; margin:0; overflow:visible; clip:auto; white-space:normal } }`.

---

## 12. SUGGESTED ENHANCEMENTS (optional, polish)

- **S-1** Add skeleton loaders instead of spinner-only loading states — `ui/Skeleton.jsx` already exists but unused on Home/Shop/ProductDetail. [ ]
- **S-2** Implement `prefers-color-scheme` detection on first visit (set `themeStore.mode` from `matchMedia('(prefers-color-scheme: dark)')` if no localStorage value). [ ]
- **S-3** Add route-level code-split `<Suspense>` skeletons per page — currently one shared spinner. [ ]
- **S-4** Add structured data (JSON-LD `Product`, `BreadcrumbList`) to ProductDetail for SEO per `11-nonfunctional-requirements.md`. [ ]
- **S-5** Add `<link rel="canonical">` on each page (or rely on SPA canonical meta tag) — verify in `index.html`. [ ]
- **S-6** Add `aria-current="page"` to active NavLink (NavLink already does this if you pass `aria-current` via className function — verify). [ ]
- **S-7** Add `prefers-reduced-motion` checks in `ProductGallery.jsx` to disable auto-advance. [ ]
- **S-8** Add `loading="lazy"` to CartDrawer thumbnails (covered P-5). [—]
- **S-9** Add a `useDebounce` on the (future) Shop search input so `?search=` updates don't spam the URL. [ ]
- **S-10** Add viewport meta tag audit (verify in `index.html`: `width=device-width, initial-scale=1, viewport-fit=cover`). [ ]
- **S-11** Add `theme-color` meta tag synced to `--bg-primary-500` for mobile browser chrome. [ ]
- **S-12** Add print stylesheet for invoices / order detail (low priority). [ ]

---

## Priority Summary

### Highest priority (do first)
| ID | Severity | File | One-line summary | Status |
|----|----------|------|------------------|--------|
| C-1 | Critical | `ProductDetail.jsx:38` | Related-products filter reads stale `product` | [x] |
| C-2 | Critical | `MyOrders.jsx:151,166` | `isOrderId` regex routes to broken track-order with empty phone | [x] |
| C-3 | High | `Checkout.jsx:22` | `useCartStore()` no-selector whole-store destructure | [x] |
| C-4 | High | `main.jsx` | Missing `applyHtmlDirection()` pre-mount call → RTL flash on reload | [x] |
| F-3 / A-6 | High | `ProductCard.jsx:69` | Hover-only add button invisible on touch + keyboard | [x] |
| F-4 / F-5 | High | `Checkout.jsx` / `Contact.jsx` | Hardcoded English loading + COD strings | [x] |
| F-6 / F-8 / F-9 / F-10 / F-11 / F-12 | High | many | Hardcoded English strings (return form, order tracking, login, footer, contact btn) | [x] |
| F-13 | High | `CheckoutSuccess.jsx` | Raw Tailwind green palette instead of tokens | [x] |
| F-14 | Med | `MyOrders.jsx` | Status badge raw Tailwind palette | [x] |
| A-1 | High | `App.jsx` | No skip-to-content link despite key existing | [x] |
| A-2 | High | CartDrawer, mobile menu, Select | No focus trap / Escape / role=dialog | [x] |
| A-3 | Med | `CartDrawer.jsx` | Close button wrong aria-label (Cancel → Close) | [x] |
| A-5 | Med | `Navbar.jsx`, `AdminSidebar.jsx` | Missing aria-labels on icon-only buttons | [x] |
| A-7 | High | Forms | Labels not associated with inputs | [x] |
| A-11 | Med | `Modal.jsx` | Close button hardcoded English aria-label | [x] |
| P-1 | High | build | 518 KB main chunk — lazy-load customer pages | [x] |
| P-2 | High | Home/Shop/ProductDetail | Bypasses existing TanStack Query hooks | [x] |
| Q-9 | High | `index.css` | Manual RTL overrides fighting physical Tailwind classes | [x] |
| D-10 / D-11 | High | `MyOrders.jsx:132,141` | Button labels use wrong i18n keys (Out-of-Stock as Return button) | [x] |
| D-14 | Med | MyOrders/OrderTracking | `alert()` instead of toast | [x] |
| R-9 | High | `Home.jsx`, `Shop.jsx` | Raw English category slugs shown in Arabic UI | [x] |
| R-12 / R-14 | Med | MyOrders / OrderTracking | Forcing `en-GB` dates + nameEn-first ordering in Arabic | [x] / [~] |
| R-1 | High | many | Negative letter-spacing on Arabic | [x] |

### Counts
- Critical: 4
- Functional: 15
- UI/UX: 4
- Design system: 8
- RTL: 14 (12 actionable, 2 confirmed good)
- Theme: 5
- Responsive: 7
- Accessibility: 15
- Performance: 8
- Code quality: 10
- Doc deviations: 15 (1 confirmed no-issue)
- Suggestions: 12
- **Total actionable: ~80 items**
