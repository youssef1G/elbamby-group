# 01 — Brand & Design System

## Brand

- **Store name (shown to customers):** BG
- **Full name:** El Bamby Group
- **Arabic name:** البمبي جروب
- **Sub-name (Arabic):** بيت الميموري — colloquial tagline used in Arabic copy, meaning "House of Memory". Improves brand recall and signals specialization in storage media.
- **Logo:** provided (magenta/pink "BG" roundel + Arabic/Latin wordmark on white), placed at `frontend/public/logo.png` and a Cloudinary/optimized copy for in-app use.
- **Design direction (v2, client-approved):** **technical-precise, hardware-influenced.** Inspired by Crucial/Samsung SSD product pages and Western Digital spec sheets. Generous whitespace, monospaced accents for capacity/speed data, big numerical callouts, subtle motion, lots of grid. The brand color (magenta/pink) is used as an accent — never as the dominant surface color. Think "spec sheet" not "consumer e-commerce template". Premium, minimal, and confidence-inspiring for technical buyers.

## Color System

Derived from the logo's magenta/pink, refined for v2 **technical-precise** direction. The primary surface is a warm off-white "ink-on-paper" to evoke spec sheets and technical docs. The brand magenta is an accent — never the dominant surface. Dark mode uses deep near-black with warm undertones.

Defined as CSS custom properties (not hard-coded Tailwind colors) so dark mode is a simple variable swap.

### Brand scale — `--bg-primary-*`

| Token | Hex (approx) | Usage |
|---|---|---|
| `--bg-primary-50` | `#FDE9F3` | Subtle tints, hover backgrounds |
| `--bg-primary-100` | `#FBD2E6` | Badge backgrounds, light accents |
| `--bg-primary-200` | `#F7A5CD` | Disabled-adjacent states |
| `--bg-primary-300` | `#F177B4` | Secondary accents |
| `--bg-primary-400` | `#EC4A9B` | Hover states on primary actions |
| `--bg-primary-500` | `#E6007E` | **Core brand color** — buttons, links, highlights. Use sparingly. |
| `--bg-primary-600` | `#C40069` | Primary button hover/pressed |
| `--bg-primary-700` | `#9E0055` | High-emphasis text on light bg |
| `--bg-primary-800` | `#780041` | Dark-mode primary surface accents |
| `--bg-primary-900` | `#52002D` | Deepest accent, rarely used |

### Spec callout tokens — `--bg-spec-*`

For displaying technical product data (capacity, speed, interface) in a monospaced, spec-sheet manner.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-spec-bg` | `#F7F7F5` | `#191715` | Background for spec chip/card |
| `--bg-spec-border` | `#E5E4E2` | `#2B2724` | Border for spec elements |
| `--bg-spec-text` | `#64605C` | `#A09C98` | Secondary spec labels |
| `--bg-spec-highlight` | `#E6007E` | `#E6007E` | Key spec values (e.g. "256GB") |

### Neutrals — `--bg-neutral-*`

Standard warm-neutral gray scale 50–950: `#FAFAF9` → `#0C0A0B`. Sits comfortably against the brand pink without being sterile.

### Semantic

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--bg-success` | `#16A34A` | `#22C55E` | In stock, order confirmed |
| `--bg-warning` | `#D97706` | `#F59E0B` | Low stock |
| `--bg-error` | `#DC2626` | `#EF4444` | Out of stock, form errors |
| `--bg-info` | `#2563EB` | `#3B82F6` | Informational |

### Surfaces

| Token | Light | Dark |
|---|---|---|
| `--bg-surface` | `#FBFBF9` | `#100E0C` |
| `--bg-surface-raised` | `#FFFFFF` (+ shadow) | `#191715` |
| `--bg-surface-sunken` | `#F4F3F0` | `#0A0807` |
| `--bg-border` | `#E5E3DF` | `#292624` |
| `--bg-text-primary` | `#1A1816` | `#F4F3F0` |
| `--bg-text-secondary` | `#6B6763` | `#A3A09C` |

### Ink band (always dark, both themes)

| Token | Value (light AND dark) |
|---|---|
| `--bg-ink` | `#1C1A1B` |
| `--bg-ink-text` | `#F4F3F0` |

**Rule:** unlike `--bg-text-primary`/`--bg-surface`, the ink band does **not** swap in `.dark`. It is the fixed dark "spec-sheet" band used for: the Home hero section, the capacity marquee, the bottom trust strip, and out-of-stock/badge overlays sitting on top of product images. Text inside an ink band always uses `--bg-ink-text` (never `--bg-surface`), with opacity modifiers for muted levels (`text-bg-ink-text/70`, `/50`). Glass cards on the ink band use fixed light glass (`bg-white/[0.06]`, `border-white/10`) which read correctly on the dark band in both themes.

**Rule:** components reference `--bg-*` variables via Tailwind's mapped config — never raw hex in component files, never Tailwind's default `pink-500` etc.

## Typography

### Primary Typeface

| Role | Latin | Arabic | Weights |
|---|---|---|---|
| Headings | Space Grotesk | Cairo | 500/600/700 |
| Body | Inter | Cairo | 400/500/600 |
| **Technical specs** | **JetBrains Mono** | **Cairo** | 400/500 (monospaced for capacity/speed/interface data) |

The primary pair (Space Grotesk + Inter) handles all UI text. JetBrains Mono is used **only** for spec callouts: capacity values ("256GB"), speed classes ("U3 V30"), interface types ("USB 3.2 Gen 1"). This exists purely in a `.font-mono` utility; no page-level headings use mono.

**JetBrains Mono — signature usage (Home hero, v3):** mono is the brand's visual signature on the home page: the capacity marquee strip (`8GB · 16GB · … · 2TB`), uppercase mono eyebrow labels (e.g. "STORAGE, DONE RIGHT" / تخزين بجودة تستحق) above section headlines, and the `HeroVisual` device card where the capacity readout ("256GB") and the WRITE-speed bar are rendered in mono with `tabular-nums`. Loaded via Google Fonts alongside Space Grotesk/Inter/Cairo (`family=JetBrains+Mono:wght@400;500`, `display=swap`); configured as the `mono` fontFamily in Tailwind. Arabic never uses JetBrains Mono — it falls back to Cairo, so mono usage is a Latin-glyph/`ltr-nums` pattern only.

Font-family switches automatically based on active locale via `<html lang>` attribute — see `08-i18n-rtl.md`.

### Type scale (rem, mobile-first, fluid up on desktop via clamp)

| Token | Size | Usage |
|---|---|---|
| `text-display` | clamp(2rem, 5vw, 3.5rem) | Hero headlines only |
| `text-h1` | clamp(1.75rem, 3.5vw, 2.5rem) | Page titles |
| `text-h2` | clamp(1.375rem, 2.5vw, 1.875rem) | Section titles |
| `text-h3` | 1.25rem | Card titles, subsections |
| `text-body-lg` | 1.125rem | Lead paragraphs |
| `text-body` | 1rem | Default body |
| `text-body-sm` | 0.875rem | Secondary text, captions |
| `text-caption` | 0.75rem | Labels, meta, prices on small cards |

### Spec Data Display Convention

Capacity, speed, and interface values are displayed using **JetBrains Mono** at `text-body-sm` weight 500. They appear in spec callout cards (see component section) and on product cards as secondary detail. Never abbreviate spec values in translated copy — "256 GB" not "256ج". Use the `.ltr-nums` pattern to keep digits in Western Arabic numerals even in RTL context.

## Spacing & Layout

- 4px base unit, standard Tailwind spacing scale (no custom overrides needed beyond default).
- **Container max-widths:** `sm:640px md:768px lg:1024px xl:1280px 2xl:1440px` — capped at 1440px, centered, with `px-4 sm:px-6 lg:px-8` gutters.
- **Grid:** product grids are `grid-cols-2` (mobile) → `grid-cols-3` (tablet) → `grid-cols-4` (desktop).
- **Radius scale:** `--radius-sm: 8px` (inputs, small badges), `--radius-md: 12px` (buttons, cards), `--radius-lg: 20px` (large cards, modals), `--radius-full: 9999px` (pills, avatars).
- **Shadows:** soft, low-opacity, no hard drop shadows. `shadow-card: 0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)`. Dark mode uses a lighter border instead of a shadow (shadows read poorly on dark surfaces).

## Motion

Reuse tictoc-xpoint's `lib/animations.js` pattern (named presets, not one-off inline transitions), extended:

| Preset | Effect | Used for |
|---|---|---|
| `fadeUp` | opacity 0→1, y +16→0, 0.4s ease-out | Page sections, cards entering viewport |
| `fadeIn` | opacity 0→1, 0.3s | Modals, overlays |
| `stagger` | children delayed 0.06s each | Product grids, category lists |
| `scaleIn` | scale 0.95→1 + fade | Modals, quick-view, toasts |
| `slideInRight` / `slideInLeft` | drawer entrance, **direction flips automatically in RTL** | Cart drawer, mobile nav |
| `skeletonPulse` | opacity pulse loop | Loading skeletons |

Rules:
- Respect `prefers-reduced-motion`: all presets fall back to instant/opacity-only.
- Scroll-reveal uses `whileInView` with `viewport={{ once: true, margin: "-80px" }}` — content should not re-animate every scroll.
- No animation longer than 500ms for anything blocking interaction (page transitions, drawers). Micro-interactions (button press, toast) ≤200ms.

## Dark Mode

- Tailwind `darkMode: 'class'`.
- Source of truth: `ThemeContext` (see `09-state-management.md`) — reads `prefers-color-scheme` on first load, persists explicit user choice to `localStorage` (`bg-theme`).
- Every custom color, shadow, and border must have a dark-mode value defined in the CSS variables above — no component-level `dark:` overrides for brand colors (only for one-off layout tweaks if truly unavoidable).

## Core Components (visual spec, implementation lives in `10-coding-conventions.md`)

- **Buttons:** `primary` (filled `--bg-primary-500`, white text, radius-sm — smaller than v1, feels more precise), `secondary` (1px outline `--bg-border`, radius-sm, no fill, hover fills bg), `ghost` (no border, text-only), `danger` (filled `--bg-error`). All buttons: 44px min height, radius-sm (8px), `active:scale-[0.98]` micro-feedback, no uppercase text, no labels that feel "shouty".
- **Cards (ProductCard v2):** radius-sm (8px), no `shadow-card` by default — border-only until hover, which adds a subtle shadow + `translateY(-2px)`. Image aspect-ratio 1:1. Below the image: product name (Inter, text-body-sm, line-clamp-2), then a horizontal spec tag row showing capacity/speed/interface in mono 12px chips (if product has spec data), then price row. Quick-add cart button on the right side of the card or on hover overlay — never floating above the image like a "shopping" app.
- **Spec Chip:** a small inline chip for showing technical product attributes on cards and detail pages. Uses `.font-mono`, `text-xs`, `bg-spec-bg`, `border-spec-border`, rounded-full padding, always shows the spec value in Western Arabic numerals. Example: "128GB", "USB 3.2", "U3". Never uses color — keep it ink-on-paper feel.
- **Inputs:** radius-sm, 1px `--bg-border`, focus ring in `--bg-primary-500` at 40% opacity, error state uses `--bg-error` border + helper text below.
- **Badges:** pill radius-full, used for "New", "Featured", "Low Stock", "Out of Stock" — semantic colors from the table above. Brand-pink only for "New"/"Featured" promotion tags, never for stock status.
- **Banners:** 90vw hero, 1:3 ratio secondary. Hero banners should present the category image full-bleed with a left-aligned headline + subline on desktop (RTL re-ordered for Arabic). No "buy now" CTAs on hero — the banner is about brand credibility for a technical buyer, not aggressive conversion.
- **Skeletons:** match the exact shape/radius of the content they replace.
- **Toasts:** bottom-center on mobile, bottom-end (RTL-aware) on desktop, auto-dismiss 4s, max 3 stacked.

## Logo Usage

- Primary logo file used in navbar (both languages — the lockup already contains Arabic+English, no separate logo per language needed).
- Favicon generated from the "BG" roundel mark alone (circle + letters), not the full wordmark.
- Minimum clear space around logo: equal to the height of the "BG" circle mark.
- Never recolor the logo; always place on white or `--bg-surface` in dark mode with sufficient contrast (add a subtle white padding chip behind it in dark mode if needed).
