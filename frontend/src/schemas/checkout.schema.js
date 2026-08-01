import { z } from 'zod';

const phoneRegex = /^01[0-2,5]\d{8}$/;

export const checkoutSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(phoneRegex, 'Invalid Egyptian phone number'),
  alt_phone: z.string().regex(phoneRegex, 'Invalid Egyptian phone number').optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address_line: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  governorate: z.string().min(1, 'Governorate is required'),
  notes: z.string().optional(),
});