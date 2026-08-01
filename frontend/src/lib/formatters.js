export function formatPrice(amount, currency = 'EGP', locale) {
  const lang = locale || (typeof document !== 'undefined' ? document.documentElement.lang : 'ar');
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr, locale) {
  if (!dateStr) return '—';
  const lang = locale || (typeof document !== 'undefined' ? document.documentElement.lang : 'ar');
  try {
    return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return '—';
  }
}

export function formatPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
}