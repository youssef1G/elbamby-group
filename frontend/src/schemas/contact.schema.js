import { z } from 'zod';

const phoneRegex = /^[0-9]{11}$/;

export const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  order_id: z.string().uuid().optional().or(z.literal('')),
});