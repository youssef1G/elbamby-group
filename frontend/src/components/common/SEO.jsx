import { useEffect } from "react";
import { useLocale } from "@/context/LocaleContext.jsx";

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Per-page SEO/meta injector. Extends the v1 head tags with Open Graph +
 * canonical support so product/static pages produce rich social previews.
 *
 * Props:
 *  - titleKey | title         localized key or raw title (appends brand name)
 *  - titleRaw                 exact title used verbatim, no brand suffix
 *  - descriptionKey | desc    localized key or raw meta description
 *  - canonical                absolute canonical URL + og:url
 *  - ogImage                  absolute URL for social preview (e.g. product image)
 *  - jsonLd                   structured data object (Organization/Product/…)
 */
export default function SEO({
  titleKey,
  title,
  titleRaw,
  descriptionKey,
  description,
  canonical,
  ogImage,
  jsonLd,
}) {
  const { t } = useLocale();

  useEffect(() => {
    const prevTitle = document.title;
    const resolvedTitle = titleRaw
      ? titleRaw
      : titleKey
        ? `${t(titleKey)} · ${t("brand.fullName")}`
        : title
          ? `${title} · ${t("brand.fullName")}`
          : t("brand.fullName");
    document.title = resolvedTitle;

    if (descriptionKey || description) {
      const descContent = descriptionKey ? t(descriptionKey) : description;
      setMeta("name", "description", descContent);
      setMeta("property", "og:description", descContent);
      setMeta("name", "twitter:description", descContent);
    }
    const resolvedCanonical =
      canonical ||
      `${window.location.origin}${window.location.pathname}${window.location.search}`;
    setLink("canonical", resolvedCanonical);
    setMeta("property", "og:url", resolvedCanonical);
    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }
    setMeta("property", "og:title", resolvedTitle);
    setMeta("name", "twitter:title", resolvedTitle);
    setMeta("property", "og:site_name", t("brand.fullName"));
    setMeta("property", "og:locale", "ar_EG");
    setMeta("property", "og:locale:alternate", "en_US");
    setMeta("name", "twitter:card", "summary");

    let jsonLdScript = null;
    if (jsonLd) {
      jsonLdScript = document.createElement("script");
      jsonLdScript.setAttribute("type", "application/ld+json");
      jsonLdScript.setAttribute("data-seo-jsonld", "true");
      jsonLdScript.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = prevTitle;
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [
    titleKey,
    title,
    descriptionKey,
    description,
    canonical,
    ogImage,
    jsonLd,
    t,
  ]);

  return null;
}
