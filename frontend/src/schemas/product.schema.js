import { z } from 'zod';

export const productFormSchema = z.object({
  sku: z.string().optional(),
  name_en: z.string().min(1, 'Name (English) is required'),
  name_ar: z.string().min(1, 'Name (Arabic) is required'),
  slug: z.string().min(1, 'Slug is required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  category_id: z.string().uuid('Category is required'),
  price: z.number({ invalid_type_error: 'Price is required' }).positive('Price must be positive'),
  compare_at_price: z.number().positive().optional(),
  stock_quantity: z.number().int().min(0, 'Stock cannot be negative'),
  low_stock_threshold: z.number().int().min(0).default(5),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  images: z.array(z.object({ image_url: z.string(), sort_order: z.number() })).min(1, 'At least one image is required'),
});