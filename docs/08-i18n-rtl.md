# 08 — i18n & RTL

## Setup

- Plain-JS dictionary files (`i18n/ar.js`, `i18n/en.js`), consumed by `LocaleContext` — no i18next, no i18n library.
- Default language: **Arabic** (`ar`) — this is the client's primary market. English (`en`) is secondary.
- Language selection: `LocaleContext` reads `bg-lang` from localStorage on init; `setLang(l)` writes back and syncs `document.documentElement.lang` / `document.documentElement.dir`.
- No URL-based language routing (e.g. no `/en/shop`) — language is a global UI state, not a route concern.

## File Structure

Flat dictionaries — one file per language, no namespacing:

```
i18n/en.js    # all keys, flat object: { 'nav.home', 'nav.shop', 'home.heroEyebrow', 'checkout.form.phoneLabel', … }
i18n/ar.js    # same keys, Arabic values
```

Mirrored 1:1. Every key that exists in `en.js` must exist in `ar.js` — no silent fallback-to-English for missing Arabic strings (Arabic is the default language). Treat missing keys as bugs.

## t() Resolution (in Local Context)

The `t(key, params)` function in `LocaleContext` resolves keys in this order:

1. Raw key in the current lang diet — `dict['home.heroEyebrow']`
2. Failover to `common.<key>` — `dict['common.home.heroEyebrow']` (for legacy unspaced keys)
3. English dict fallback — `translations['en'][key]`
4. Last key segment as a fallback display value

Supports `{{variable}}` interpolation (`{variable}` format `i` auto-converted):

```js
t('shop.stock', { count: 3 }) // "Only 3 left" / "متبقي 3 فقط"
```

Also supports colon-separatedartison: `t('shop:featured')` → looks up `'shop.featured'` (for components that still use i18next-style namespace keys — converted internally).

## RTL Implementation

- `<html dir="rtl" lang="ar">` or `dir="ltr" lang="en">` set on language change by `LocaleContext.setLang()`.
- **Tailwind:** use logical properties everywhere instead of directional ones — `ms-4`/`me-4` (margin-inline-start/end) instead of `ml-4`/`mr-4`, `ps-*`/`pe-*` instead of `pl-*`/`pr-*`, `text-start`/`text-end` instead of `text-left`/`text-right`. This is a hard rule.
- **Icons that imply direction** (back arrow, chevrons in carousels/breadcrumbs) must flip via a `rtl:rotate-180` utility or a direction-aware icon choice — never hardcoded to point one way.
- **Framer Motion slide directions** (`slideInRight`/`slideInLeft` from `01-brand-design-system.md`) must read current direction from the locale context and flip the x-offset sign accordingly — implemented once in `lib/animations.js`, not re-solved per component.
- **Numbers:** always rendered in Western Arabic numerals (0-9) even in Arabic UI, per common Egyptian-commerce convention — do not let the browser/font_auto-convert to Eastern Arabic numerals. Prices/phone numbers must stay LTR-embedded within RTL text (use `dir="ltr"` inline span or `unicode-bidi: isolate` for price/phone display).
- **Forms:** input `(ltr` follows content type — free text fields follow document direction, but phone number and email inputs are forced `dir="ltr"` regardless of active language.

## Fonts

- `<html lang="ar">` → Cairo applied globally via CSS (`:lang(ar) { font-family: 'Cairo', ... }`).
- `<html lang="en">` → Space Grotesk (headings) / Inter (body) as defined in `01-brand-design-system.md`.
- Font-loading: `font-display: swap`, subset to Latin+Arabic ranges.

## Content Rules

- All customer-facing copy must be reviewed/provided in both languages before a page is considered done — no shipping an English-only string inside an Arabic-default UI.
- Admin panel: also fully bilingual (the client may prefer Arabic for daily use).
- Dates: localized via `Intl.DateTimeFormat` per active locale, Gregorian-calendar in both languages.
- Currency: always displayed as `EGP` with the number formatted via `Intl.NumberFormat`, using the `currency_code` from settings rather than hardcoding "EGP" in components.