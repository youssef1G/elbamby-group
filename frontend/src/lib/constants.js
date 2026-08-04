export const ORDER_STATUSES = {
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  confirmed: { en: 'Confirmed', ar: 'تم التأكيد' },
  processing: { en: 'Processing', ar: 'قيد التجهيز' },
  shipped: { en: 'Shipped', ar: 'تم الشحن' },
  delivered: { en: 'Delivered', ar: 'تم التوصيل' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  returned: { en: 'Returned', ar: 'مرتجع' },
};

export const COMPLAINT_STATUSES = {
  open: { en: 'Open', ar: 'مفتوح' },
  in_progress: { en: 'In Progress', ar: 'قيد المعالجة' },
  resolved: { en: 'Resolved', ar: 'تم الحل' },
  closed: { en: 'Closed', ar: 'مغلق' },
};

export const RETURN_STATUSES = {
  pending: { en: 'Pending', ar: 'قيد الانتظار' },
  approved: { en: 'Approved', ar: 'موافق عليه' },
  rejected: { en: 'Rejected', ar: 'مرفوض' },
  completed: { en: 'Completed', ar: 'مكتمل' },
};

export const DEFAULT_SHIPPING_FEE = 50;
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

// How often customer-facing data (points balance, order status) is silently
// re-fetched while the page is open — no reload needed. Pauses when the tab
// is hidden.
export const AUTO_REFRESH_MS = 30000;

export const EGYPT_GOVERNORATES = [
  'Cairo',
  'Alexandria',
  'Giza',
  'Qalyubia',
  'Port Said',
  'Suez',
  'Luxor',
  'Aswan',
  'Asyut',
  'Beheira',
  'Beni Suef',
  'Dakahlia',
  'Damietta',
  'Fayoum',
  'Gharbia',
  'Ismailia',
  'Kafr El Sheikh',
  'Matruh',
  'Minya',
  'Monufia',
  'New Valley',
  'North Sinai',
  'Qena',
  'Red Sea',
  'Sharqia',
  'Sohag',
  'South Sinai',
  '6 October',
  'Helwan',
];