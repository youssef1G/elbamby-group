import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendOrderConfirmation({ email, orderNumber, customerName }) {
  if (!resend || !email) return;
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'orders@bg-store.com',
      to: email,
      subject: `Order Confirmed — ${orderNumber}`,
      html: `<p>Thank you, ${customerName}! Your order <strong>${orderNumber}</strong> has been received.</p>`,
    });
  } catch (err) {
    console.error('Failed to send confirmation email:', err.message);
  }
}
