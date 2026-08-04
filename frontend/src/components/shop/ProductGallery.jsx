import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductGallery({ images = [], name }) {
  const { t } = useLocale();
  const gallery = images.length > 0 ? images.map((i) => i.imageUrl || i).filter(Boolean) : [];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visible, setVisible] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const touchStartRef = useRef(null);
  const intervalRef = useRef(null);
  const activeRef = useRef(0);

  const go = useCallback((idx) => {
    if (idx === activeRef.current) return;
    activeRef.current = idx;
    setActive(idx);
  }, []);

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

  if (gallery.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-bg-surface-sunken flex items-center justify-center text-xs text-bg-text-secondary">
        {t('shop:noProducts')}
      </div>
    );
  }

  return (
    <div
      className="w-full select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false);
        if (isDragging) handleDragEnd();
      }}
    >
      <div
        className="aspect-square rounded-2xl border border-bg-border bg-bg-surface-sunken mb-3 relative group overflow-hidden"
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={handleDragEnd}
      >
        {containerWidth > 0 && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div
              dir="ltr"
              style={{
                display: 'flex',
                height: '100%',
                transform: `translateX(${-active * containerWidth + dragX}px)`,
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}
            >
              {gallery.map((url, idx) => (
                <div key={idx} style={{ minWidth: containerWidth, flexShrink: 0 }} className="h-full">
                  <img
                    src={url}
                    alt={`${name} ${idx + 1}`}
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {gallery.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label={t('shop:gallery.prev')}
              className="absolute start-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center text-bg-text-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              aria-label={t('shop:gallery.next')}
              className="absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center text-bg-text-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {gallery.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => go(idx)}
                  aria-label={t('shop:gallery.image', { n: idx + 1 })}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${active === idx ? 'bg-white w-3' : 'bg-white/50 hover:bg-white/70'}`}
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
              className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                active === idx
                  ? 'border-bg-primary-500'
                  : 'border-bg-border hover:border-bg-text-secondary'
              }`}
            >
              <img src={url} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
