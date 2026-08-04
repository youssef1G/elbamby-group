import { useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';

export default function SEO({ titleKey, title, descriptionKey, description, jsonLd }) {
  const { t } = useLocale();

  useEffect(() => {
    const prevTitle = document.title;
    const resolvedTitle = titleKey
      ? `${t(titleKey)} — ${t('brand.fullName')}`
      : title
        ? `${title} — ${t('brand.fullName')}`
        : t('brand.fullName');
    document.title = resolvedTitle;

    let metaDescEl = null;
    let prevDescContent = null;
    if (descriptionKey || description) {
      const descContent = descriptionKey ? t(descriptionKey) : description;
      prevDescContent = document.querySelector('meta[name="description"]')?.getAttribute('content') || null;
      metaDescEl = document.querySelector('meta[name="description"]');
      if (!metaDescEl) {
        metaDescEl = document.createElement('meta');
        metaDescEl.setAttribute('name', 'description');
        document.head.appendChild(metaDescEl);
      }
      metaDescEl.setAttribute('content', descContent);
    }

    let jsonLdScript = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.setAttribute('type', 'application/ld+json');
      jsonLdScript.setAttribute('data-seo-jsonld', 'true');
      jsonLdScript.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = prevTitle;
      if (metaDescEl && prevDescContent !== null) {
        metaDescEl.setAttribute('content', prevDescContent);
      } else if (metaDescEl) {
        metaDescEl.remove();
      }
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [titleKey, title, descriptionKey, description, jsonLd, t]);

  return null;
}