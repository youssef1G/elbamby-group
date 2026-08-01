import { z } from 'zod';

export const settingsFormSchema = z.object({
  store_name_en: z.string().optional(),
  store_name_ar: z.string().optional(),
  logo_url: z.string().optional(),
  contact_phone: z.string().optional(),
  whatsapp_number: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  address_en: z.string().optional(),
  address_ar: z.string().optional(),
  facebook_url: z.string().url().optional().or(z.literal('')),
  instagram_url: z.string().url().optional().or(z.literal('')),
  tiktok_url: z.string().url().optional().or(z.literal('')),
  default_shipping_fee: z.number().min(0).optional(),
  free_shipping_threshold: z.number().min(0).optional(),
  low_stock_threshold_default: z.number().int().min(0).optional(),
  currency_code: z.string().optional(),
});