import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductGallery({ images = [], name }) {
  const { t, isAr } = useLocale();
  const gallery = images.length > 0 ? images.map((i) => i.imageUrl || i).filter(Boolean) : [];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomIdx, setZoomIdx] = useState(null);
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);
  const intervalRef = useRef(null);
  const activeRef = useRef(0);

  const go = useCallback((idx) => {
    if (idx === activeRef.current) return;
    activeRef.current = idx;
    setActive(idx);
  }, []);

  // New product → reset the carousel to the first slide. Without this,
  // navigating product→product keeps showing a stale slide.
  useEffect(() => {
    activeRef.current = 0;
    setActive(0);
    setDragX(0);
  }, [name]);

  const next = useCallback(() => go((activeRef.current + 1) % gallery.length), [gallery.length, go]);
  const prev = useCallback(() => go((activeRef.current - 1 + gallery.length) % gallery.length), [gallery.length, go]);

  useEffect(() => {
    if (gallery.length <= 1 || paused || !visible || document.visibilityState !== 'visible') return;
    intervalRef.current = setInterval(next, 4000);
    return () => clearInterval(intervalRef.current);
  }, [gallery.length, paused, visible, next]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.offsetWidth > 0) setContainerWidth(el.offsetWidth);
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    let pageListener;
    if (typeof document !== 'undefined') {
      pageListener = () => setVisible(document.visibilityState === 'visible');
      document.addEventListener('visibilitychange', pageListener);
    }
    let intersectionObserver;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => setVisible(Boolean(entries[0]?.isIntersecting)),
        { threshold: 0.1 },
      );
      intersectionObserver.observe(el);
    }
    return () => {
      observer.disconnect();
      if (pageListener) document.removeEventListener('visibilitychange', pageListener);
      if (intersectionObserver) intersectionObserver.disconnect();
    };
  }, []);

  const handleDragStart = useCallback((clientX) => {
    touchStartRef.current = clientX;
    setIsDragging(true);
    setPaused(true);
  }, []);

  const handleDragMove = useCallback(
    (clientX) => {
      if (!isDragging || gallery.length <= 1) return;
      setDragX(clientX - touchStartRef.current);
    },
    [isDragging, gallery.length],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging || gallery.length <= 1) return;
    const w = containerWidth || containerRef.current?.offsetWidth || 300;
    if (dragX > w * 0.25) prev();
    else if (dragX < -w * 0.25) next();
    setIsDragging(false);
    setDragX(0);
  }, [isDragging, gallery.length, containerWidth, dragX, prev, next]);

  const onTouchStart = (e) => handleDragStart(e.touches[0].clientX);
  const onTouchMove = (e) => handleDragMove(e.touches[0].clientX);
  const onDown = (e) => { if (e.button === 0) handleDragStart(e.clientX); };
  const onMove = (e) => { if (isDragging) handleDragMove(e.clientX); };

  // ── Lightbox: click the main photo → fullscreen view ──────────────────
  const openZoom = useCallback((idx) => {
    setZoomIdx(idx);
    document.body.style.overflow = 'hidden';
  }, []);
  const closeZoom = useCallback(() => {
    setZoomIdx(null);
    document.body.style.overflow = '';
  }, []);
  const zoomPrev = useCallback(
    () => setZoomIdx((z) => (z === null ? z : (z - 1 + gallery.length) % gallery.length)),
    [gallery.length],
  );
  const zoomNext = useCallback(
    () => setZoomIdx((z) => (z === null ? z : (z + 1) % gallery.length)),
    [gallery.length],
  );

  useEffect(() => {
    if (zoomIdx === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeZoom();
      // RTL-aware: ArrowRight walks forward in RTL, backward in LTR.
      else if (e.key === 'ArrowLeft') isAr ? zoomNext() : zoomPrev();
      else if (e.key === 'ArrowRight') isAr ? zoomPrev() : zoomNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIdx, closeZoom, zoomPrev, zoomNext, isAr]);

  useEffect(() => () => { document.body.style.overflow = ''; }, []);

  if (gallery.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-bg-surface-sunken flex items-center justify-center text-xs text-bg-text-secondary">
        {t('shop:noProducts')}
      </div>
    );
  }

  return (
    <div className="w-full select-none">
      <div
        className="rounded-2xl border border-bg-border bg-bg-surface-sunken mb-3 relative group overflow-hidden cursor-zoom-in h-[320px] sm:h-[440px] lg:h-[500px]"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={handleDragEnd}
        onClick={() => openZoom(activeRef.current)}
      >
        {containerWidth > 0 && (
          <div
            dir="ltr"
            className="h-full"
            style={{
              display: 'flex',
              height: '100%',
              transform: `translateX(${-active * containerWidth + dragX}px)`,
              transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          >
            {gallery.map((url, idx) => (
              <div
                key={idx}
                style={{ minWidth: containerWidth, flexShrink: 0 }}
                className="h-full flex items-center justify-center"
              >
                <img
                  src={url}
                  alt={`${name} ${idx + 1}`}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            ))}
          </div>
        )}
        {gallery.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              aria-label={t('shop:gallery.prev')}
              className="absolute start-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bg-neutral-900/70 hover:bg-bg-neutral-900 text-white backdrop-blur-sm flex items-center justify-center opacity-100 transition-colors shadow-md z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              aria-label={t('shop:gallery.next')}
              className="absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-bg-neutral-900/70 hover:bg-bg-neutral-900 text-white backdrop-blur-sm flex items-center justify-center opacity-100 transition-colors shadow-md z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
              {gallery.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all shadow-sm ${
                    active === idx ? 'bg-bg-primary-500 w-3' : 'bg-black/25 w-1.5'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
          {gallery.map((url, idx) => (
            <button
              key={url + idx}
              onClick={() => go(idx)}
              aria-label={t('shop:gallery.image', { n: idx + 1 })}
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors bg-bg-surface-sunken ${
                active === idx
                  ? 'border-bg-primary-500'
                  : 'border-bg-border hover:border-bg-text-secondary'
              }`}
            >
              <img src={url} alt={`${name} ${idx + 1}`} className="w-full h-full object-contain" />
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {zoomIdx !== null && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={name}
            className="fixed inset-0 z-[90] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={closeZoom}
            />
            <button
              onClick={closeZoom}
              aria-label={t('shop:gallery.close')}
              className="absolute top-4 end-4 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>

            {gallery.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); zoomPrev(); }}
                  aria-label={t('shop:gallery.prev')}
                  className="absolute start-3 sm:start-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); zoomNext(); }}
                  aria-label={t('shop:gallery.next')}
                  className="absolute end-3 sm:end-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-6 h-6 rtl:rotate-180" />
                </button>
              </>
            )}

            <motion.div
              key={zoomIdx}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative z-[5] max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            >
              <img
                src={gallery[zoomIdx]}
                alt={`${name} ${zoomIdx + 1}`}
                className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            </motion.div>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-white/90 text-sm font-mono bg-black/40 px-3 py-1 rounded-full">
              <span dir="ltr" className="ltr-nums">{zoomIdx + 1} / {gallery.length}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}