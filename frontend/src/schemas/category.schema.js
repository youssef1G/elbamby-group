import { z } from 'zod';

export const categoryFormSchema = z.object({
  name_en: z.string().min(1, 'Name (English) is required'),
  name_ar: z.string().min(1, 'Name (Arabic) is required'),
  slug: z.string().min(1, 'Slug is required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});