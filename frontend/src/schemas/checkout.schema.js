import { z } from 'zod';
import { normalizePhone } from '@/lib/formatters.js';

const phoneRegex = /^01[0-2,5]\d{8}$/;

export const checkoutSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(phoneRegex, 'Invalid Egyptian phone number')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address_line: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  governorate: z.string().min(1, 'Governorate is required'),
  notes: z.string().optional(),
});
