import { z } from 'zod';
import { normalizePhone } from '@/lib/formatters.js';

const phoneRegex = /^01[0-2,5]\d{8}$/;

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(phoneRegex, 'Phone is required')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  order_id: z.string().uuid().optional().or(z.literal('')),
});
