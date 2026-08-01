# 09 — State Management Rules

Three places state can live. Picking the right one is not a style preference — it's determined by these rules.

## 1. React Context (global UI + client state)

Replaces the Zustand stores from the original design. Four contexts wrap the app tree in `main.jsx`:

| Context | Provides | Persisted? | localStorage key |
|---|---|---|---|
| `LocaleContext` | `{ t, lang, setLang, isAr, isEn }` | Yes | `bg-lang` |
| `ThemeContext` | `{ mode, toggle, isDark }` | Yes | `bg-theme` |
| `AuthContext` | `{ admin, isLoading, isAuthenticated, login, logout }` | No (httpOnly cookie) | — |
| `CartContext` | `{ items, isCartOpen, setIsCartOpen, isMobileNavOpen, setIsMobileNavOpen, quickViewProductId, setQuickViewProductId, addItem, removeItem, updateQuantity, clearCart }` | Yes | `bg-cart` |

Provider order (in `main.jsx`): `BrowserRouter > LocaleProvider > ThemeProvider > AuthProvider > CartProvider`.

- `CartContext` is a single context holding both cart items AND UI flags (drawer/mobile-nav/quick-view toggle). This keeps all cart-related state together instead of splitting it into a separate `uiStore`.
- `LocaleContext` owns the `t()` function, language state, and `dir`/`lang` sync. It's a plain-JS implementation — no i18next.
- `ThemeContext` handles dark/light + `matchMedia` listener for system preference.
- `AuthContext` is a thin provider wrapping raw fetch calls to `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`. It holds admin session state for `AdminRoute.jsx`'s protected-route redirect logic.

**Rule:** Any state that must be shared across pages or survive navigation goes into the appropriate Context — never duplicated into a second source of truth.

## 2. Local component state (`useState`) and `useEffect` for data fetching

TanStack Query was removed from the stack. All server data is fetched in `useEffect` with a `cancelled` flag — the tictoc-xpoint pattern:

```js
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  let cancelled = false;
  fetchProducts({ ... }).then((res) => {
    if (!cancelled) { setData(res); setLoading(false); }
  }).catch((err) => {
    if (!cancelled) { setError(err); setLoading(false); }
  });
  return () => { cancelled = true; };
}, [/* deps */]);
```

- Admin lists that need refetch after a mutation bump a `reload` counter in the effect deps.
- Toggle/status updates (admin) are optimistic: update local state immediately, call the API, rollback on error.
- Every page handles `loading`, `error`, and `empty` states explicitly — never silently rendering nothing.

## 3. URL state (React Router search params)

For anything that should be shareable, bookmarkable, and survive a refresh: Shop page filters (`category`, `search`, `sort`, `page`), admin table filters (`status`, `date_from`, `date_to`, `page`). Implemented via `useSearchParams`, read as deps in the `useEffect` that fetches that page cars — the URL is the source of truth.

## Forms — always React Hook Form + Zod

Every form in the app (checkout, contact, all admin CRUD forms, login) uses `useForm` + `zodResolver(schema)` from the matching file in `schemas/`. No component handers, its own `useState` per field plus manual validation. Admin Product Form, Admin Category Form, Admin Banner Form all use `react-hook-form` with Zod schemas (frontend `schemas/` folder). hen parsing fails, Zod returns a rich `VALIDATION_ERROR` format.

## What was removed (from the original layered design)

| Removed | Replaced by |
|---|---|
| TanStack Query (`@tanstack/react-query`, `hooks/queries/`, `hooks/mutations/`) | `useState` + `useEffect` with `cancelled` flags infer in every page component |
| Zustand (`cartStore`, `uiStore`, `themeStore`, `store/`) | React Context: `CartContext` (cart + UI flags in one), `ThemeContext`, `LocaleContext` |
| i18next (`i18next`, `react-i18next`, `i18next-browser-languagedetector`) | `LocaleContext` with plain JS `i18n/en.js` and `i18n/ar.js` flat dicts |
| `api/*.api.js` (8 files) | single `src/api.js` (155 lines — one file, all fetch functions grouped by resource) |
| Zustand `persist` middleware for `bg-cart` | `CartContext`'s own `localStorage` read/write (bare array format) |