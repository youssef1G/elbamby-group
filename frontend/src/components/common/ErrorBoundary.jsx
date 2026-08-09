import { Component } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';

// Stale-chunk detection: after every deploy the old hashed JS chunks are
// purged from the CDN. A visitor holding a pre-deploy bundle hits a 404 on
// the next lazy import() — React unmounts the whole tree ("crash"). One
// refresh repoints to the new index and fixes it forever, so auto-reload
// exactly once instead of showing an error the user can only shrug at.
const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
  'ChunkLoadError',
];

function isChunkError(error) {
  const msg = String(error?.message || '');
  return CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p));
}

function BoundaryFallback() {
  const { t } = useLocale();
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-5">
      <div className="surface-card p-8 sm:p-10 text-center max-w-md w-full">
        <h1 className="font-heading text-h2 font-bold text-bg-text-primary">
          {t('errors.boundary.title')}
        </h1>
        <p className="text-body-sm text-bg-text-secondary mt-3">
          {t('errors.boundary.message')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary w-full mt-6 h-11"
        >
          {t('errors.boundary.reload')}
        </button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (!isChunkError(error)) return;
    try {
      // Guard against an infinite reload loop if the chunk genuinely
      // vanished (e.g. cache is poisoned at the CDN) — try once, then fall
      // back to the static fallback UI.
      const key = 'bg_chunk_reload_attempt';
      if (sessionStorage.getItem(key)) {
        this.setState({ error });
        return;
      }
      sessionStorage.setItem(key, '1');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) return <BoundaryFallback />;
    return this.props.children;
  }
}