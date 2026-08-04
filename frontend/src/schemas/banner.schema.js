import { z } from 'zod';

export const bannerFormSchema = z.object({
  image_url: z.string().url('Image URL is required'),
  title_en: z.string().optional().or(z.literal('')),
  title_ar: z.string().optional().or(z.literal('')),
  subtitle_en: z.string().optional().or(z.literal('')),
  subtitle_ar: z.string().optional().or(z.literal('')),
  link_url: z.string().optional().or(z.literal('')),
  position: z.enum(['home_hero', 'home_secondary', 'shop_top']).default('home_hero'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});